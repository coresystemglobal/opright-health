import Joi from 'joi';

const LAB_TYPES = ['clinical', 'pathology', 'molecular', 'microbiology', 'radiology', 'reference', 'other'];
const PHARMACY_TYPES = ['retail', 'hospital', 'clinical', 'compounding', 'wholesale', 'other'];
const ACCREDITATION = ['accredited', 'provisional', 'not_accredited', 'under_review'];

const contact = {
  short_name: Joi.string().max(100).trim(),
  accreditation_status: Joi.string().valid(...ACCREDITATION),
  accrediting_body: Joi.string().max(100).trim(),
  accreditation_expiry: Joi.date().iso(),
  address: Joi.string().max(1000).trim(),
  city: Joi.string().max(100).trim(),
  state: Joi.string().max(100).trim(),
  country: Joi.string().max(100).trim(),
  phone: Joi.string().max(20).trim(),
  email: Joi.string().email().max(255).trim(),
  operating_hours: Joi.object().unknown(true),
  is_active: Joi.boolean(),
  established_date: Joi.date().iso()
};

export const laboratoryFacilityValidation = {
  create: Joi.object({
    name: Joi.string().max(200).trim().required(),
    license_number: Joi.string().max(100).trim().required(),
    lab_type: Joi.string().valid(...LAB_TYPES).optional(),
    test_categories_offered: Joi.array().items(Joi.string().max(100)).optional(),
    ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, v.optional()]))
  }),

  update: Joi.object({
    name: Joi.string().max(200).trim(),
    license_number: Joi.string().max(100).trim(),
    lab_type: Joi.string().valid(...LAB_TYPES),
    test_categories_offered: Joi.array().items(Joi.string().max(100)),
    ...contact
  }).min(1)
};

export const pharmacyFacilityValidation = {
  create: Joi.object({
    name: Joi.string().max(200).trim().required(),
    license_number: Joi.string().max(100).trim().required(),
    pharmacy_type: Joi.string().valid(...PHARMACY_TYPES).optional(),
    controlled_substance_license: Joi.string().max(50).trim().optional(),
    ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, v.optional()]))
  }),

  update: Joi.object({
    name: Joi.string().max(200).trim(),
    license_number: Joi.string().max(100).trim(),
    pharmacy_type: Joi.string().valid(...PHARMACY_TYPES),
    controlled_substance_license: Joi.string().max(50).trim(),
    ...contact
  }).min(1)
};
