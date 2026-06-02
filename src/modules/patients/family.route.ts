import express, { Request, Response } from 'express';
import familyController from './family.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, genericValidation } from '@utils/validator';
import Joi from 'joi';

const familyRouter = express.Router();

const familyCreateSchema = Joi.object({
  first_name: Joi.string().pattern(/^[a-zA-Z\s\-']{2,100}$/).trim().required(),
  last_name: Joi.string().pattern(/^[a-zA-Z\s\-']{2,100}$/).trim().required(),
  relationship: Joi.string().valid('child', 'spouse', 'parent', 'sibling', 'grandparent', 'grandchild', 'other').required(),
  date_of_birth: Joi.date().iso().optional(),
  blood_type: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).trim().optional(),
  allergies: Joi.string().max(2000).trim().optional(),
  medical_notes: Joi.string().max(5000).trim().optional()
});

const familyUpdateSchema = familyCreateSchema.fork(
  ['first_name', 'last_name', 'relationship'],
  (schema) => schema.optional()
);

// GET /api/family — list own family members
familyRouter.get('/',
  authentication,
  async (req: Request, res: Response) => {
    await familyController.getAllMembers(req, res);
  }
);

// GET /api/family/:id — get single family member
familyRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await familyController.getMemberById(req, res);
  }
);

// POST /api/family — add family member
familyRouter.post('/',
  authentication,
  validate(familyCreateSchema),
  async (req: Request, res: Response) => {
    await familyController.createMember(req, res);
  }
);

// PUT /api/family/:id — update family member
familyRouter.put('/:id',
  authentication,
  validateParams(genericValidation.id),
  validate(familyUpdateSchema),
  async (req: Request, res: Response) => {
    await familyController.updateMember(req, res);
  }
);

// DELETE /api/family/:id — remove family member (soft delete)
familyRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await familyController.deleteMember(req, res);
  }
);

export default familyRouter;
