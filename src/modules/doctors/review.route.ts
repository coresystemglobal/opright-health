import express, { Request, Response } from 'express';
import reviewController from './review.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, genericValidation } from '@utils/validator';
import Joi from 'joi';

const reviewRouter = express.Router();

const reviewCreateSchema = Joi.object({
  doctor_id: Joi.string().uuid().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).trim().optional()
});

// POST /api/reviews — submit or update a review (authenticated patients)
reviewRouter.post('/',
  authentication,
  validate(reviewCreateSchema),
  async (req: Request, res: Response) => {
    await reviewController.submitReview(req, res);
  }
);

// GET /api/reviews/doctor/:doctorId — get all reviews for a doctor + avg rating
reviewRouter.get('/doctor/:doctorId',
  authentication,
  async (req: Request, res: Response) => {
    await reviewController.getDoctorReviews(req, res);
  }
);

// DELETE /api/reviews/:id — delete own review
reviewRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await reviewController.deleteReview(req, res);
  }
);

export default reviewRouter;
