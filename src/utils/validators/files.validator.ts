import Joi from 'joi';

export const fileValidation = {
  upload: Joi.object({
    file_type: Joi.string().valid('image', 'document', 'report', 'prescription', 'lab_result').optional(),
    folder: Joi.string().max(50).optional()
  })
};
