import { Request, Response } from 'express';
import { FAQService } from '../services/faq.service';
import { ResponseUtil } from '../utils/response.util';

export class FAQController {
  static async getAll(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const tenantId = (req as any).tenantId;
      
      const faqs = await FAQService.getAll(tenantId, category as string);
      return ResponseUtil.success(res, faqs, 'FAQs retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve FAQs', 500);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = (req as any).tenantId;
      
      const faq = await FAQService.getById(id, tenantId);
      if (!faq) {
        return ResponseUtil.notFound(res, 'FAQ not found');
      }
      
      return ResponseUtil.success(res, faq, 'FAQ retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve FAQ', 500);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const data = { ...req.body, tenant_id: tenantId };
      
      const faq = await FAQService.create(data);
      return ResponseUtil.success(res, faq, 'FAQ created successfully', 201);
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to create FAQ', 500);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = (req as any).tenantId;
      
      const faq = await FAQService.update(id, req.body, tenantId);
      if (!faq) {
        return ResponseUtil.notFound(res, 'FAQ not found');
      }
      
      return ResponseUtil.success(res, faq, 'FAQ updated successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to update FAQ', 500);
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenantId = (req as any).tenantId;
      
      const deleted = await FAQService.delete(id, tenantId);
      if (!deleted) {
        return ResponseUtil.notFound(res, 'FAQ not found');
      }
      
      return ResponseUtil.success(res, null, 'FAQ deleted successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to delete FAQ', 500);
    }
  }

  static async search(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const tenantId = (req as any).tenantId;
      
      if (!q) {
        return ResponseUtil.error(res, 'Search query is required', 400);
      }
      
      const faqs = await FAQService.search(q as string, tenantId);
      return ResponseUtil.success(res, faqs, 'Search completed successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to search FAQs', 500);
    }
  }

  static async getCategories(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      
      const categories = await FAQService.getCategories(tenantId);
      return ResponseUtil.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      return ResponseUtil.error(res, 'Failed to retrieve categories', 500);
    }
  }
}