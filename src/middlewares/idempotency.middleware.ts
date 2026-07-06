import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../core/database';

const SYNC_ID_RE = /^[\w-]{1,128}$/;

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const syncId = req.headers['x-client-sync-id'] as string | undefined;

  if (!syncId || !SYNC_ID_RE.test(syncId) || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  try {
    const rows = await sequelize.query<{
      response_status: number;
      response_body: any;
    }>(
      'SELECT response_status, response_body FROM sync_logs WHERE client_sync_id = $1',
      { bind: [syncId], type: QueryTypes.SELECT }
    );

    if (rows.length > 0) {
      const cached = rows[0];
      return res
        .status(cached.response_status ?? 200)
        .json(cached.response_body ?? { success: true, message: 'Already processed' });
    }

    // Intercept the response to record it
    const originalJson = res.json.bind(res) as typeof res.json;
    res.json = (body: any) => {
      sequelize
        .query(
          `INSERT INTO sync_logs (client_sync_id, method, url, response_status, response_body, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (client_sync_id) DO NOTHING`,
          {
            bind: [syncId, req.method, req.path, res.statusCode, body],
            type: QueryTypes.INSERT,
          }
        )
        .catch(() => {});
      return originalJson(body);
    };

    return next();
  } catch {
    return next();
  }
}

export async function cleanupOldSyncLogs(): Promise<void> {
  try {
    await sequelize.query(
      `DELETE FROM sync_logs WHERE created_at < NOW() - INTERVAL '7 days'`,
      { type: QueryTypes.DELETE }
    );
  } catch {}
}
