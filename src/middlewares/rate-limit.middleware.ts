import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache.service';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const rateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;

      const currentCount = await CacheService.get<number>(windowKey) || 0;

      if (currentCount >= maxRequests) {
        return res.status(429).json({
          status: 'fail',
          statusCode: 429,
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      await CacheService.set(windowKey, currentCount + 1, Math.ceil(windowMs / 1000));

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': (maxRequests - currentCount - 1).toString(),
        'X-RateLimit-Reset': new Date(windowStart + windowMs).toISOString()
      });

      return next();
    } catch (error) {
      // If rate limiting fails, allow request to proceed
      return next();
    }
  };
};

// Predefined rate limiters
export const authRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later'
});

export const apiRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => (req as any).user?.userId || req.ip
});