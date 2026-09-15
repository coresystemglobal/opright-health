import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import sequelize from './database';
import router from '../router';
import { specs, swaggerUi, swaggerUiOptions } from '../config/swagger.config';
import {
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  apiRateLimit
} from '../middlewares/rate-limiter.middleware';
import { idempotencyMiddleware, cleanupOldSyncLogs } from '../middlewares/idempotency.middleware';
import { errorTrackingMiddleware } from '../middlewares/error-tracking.middleware';
import { NotificationService } from '../modules/notifications/notification.service';
import { accessControl } from '../security/gate';
import { assertPolicyComplete } from '../security/reconcile';

/**
 * Validate that all critical environment variables are present at startup.
 * Prevents the server from running with insecure default secrets.
 */
function validateRequiredEnvVars(): void {
  const required: Record<string, { minLen?: number; hint: string }> = {
    JWT_SECRET: { minLen: 16, hint: 'Set a strong random string (min 16 chars)' },
    JWT_REFRESH_SECRET: { minLen: 16, hint: 'Set a strong random string different from JWT_SECRET' },
    ENCRYPTION_KEY: { minLen: 32, hint: 'Set a random string of at least 32 characters' },
  };

  const missing: string[] = [];
  for (const [key, opts] of Object.entries(required)) {
    const value = process.env[key];
    if (!value) {
      missing.push(`  ${key} — ${opts.hint}`);
    } else if (opts.minLen && value.length < opts.minLen) {
      missing.push(`  ${key} — must be at least ${opts.minLen} characters (currently ${value.length})`);
    }
  }

  if (missing.length > 0) {
    console.error(
      'FATAL: Missing or invalid required environment variables:\n' +
      missing.join('\n') +
      '\n\nServer will not start without these. See .env.example for reference.'
    );
    process.exit(1);
  }
}

const server = express();

const port = parseInt(process.env.PORT || process.env.LOCAL_PORT || '3000', 10);

// Capture the raw request body for webhook signature verification
// (Paystack/Stripe/Flutterwave sign the exact bytes they send)
server.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
server.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP security headers (helmet)
server.use(helmet());

// CORS configuration
server.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      ...(process.env.NODE_ENV !== 'production'
        ? ['http://localhost:3000', 'http://localhost:3001','https://hms-api.fly.dev']
        : []),
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-ID', 'X-Client-Sync-Id'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  server.use(morgan('combined'));
}

// Setup Swagger documentation
server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Apply rate limiting - most specific first, general only on non-API paths
server.use('/api/v1/auth', authRateLimit);
server.use('/api/v1/payments', paymentRateLimit);
server.use('/api/v1', apiRateLimit);
server.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  // Status pings must never be throttled - behind a proxy without trust proxy
  // every caller shares one bucket, so a monitor would 429 within minutes.
  if (req.path === '/' || req.path === '/health') return next();
  return generalRateLimit(req, res, next);
});

// Idempotency for offline-sync replay (skip auth routes)
server.use('/api/v1', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return idempotencyMiddleware(req, res, next);
});

// Uptime / status pings. Kept minimal and exempt from rate limiting (see above).
server.get('/', (req, res) => res.status(200).send('OK'));

server.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ── Access control ─────────────────────────────────────────────────────────
// Deny-by-default. Every route under /api/v1 must have an entry in
// src/security/policy.ts; anything else is refused (403 NO_POLICY). This
// replaces per-route authentication/checkPermission as the authority — those
// can stay in place harmlessly during migration and be removed afterwards.
//
// Set POLICY_MODE=report to log would-be denials without enforcing, which is
// how to roll this out safely. Default is enforce.
server.use('/api/v1', accessControl, router);

// ── 404 catch-all ──────────────────────────────────────────────────────────
// Any request that matched no route above lands here. Online scanners probe
// random paths (/wp-login.php, /.env, /admin, …); answer them with a small
// JSON 404 instead of Express's default HTML error page. Kept quiet on purpose
// — this is expected background noise, not an application error worth logging.
server.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    error: 'NOT_FOUND',
  });
});

// Log errors and fire Slack alerts for high/critical severity
server.use(errorTrackingMiddleware);

// Error handling for security violations
server.use((err: any, req: any, res: any, next: any) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'CORS_ERROR'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      error: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  console.error('[SECURITY_ERROR]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR'
  });
});

function scheduleDunning() {
  const runCycle = async () => {
    const { markOverdueInvoices, runDunningCycle } = await import('../modules/billing/dunning.service');
    const marked = await markOverdueInvoices();
    if (marked > 0) console.log(`Dunning: marked ${marked} invoice(s) overdue.`);
    const results = await runDunningCycle();
    const sent = results.filter(r => r.sent).length;
    if (sent > 0) console.log(`Dunning: sent ${sent} email(s).`);
  };

  // Run once 5 minutes after startup (give DB time to settle), then daily at 08:00
  setTimeout(() => {
    runCycle().catch(e => console.error('Dunning cycle error:', e));

    const now = new Date();
    const next8am = new Date(now);
    next8am.setHours(8, 0, 0, 0);
    if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
    const msUntil8am = next8am.getTime() - now.getTime();

    setTimeout(() => {
      runCycle().catch(e => console.error('Dunning cycle error:', e));
      setInterval(() => runCycle().catch(e => console.error('Dunning cycle error:', e)), 24 * 60 * 60 * 1000);
    }, msUntil8am);
  }, 5 * 60 * 1000);
}

