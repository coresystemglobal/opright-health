import { PerformanceReview, StaffProfile } from '../../models';
import { ReviewType, ReviewStatus } from '@modules/staff/performance-review.model';
import { PaginationQuery } from '@appTypes/common.types';
import { PaginationUtil } from '@utils/pagination.util';
import { ValidationUtil } from '@utils/validation.util';
import { assertStaff } from '@modules/staff/staff.service';

interface CreateReviewData {
  staff_id: string;
  reviewer_id?: string;
  review_type?: ReviewType;
  period_start: string;
  period_end: string;
  overall_rating?: number;
  ratings?: Record<string, number>;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: any;
  reviewer_comments?: string;
  tenant_id: string;
}

const STAFF_ATTRS = ['id', 'employee_no', 'first_name', 'last_name', 'job_title'];

export const performanceReviewService = {
  createReview: async (data: CreateReviewData) => {
    const { staff_id, period_start, period_end, tenant_id } = data;
    if (!staff_id || !period_start || !period_end || !tenant_id) {
      throw new Error('staff_id, period_start, period_end, and tenant context are required');
    }
    if (period_end < period_start) throw new Error('period_end must be on or after period_start');
    await assertStaff(staff_id, tenant_id);

    return PerformanceReview.create({
      staff_id,
      reviewer_id: data.reviewer_id || null,
      review_type: data.review_type || ReviewType.ANNUAL,
      period_start,
      period_end,
      status: ReviewStatus.DRAFT,
      overall_rating: data.overall_rating ?? null,
      ratings: data.ratings || null,
      strengths: data.strengths || null,
      areas_for_improvement: data.areas_for_improvement || null,
      goals: data.goals || null,
      reviewer_comments: data.reviewer_comments || null,
      tenant_id
    } as any);
  },

  listReviews: async (
    tenantId: string,
    paginationQuery: PaginationQuery,
    filters: { staff_id?: string; reviewer_id?: string; status?: ReviewStatus; review_type?: ReviewType } = {}
  ) => {
    const paginationOptions = PaginationUtil.parsePaginationQuery(paginationQuery);
    const where: any = { tenant_id: tenantId };
    if (filters.staff_id) where.staff_id = filters.staff_id;
    if (filters.reviewer_id) where.reviewer_id = filters.reviewer_id;
    if (filters.status) where.status = filters.status;
    if (filters.review_type) where.review_type = filters.review_type;

    const { count, rows: reviews } = await PerformanceReview.findAndCountAll({
      where,
      include: [{ model: StaffProfile, attributes: STAFF_ATTRS }],
      order: [['period_end', 'DESC'], ['createdAt', 'DESC']],
      ...PaginationUtil.getSequelizePagination(paginationOptions),
      paranoid: true
    });
    return { reviews, count, page: paginationOptions.page, limit: paginationOptions.limit };
  },

  getReviewById: async (reviewId: string, tenantId: string) => {
    if (!ValidationUtil.isValidUUID(reviewId)) throw new Error('Invalid review ID format');
    const review = await PerformanceReview.findByPk(reviewId, { include: [{ model: StaffProfile, attributes: STAFF_ATTRS }] });
    if (!review || review.tenant_id !== tenantId) throw new Error('Performance review not found');
    return review;
  },

  /** Edit review content. Only permitted while the review is still a draft. */
  updateReview: async (reviewId: string, tenantId: string, update: Partial<CreateReviewData>) => {
    const review = await performanceReviewService.getReviewById(reviewId, tenantId);
    if (review.status !== ReviewStatus.DRAFT) throw new Error(`Only draft reviews can be edited (current status: ${review.status})`);
    const patch: any = { ...update };
    delete patch.tenant_id;
    delete patch.staff_id; // a review is bound to its subject
    if (patch.period_start || patch.period_end) {
      const start = patch.period_start || review.period_start;
      const end = patch.period_end || review.period_end;
      if (end < start) throw new Error('period_end must be on or after period_start');
    }
    await review.update(patch);
    return review;
  },

  /** draft → submitted */
  submitReview: async (reviewId: string, tenantId: string) => {
    const review = await performanceReviewService.getReviewById(reviewId, tenantId);
    if (review.status !== ReviewStatus.DRAFT) throw new Error(`Only draft reviews can be submitted (current status: ${review.status})`);
    if (review.overall_rating == null) throw new Error('overall_rating is required before submitting');
    await review.update({ status: ReviewStatus.SUBMITTED, submitted_at: new Date() });
    return review;
  },

  /** submitted → acknowledged (staff sign-off, optional comments) */
  acknowledgeReview: async (reviewId: string, tenantId: string, staffComments?: string) => {
    const review = await performanceReviewService.getReviewById(reviewId, tenantId);
    if (review.status !== ReviewStatus.SUBMITTED) throw new Error(`Only submitted reviews can be acknowledged (current status: ${review.status})`);
    await review.update({
      status: ReviewStatus.ACKNOWLEDGED,
      acknowledged_at: new Date(),
      staff_comments: staffComments ?? review.staff_comments
    });
    return review;
  },

  /** submitted|acknowledged → finalized (locks the review) */
  finalizeReview: async (reviewId: string, tenantId: string) => {
    const review = await performanceReviewService.getReviewById(reviewId, tenantId);
    if (review.status !== ReviewStatus.SUBMITTED && review.status !== ReviewStatus.ACKNOWLEDGED) {
      throw new Error(`Only submitted or acknowledged reviews can be finalized (current status: ${review.status})`);
    }
    await review.update({ status: ReviewStatus.FINALIZED, finalized_at: new Date() });
    return review;
  },

  /** A finalized review cannot be deleted (kept as an HR record). */
  deleteReview: async (reviewId: string, tenantId: string) => {
    const review = await performanceReviewService.getReviewById(reviewId, tenantId);
    if (review.status === ReviewStatus.FINALIZED) throw new Error('A finalized review cannot be deleted');
    await review.destroy();
    return true;
  }
};
