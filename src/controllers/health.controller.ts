import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  static async healthCheck(req: Request, res: Response) {
    try {
      const health = await HealthService.checkHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      return res.status(statusCode).json(health);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  }

  static async readiness(req: Request, res: Response) {
    return res.status(200).json({ status: 'ready' });
  }

  static async liveness(req: Request, res: Response) {
    return res.status(200).json({ status: 'alive' });
  }
}