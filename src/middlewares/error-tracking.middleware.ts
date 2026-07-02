import { Request, Response, NextFunction } from 'express';
import { ErrorTrackingService } from '@shared/error-tracking/error-tracking.service';

export const errorTrackingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  let severity: 'low' | 'medium' | 'high' | 'critical';

  if (statusCode >= 500) severity = 'critical';          // server errors → Slack
  else if (statusCode === 400 || statusCode === 404) severity = 'medium'; // bad input / not found → no Slack
  else if (statusCode >= 400) severity = 'high';         // 401, 403, 429, etc. → Slack
  else severity = 'low';

  // Log the error
  ErrorTrackingService.logError(err, req, severity);

  // Continue with normal error handling
  next(err);
};