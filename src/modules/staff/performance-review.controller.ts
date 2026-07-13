import { Request, Response } from 'express';
import { performanceReviewService } from '@modules/staff/performance-review.service';
import { ReviewType, ReviewStatus } from '@modules/staff/performance-review.model';
import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;
const paged = (req: Request): PaginationQuery => ({ page: (req.query.page as string) || '1', limit: (req.query.limit as string) || '10' });

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('required') || msg.includes('Invalid') || msg.includes('must be') || msg.includes('cannot') || msg.includes('Only ')) {
    return ResponseUtil.validationError(res, [msg]);
  }
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const performanceReviewController = {
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const review = await performanceReviewService.createReview({ ...req.body, reviewer_id: req.body.reviewer_id || userOf(req), tenant_id: tenantId });
      return ResponseUtil.success(res, review, 'Performance review created successfully', 201);
    } catch (e) { return fail(res, e, 'create performance review'); }
  },
  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { staff_id, reviewer_id, status, review_type } = req.query as Record<string, string>;
      const r = await performanceReviewService.listReviews(tenantId, paged(req), {
        staff_id, reviewer_id, status: status as ReviewStatus, review_type: review_type as ReviewType
      });
      return ResponseUtil.paginated(res, r.reviews, r.count, r.page, r.limit, 'Performance reviews retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve performance reviews'); }
  },
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await performanceReviewService.getReviewById(req.params.id, tenantId), 'Performance review retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve performance review'); }
  },
  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await performanceReviewService.updateReview(req.params.id, tenantId, req.body), 'Performance review updated successfully');
    } catch (e) { return fail(res, e, 'update performance review'); }
  },
  submit: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await performanceReviewService.submitReview(req.params.id, tenantId), 'Performance review submitted');
    } catch (e) { return fail(res, e, 'submit performance review'); }
  },
  acknowledge: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await performanceReviewService.acknowledgeReview(req.params.id, tenantId, req.body?.staff_comments), 'Performance review acknowledged');
    } catch (e) { return fail(res, e, 'acknowledge performance review'); }
  },
  finalize: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      return ResponseUtil.success(res, await performanceReviewService.finalizeReview(req.params.id, tenantId), 'Performance review finalized');
    } catch (e) { return fail(res, e, 'finalize performance review'); }
  },
  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      await performanceReviewService.deleteReview(req.params.id, tenantId);
      return ResponseUtil.success(res, null, 'Performance review deleted successfully');
    } catch (e) { return fail(res, e, 'delete performance review'); }
  }
};

export default performanceReviewController;
