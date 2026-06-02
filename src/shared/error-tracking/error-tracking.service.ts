import { Request } from 'express';

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  userId?: string;
  tenantId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorTrackingService {
  private static errors: ErrorLog[] = [];

  static logError(error: Error, req?: Request, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userId: (req as any)?.user?.userId,
      tenantId: (req as any)?.tenant?.id,
      url: req?.url,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      severity
    };

    this.errors.push(errorLog);
    
    // Keep only last 1000 errors in memory
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }

    // Log to console for development
    console.error(`[${severity.toUpperCase()}] ${error.message}`, {
      userId: errorLog.userId,
      tenantId: errorLog.tenantId,
      url: errorLog.url
    });

    // In production, send to external service like Sentry
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorLog);
    }
  }

  static getErrors(filters?: { severity?: string; tenantId?: string; limit?: number }) {
    let filteredErrors = this.errors;

    if (filters?.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters?.tenantId) {
      filteredErrors = filteredErrors.filter(e => e.tenantId === filters.tenantId);
    }

    const limit = filters?.limit || 100;
    return filteredErrors.slice(-limit).reverse();
  }

  private static sendToExternalService(errorLog: ErrorLog) {
    // Implement external error tracking service integration
    // e.g., Sentry, Rollbar, Bugsnag
  }
}