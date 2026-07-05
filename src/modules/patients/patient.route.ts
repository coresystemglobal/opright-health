import express, { Request, Response } from 'express';
import patientController from './patient.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateParams, validateQuery, patientValidation, genericValidation } from '@utils/validator';

const patientRouter = express.Router();

/**
 * @swagger
 * /patients/me:
 *   get:
 *     summary: Get own patient profile
 *     description: Returns the authenticated patient's profile
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await patientController.getMyProfile(req, res);
});

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: List all patients
 *     description: Returns a paginated list of patients. Requires PATIENT_VIEW permission.
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Patients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden – missing PATIENT_VIEW permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateQuery(patientValidation.search),
  async (req: Request, res: Response) => {
    await patientController.getAllPatients(req, res);
  }
);

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.getPatientById(req, res);
  }
);

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Create a new patient record
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - date_of_birth
 *               - gender
 *               - phone
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: Jane
 *               last_name:
 *                 type: string
 *                 example: Smith
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: '1990-05-15'
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               phone:
 *                 type: string
 *                 example: '+2348012345678'
 *               address:
 *                 type: string
 *               blood_type:
 *                 type: string
 *                 enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
 *               allergies:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_CREATE),
  validate(patientValidation.create),
  async (req: Request, res: Response) => {
    await patientController.createPatient(req, res);
  }
);

/**
 * @swagger
 * /patients/{id}:
 *   put:
 *     summary: Update patient record
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               blood_type:
 *                 type: string
 *               allergies:
 *                 type: string
 *     responses:
 *       200:
 *         description: Patient updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Patient'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_UPDATE),
  validateParams(genericValidation.id),
  validate(patientValidation.update),
  async (req: Request, res: Response) => {
    await patientController.updatePatient(req, res);
  }
);

/**
 * @swagger
 * /patients/{id}:
 *   delete:
 *     summary: Soft delete patient
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Patient not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
patientRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.PATIENT_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await patientController.deletePatient(req, res);
  }
);

export default patientRouter;
