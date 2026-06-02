import { Response } from 'express';
import { fileUploadService } from '@modules/files/file-upload.service';

import { File, FileType } from '@modules/files/file.model';

import { ResponseUtil } from '@utils/response.util';
import { TenantRequest } from '@middlewares/tenant.middleware';

export class FileController {
  static async uploadFile(req: TenantRequest, res: Response) {
    try {
      if (!req.file) {
        return ResponseUtil.error(res, 'No file provided', 400);
      }

      const { file_type, folder } = req.body;
      const uploadResult = await fileUploadService.uploadFile(req.file, {
        tenantId: req.tenant!.id,
        folder,
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
        maxSize: 10 * 1024 * 1024 // 10MB
      });

      const fileRecord = await File.create({
        tenant_id: req.tenant!.id,
        original_name: req.file.originalname,
        file_key: uploadResult.key,
        file_url: uploadResult.url,
        content_type: uploadResult.contentType,
        file_size: uploadResult.size,
        file_type: file_type || FileType.DOCUMENT,
        uploaded_by: req.user?.userId
      });

      return ResponseUtil.success(res, fileRecord, 'File uploaded successfully', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async deleteFile(req: TenantRequest, res: Response) {
    try {
      const { id } = req.params;
      const file = await File.findOne({
        where: { id, tenant_id: req.tenant!.id }
      });

      if (!file) {
        return ResponseUtil.error(res, 'File not found', 404);
      }

      await fileUploadService.deleteFile(file.file_key);
      await file.destroy();

      return ResponseUtil.success(res, null, 'File deleted successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }

  static async getFiles(req: TenantRequest, res: Response) {
    try {
      const files = await File.findAll({
        where: { tenant_id: req.tenant!.id },
        order: [['createdAt', 'DESC']]
      });

      return ResponseUtil.success(res, files, 'Files retrieved successfully');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message);
    }
  }
}