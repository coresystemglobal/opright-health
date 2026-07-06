import { Request, Response, NextFunction } from 'express';
import { CacheService } from '@shared/cache/cache.service';
import { TenantRequest } from './tenant.middleware';

export const cacheMiddleware = (resource: string, ttl: number = 300) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = CacheService.generateKey(
      req.tenant?.id || 'global',
      resource,
      req.params.id || JSON.stringify(req.query)
    );

    try {
      const cachedData = await CacheService.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Store original send function
      const originalSend = res.send;
      res.send = function(data) {
        // Cache successful responses
        if (res.statusCode === 200) {
          CacheService.set(cacheKey, JSON.parse(data), ttl);
        }
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};