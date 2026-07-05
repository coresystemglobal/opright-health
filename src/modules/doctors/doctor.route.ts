import express, { Request, Response } from 'express';
import doctorController from './doctor.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const doctorRouter = express.Router();

/**
 * @swagger
 * /doctors/me:
 *   get:
 *     summary: Get own doctor profile
 *     description: Returns the authenticated doctor's profile
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
doctorRouter.get('/me', authentication, async (req: Request, res: Response) => {
  await doctorController.getMyProfile(req, res);
});

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: List all doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: specialization
 *         schema:
 *           type: string
 *           example: Cardiology
 *       - in: query
 *         name: is_available
 *         schema:
 *           type: boolean
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
 *     responses:
 *       200:
 *         description: Doctors retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
doctorRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  async (req: Request, res: Response) => {
    await doctorController.getAllDoctors(req, res);
  }
);

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
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
 *         description: Doctor retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
doctorRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.getDoctorById(req, res);
  }
);

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Create a new doctor profile
 *     description: Requires DOCTOR_CREATE permission (admin only)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - specialization
 *               - license_number
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               specialization:
 *                 type: string
 *                 example: Cardiology
 *               license_number:
 *                 type: string
 *                 example: MED-2024-001
 *               department_id:
 *                 type: string
 *                 format: uuid
 *               years_of_experience:
 *                 type: integer
 *                 example: 10
 *               consultation_fee:
 *                 type: number
 *                 example: 15000
 *     responses:
 *       201:
 *         description: Doctor created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
doctorRouter.post('/',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_CREATE),
  async (req: Request, res: Response) => {
    await doctorController.createDoctor(req, res);
  }
);

/**
 * @swagger
 * /doctors/{id}:
 *   put:
 *     summary: Update doctor profile
 *     tags: [Doctors]
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
 *               specialization:
 *                 type: string
 *               consultation_fee:
 *                 type: number
 *               department_id:
 *                 type: string
 *                 format: uuid
 *               years_of_experience:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Doctor updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Doctor'
 */
doctorRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.updateDoctor(req, res);
  }
);

/**
 * @swagger
 * /doctors/{id}/availability:
 *   patch:
 *     summary: Toggle doctor availability
 *     tags: [Doctors]
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
 *         description: Availability toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     is_available:
 *                       type: boolean
 *                       example: false
 */
doctorRouter.patch('/:id/availability',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.toggleAvailability(req, res);
  }
);

/**
 * @swagger
 * /doctors/{id}:
 *   delete:
 *     summary: Soft delete doctor (admin only)
 *     tags: [Doctors]
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
 *         description: Doctor deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Doctor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
doctorRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.DOCTOR_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await doctorController.deleteDoctor(req, res);
  }
);

export default doctorRouter;
