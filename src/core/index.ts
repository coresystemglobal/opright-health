import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import sequelize from './database';
import router from '../router';
import { specs, swaggerUi, swaggerUiOptions } from '../config/swagger.config';
import { 
  generalRateLimit, 
  authRateLimit, 
  paymentRateLimit,
  apiRateLimit
} from '../middleware/rate-limiter.middleware';
const server = express();

const port = process.env.LOCAL_PORT || 3000;

// Capture the raw request body for webhook signature verification
// (Paystack/Stripe/Flutterwave sign the exact bytes they send)
server.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
server.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply security middleware
// server.use(applySecurity);

// CORS configuration
server.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-frontend-domain.com'
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  server.use(morgan('combined'));
}

// Setup Swagger documentation
server.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

// Apply rate limiting - specific routes first
server.use('/api/v1/auth', authRateLimit);
server.use('/api/v1/payments', paymentRateLimit);
server.use('/api/v1', apiRateLimit);
server.use(generalRateLimit);

server.get("/", (req, res) => {
  res.json({ 
    message: "Hospital Management System API",
    version: "1.0.0",
    documentation: "/api-docs",
    endpoints: {
      health: "/health",
      api: "/api/v1"
    }
  });
});

server.get("/health", (req, res) => {
  res.json({ 
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

server.use('/api/v1', router);

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
    const { markOverdueInvoices, runDunningCycle } = await import('../services/dunning.service');
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

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    scheduleDunning();

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

export default startServer;
