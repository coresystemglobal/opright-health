import { Request, Response } from 'express';
import { reviewService } from '@modules/doctors/review.service';

import { ResponseUtil } from '@utils/response.util';

const reviewController = {
  submitReview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!userId) return ResponseUtil.unauthorized(res);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const { review, created } = await reviewService.upsertReview(userId, { ...req.body, tenant_id: tenantId });
      const message = created ? 'Review submitted successfully' : 'Review updated successfully';
      return ResponseUtil.success(res, review, message, created ? 201 : 200);
    } catch (error) {
      if (error instanceof Error && error.message.includes('between 1 and 5')) return ResponseUtil.validationError(res, [error.message]);
      if (error instanceof Error && error.message.includes('Invalid ID')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to submit review', 500, [msg]);
    }
  },

  getDoctorReviews: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { doctorId } = req.params;
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const result = await reviewService.getDoctorReviews(doctorId, tenantId);
      return ResponseUtil.success(res, result, 'Reviews retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid doctor')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve reviews', 500, [msg]);
    }
  },

  deleteReview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) return ResponseUtil.unauthorized(res);

      await reviewService.deleteReview(id, userId);
      return ResponseUtil.success(res, null, 'Review deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found or not authorized')) return ResponseUtil.notFound(res, 'Review not found or not authorized');
      if (error instanceof Error && error.message.includes('Invalid review')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete review', 500, [msg]);
    }
  }
};

export default reviewController;
