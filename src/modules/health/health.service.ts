import sequelize from "@core/database";
import Redis from "ioredis";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: { status: string; responseTime?: number };
    redis: { status: string; responseTime?: number };
    memory: { usage: number; limit: number };
    uptime: number;
  };
}

export class HealthService {
  private static redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 })
    : new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
      });

  static async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const services = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.checkMemory(),
      uptime: process.uptime(),
    };

    const isHealthy =
      services.database.status === "healthy" &&
      services.redis.status === "healthy" &&
      services.memory.usage < 0.9;

    return {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services,
    };
  }

  private static async checkDatabase() {
    try {
      const start = Date.now();
      await sequelize.authenticate();
      return { status: "healthy", responseTime: Date.now() - start };
    } catch (error) {
      return { status: "unhealthy", responseTime: 0 };
    }
  }

  private static async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      return { status: "healthy", responseTime: Date.now() - start };
    } catch (error) {
      return { status: "unhealthy", responseTime: 0 };
    }
  }

  private static checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal + usage.external;
    const limit = 512 * 1024 * 1024; // 512MB limit
    return { usage: totalMemory / limit, limit };
  }
}
