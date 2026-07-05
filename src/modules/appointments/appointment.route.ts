import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import appointmentController from './appointment.controller';
import { validate, validateParams, validateQuery, appointmentValidation, genericValidation } from '@utils/validator';

const appointmentRouter = express.Router();

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: List all appointments
 *     description: Returns appointments with optional filtering by status, date, doctor, or patient.
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, cancelled, completed, no_show]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-07-10'
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
 *         description: Appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
appointmentRouter.get("/",
  validateQuery(appointmentValidation.search),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAllAppointments(req, res);
  }
);

/**
 * @swagger
 * /appointments/{appointmentId}:
 *   get:
 *     summary: Get appointment by ID
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
appointmentRouter.get("/:appointmentId",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAppointmentById(req, res);
  }
);

/**
 * @swagger
 * /appointments/patient/{patientId}:
 *   get:
 *     summary: Get appointments for a patient
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Patient appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
appointmentRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getPatientAppointments(req, res);
});

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Get appointments for a doctor
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Doctor appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
appointmentRouter.get("/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAppointments(req, res);
});

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - doctor_id
 *               - scheduled_at
 *               - appointment_type
 *             properties:
 *               patient_id:
 *                 type: string
 *                 format: uuid
 *               doctor_id:
 *                 type: string
 *                 format: uuid
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 example: '2026-07-10T09:00:00Z'
 *               appointment_type:
 *                 type: string
 *                 enum: [consultation, follow_up, emergency, checkup]
 *               duration_minutes:
 *                 type: integer
 *                 example: 30
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error or slot unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
appointmentRouter.post("/",
  validate(appointmentValidation.create),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.createAppointment(req, res);
  }
);

/**
 * @swagger
 * /appointments/{appointmentId}:
 *   put:
 *     summary: Update an appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: appointmentId
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
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *               appointment_type:
 *                 type: string
 *               notes:
 *                 type: string
 *               duration_minutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 */
appointmentRouter.put("/:appointmentId",
  validateParams(genericValidation.id),
  validate(appointmentValidation.update),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.updateAppointment(req, res);
  }
);

/**
 * @swagger
 * /appointments/{appointmentId}/cancel:
 *   patch:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
appointmentRouter.patch("/:appointmentId/cancel", async (req: ExpressRequest, res: Response) => {
  await appointmentController.cancelAppointment(req, res);
});

/**
 * @swagger
 * /appointments/{appointmentId}/complete:
 *   patch:
 *     summary: Mark an appointment as completed
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
appointmentRouter.patch("/:appointmentId/complete", async (req: ExpressRequest, res: Response) => {
  await appointmentController.completeAppointment(req, res);
});

/**
 * @swagger
 * /appointments/{appointmentId}:
 *   delete:
 *     summary: Soft delete an appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
appointmentRouter.delete("/:appointmentId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.deleteAppointment(req, res);
});

/**
 * @swagger
 * /appointments/availability/doctor/{doctorId}:
 *   get:
 *     summary: Check doctor availability for a date/time
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-07-10'
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *           example: '09:00'
 *     responses:
 *       200:
 *         description: Availability status returned
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
 *                     available:
 *                       type: boolean
 *                       example: true
 */
appointmentRouter.get("/availability/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.checkDoctorAvailability(req, res);
});

/**
 * @swagger
 * /appointments/slots/doctor/{doctorId}:
 *   get:
 *     summary: Get available time slots for a doctor on a specific date
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-07-10'
 *     responses:
 *       200:
 *         description: Available slots returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: '09:00'
 */
appointmentRouter.get("/slots/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAvailableSlots(req, res);
});

/**
 * @swagger
 * /appointments/schedule/doctor/{doctorId}:
 *   get:
 *     summary: Get doctor schedule for a date range
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Doctor schedule retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
appointmentRouter.get("/schedule/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorSchedule(req, res);
});

export default appointmentRouter;
