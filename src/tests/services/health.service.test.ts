import { HealthService } from '../../services/health.service';

describe('HealthService', () => {
  describe('checkHealth', () => {
    it('should return health status', async () => {
      const health = await HealthService.checkHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
      expect(health.services).toHaveProperty('database');
      expect(health.services).toHaveProperty('redis');
      expect(health.services).toHaveProperty('memory');
      expect(health.services).toHaveProperty('uptime');
    });

    it('should have valid status values', async () => {
      const health = await HealthService.checkHealth();
      
      expect(['healthy', 'unhealthy']).toContain(health.status);
      expect(health.services.database.status).toMatch(/healthy|unhealthy/);
      expect(health.services.redis.status).toMatch(/healthy|unhealthy/);
    });
  });
});