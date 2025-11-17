import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface UploadOptions {
  tenantId: string;
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number;
}

interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

export class FileUploadService {
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    this.s3 = new AWS.S3({
      endpoint: process.env.B2_ENDPOINT || 'https://s3.us-west-000.backblazeb2.com',
      accessKeyId: process.env.B2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.B2_SECRET_ACCESS_KEY!,
      region: process.env.B2_REGION || 'us-west-000',
      s3ForcePathStyle: true
    });
    this.bucket = process.env.B2_BUCKET_NAME!;
  }

  async uploadFile(file: any, options: UploadOptions): Promise<UploadResult> {
    this.validateFile(file, options);
    
    const key = this.generateKey(file.originalname, options);
    
    const uploadParams = {
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        tenantId: options.tenantId,
        originalName: file.originalname
      }
    };

    const result = await this.s3.upload(uploadParams).promise();
    
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
      size: file.size,
      contentType: file.mimetype
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key
    }).promise();
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn
    });
  }

  private validateFile(file: any, options: UploadOptions): void {
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} not allowed`);
    }
    
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${options.maxSize}`);
    }
  }

  private generateKey(originalName: string, options: UploadOptions): string {
    const ext = path.extname(originalName);
    const filename = `${uuidv4()}${ext}`;
    const folder = options.folder || 'general';
    return `tenants/${options.tenantId}/${folder}/${filename}`;
  }
}

export const fileUploadService = new FileUploadService();