function scheduleSubscriptionLifecycle() {
  const runCycle = async () => {
    const { runSubscriptionLifecycleCycle } = await import('../modules/billing/subscription-lifecycle.service');
    const { trialsExpired, graceCancelled, periodEndCancelled } = await runSubscriptionLifecycleCycle();
    if (trialsExpired || graceCancelled || periodEndCancelled) {
      console.log(`Subscription lifecycle: ${trialsExpired} trial(s) expired, ${graceCancelled} suspended (grace lapsed), ${periodEndCancelled} cancelled at period end.`);
    }
  };

  // Run 6 minutes after startup, then daily at 08:05.
  setTimeout(() => {
    runCycle().catch(e => console.error('Subscription lifecycle error:', e));

    const now = new Date();
    const next = new Date(now);
    next.setHours(8, 5, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    setTimeout(() => {
      runCycle().catch(e => console.error('Subscription lifecycle error:', e));
      setInterval(() => runCycle().catch(e => console.error('Subscription lifecycle error:', e)), 24 * 60 * 60 * 1000);
    }, next.getTime() - now.getTime());
  }, 6 * 60 * 1000);
}

function schedulePaymentReconciliation() {
  const runCycle = async () => {
    const { runPaymentReconciliation } = await import('../modules/billing/payment-reconciliation.service');
    const { checked, resolved } = await runPaymentReconciliation();
    if (resolved > 0) console.log(`Payment reconciliation: resolved ${resolved}/${checked} pending payment(s).`);
  };

  // Run 7 minutes after startup, then hourly.
  setTimeout(() => {
    runCycle().catch(e => console.error('Payment reconciliation error:', e));
    setInterval(() => runCycle().catch(e => console.error('Payment reconciliation error:', e)), 60 * 60 * 1000);
  }, 7 * 60 * 1000);
}

function scheduleAppointmentReminders() {
  const runCycle = async () => {
    const { runReminderCycle } = await import('../modules/appointments/appointment-reminder.service');
    const results = await runReminderCycle();
    const sent = results.filter(r => r.sent).length;
    if (sent > 0) console.log(`Appointment reminders: sent ${sent} SMS.`);
  };

  // First run 2 minutes after startup, then every 30 minutes.
  // The 24h/2h sentinel columns keep each reminder single-fire regardless
  // of cadence, so a 30-minute tick is safe and responsive.
  setTimeout(() => {
    runCycle().catch(e => console.error('Appointment reminder cycle error:', e));
    setInterval(() => runCycle().catch(e => console.error('Appointment reminder cycle error:', e)), 30 * 60 * 1000);
  }, 2 * 60 * 1000);
}

function scheduleReportRunner() {
  const runCycle = async () => {
    const { reportScheduleService } = await import('../modules/reports/report-schedule.service');
    const sent = await reportScheduleService.runDueSchedules();
    if (sent > 0) console.log(`Report schedules: emailed ${sent} report(s).`);
  };

  // First run 10 minutes after startup, then hourly. Each configurable
  // schedule carries its own next_run_at, so an hourly tick delivers daily/
  // weekly/monthly schedules when they come due (opt-in per tenant).
  setTimeout(() => {
    runCycle().catch(e => console.error('Report schedule runner error:', e));
    setInterval(() => runCycle().catch(e => console.error('Report schedule runner error:', e)), 60 * 60 * 1000);
  }, 10 * 60 * 1000);
}

const startServer = async () => {
  // Fail fast if required secrets are missing
  validateRequiredEnvVars();

  // Fail fast if any route is reachable without a declared access policy.
  // This is the guarantee that a new route cannot be added without an
  // authorisation decision being made for it.
  assertPolicyComplete(router, {
    strict: process.env.POLICY_STRICT === 'true',
  });

  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Wrap Express with HTTP server so Socket.IO can share the port
    const httpServer = http.createServer(server);
    NotificationService.initialize(httpServer);

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });

    // Purge stale idempotency records on startup
    cleanupOldSyncLogs().catch(() => {});

    // Load subscription plans (pricing/limits/features) from the DB into cache
    import('../modules/billing/billing.service')
      .then(({ BillingService }) => BillingService.refreshPlansCache())
      .catch(() => {});

    // Overdue-invoice dunning emails (daily cycle)
    scheduleDunning();

    // Subscription lifecycle sweeper — trial expiry, grace enforcement, cancels
    scheduleSubscriptionLifecycle();

    // Reconcile PENDING payments against the gateway (missed webhooks)
    schedulePaymentReconciliation();

    // Appointment SMS reminders (24h / 2h before, every 30 min)
    scheduleAppointmentReminders();

    // Configurable emailed report schedules (per-tenant, checked hourly)
    scheduleReportRunner();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

export default startServer;
