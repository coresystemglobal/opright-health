import { exec } from 'child_process';
import { promisify } from 'util';
import { fileUploadService } from './file-upload.service';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

export class BackupService {
  static async createDatabaseBackup(tenantId?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${tenantId || 'all'}-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'hospital_management',
      username: process.env.DB_USER || 'postgres'
    };

    let command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database}`;
    
    if (tenantId) {
      command += ` --where="tenant_id='${tenantId}'" -f ${filepath}`;
    } else {
      command += ` -f ${filepath}`;
    }

    try {
      await execAsync(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } });
      
      // Upload to cloud storage
      const fileBuffer = fs.readFileSync(filepath);
      const uploadResult = await fileUploadService.uploadFile(
        { buffer: fileBuffer, originalname: filename, mimetype: 'application/sql', size: fileBuffer.length } as any,
        { tenantId: tenantId || 'system', folder: 'backups' }
      );

      // Clean up local file
      fs.unlinkSync(filepath);

      return uploadResult.url;
    } catch (error) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  static async scheduleBackups() {
    // Run daily backups at 2 AM
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(2, 0, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilBackup = scheduledTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        await this.createDatabaseBackup();
        console.log('Scheduled backup completed');
        
        // Schedule next backup
        this.scheduleBackups();
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    }, timeUntilBackup);
  }

  static async restoreBackup(backupUrl: string, tenantId?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `restore-${tenantId || 'all'}-${timestamp}.sql`;
    const filepath = path.join('/tmp', filename);

    try {
      await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        const transport = backupUrl.startsWith('https') ? https : http;

        transport.get(backupUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download backup: HTTP ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', reject);
        }).on('error', reject);
      });

      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'hospital_management',
        username: process.env.DB_USER || 'postgres'
      };

      const command = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${filepath}`;
      await execAsync(command, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } });

      console.log(`Database restored from backup: ${backupUrl}`);
    } finally {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
  }
}