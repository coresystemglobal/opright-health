import { Request, Response, NextFunction } from 'express';
import { ErrorTrackingService } from '../services/error-tracking.service';

export const errorTrackingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Determine severity based on status code
  const statusCode = (err as any).statusCode || 500;
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  if (statusCode >= 500) severity = 'critical';
  else if (statusCode >= 400) severity = 'high';
  else if (statusCode >= 300) severity = 'medium';
  else severity = 'low';

  // Log the error
  ErrorTrackingService.logError(err, req, severity);

  // Continue with normal error handling
  next(err);
};