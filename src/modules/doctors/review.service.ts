import { fn, col, literal } from 'sequelize';
import { DoctorReview } from '@modules/doctors/doctor-review.model';

import { User } from '@modules/users/user.model';

import { Doctor } from '@modules/doctors/doctor.model';

import { ValidationUtil } from '@utils/validation.util';

export const reviewService = {
  upsertReview: async (userId: string, data: { doctor_id: string; rating: number; comment?: string; tenant_id: string }) => {
    try {
      if (!ValidationUtil.isValidUUID(userId) || !ValidationUtil.isValidUUID(data.doctor_id)) {
        throw new Error('Invalid ID format');
      }

      if (data.rating < 1 || data.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const existing = await DoctorReview.findOne({
        where: { user_id: userId, doctor_id: data.doctor_id, tenant_id: data.tenant_id }
      });

      if (existing) {
        await existing.update({ rating: data.rating, comment: data.comment ?? existing.comment });
        return { review: existing, created: false };
      }

      const review = await DoctorReview.create({
        user_id: userId,
        doctor_id: data.doctor_id,
        rating: data.rating,
        comment: data.comment || null,
        tenant_id: data.tenant_id
      } as any);

      return { review, created: true };
    } catch (error) {
      console.error('Upsert review error:', error);
      throw error;
    }
  },

  getDoctorReviews: async (doctorId: string, tenantId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(doctorId)) {
        throw new Error('Invalid doctor ID format');
      }

      const reviews = await DoctorReview.findAll({
        where: { doctor_id: doctorId, tenant_id: tenantId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const aggregate = await DoctorReview.findOne({
        where: { doctor_id: doctorId, tenant_id: tenantId },
        attributes: [
          [fn('AVG', col('rating')), 'average'],
          [fn('COUNT', col('id')), 'count']
        ],
        raw: true
      }) as any;

      return {
        reviews,
        average_rating: aggregate?.average ? parseFloat(Number(aggregate.average).toFixed(1)) : 0,
        total_reviews: parseInt(aggregate?.count || '0', 10)
      };
    } catch (error) {
      console.error('Get doctor reviews error:', error);
      throw error;
    }
  },

  deleteReview: async (reviewId: string, userId: string) => {
    try {
      if (!ValidationUtil.isValidUUID(reviewId)) {
        throw new Error('Invalid review ID format');
      }

      const review = await DoctorReview.findOne({ where: { id: reviewId, user_id: userId } });

      if (!review) {
        throw new Error('Review not found or not authorized');
      }

      await review.destroy();
      return true;
    } catch (error) {
      console.error('Delete review error:', error);
      throw error;
    }
  }
};
