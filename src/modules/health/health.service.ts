import os from "os";
import sequelize from "@core/database";
import Redis from "ioredis";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    database: { status: string; responseTime?: number };
    redis: { status: string; responseTime?: number };
    memory: { usage: number; limit: number; healthy: boolean };
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

    // The API can serve traffic as long as its datastores are reachable.
    // Memory pressure is reported for observability but must NOT flip the
    // service to "unhealthy": a large heap (e.g. under ts-node in dev) would
    // otherwise make every client's /health probe fail and treat the whole
    // API as offline.
    const isHealthy =
      services.database.status === "healthy" &&
      services.redis.status === "healthy";

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
    // Resident set size against the container/host memory limit. The limit is
    // configurable (HEALTH_MEMORY_LIMIT_MB) and defaults to total system
    // memory, so `usage` is a meaningful 0..1 ratio rather than heap-vs-512MB
    // which routinely exceeds 1 in development.
    const { rss } = process.memoryUsage();
    const limitMb =
      Number(process.env.HEALTH_MEMORY_LIMIT_MB) ||
      Math.round(os.totalmem() / (1024 * 1024));
    const limit = limitMb * 1024 * 1024;
    const usage = rss / limit;
    return { usage, limit, healthy: usage < 0.9 };
  }
}
