import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import appointmentController from './appointment.controller';
import { validate, validateParams, validateQuery, appointmentValidation, genericValidation } from '@utils/validator';

const appointmentRouter = express.Router();

// Get all appointments with optional filtering (status, date)
appointmentRouter.get("/", 
  validateQuery(appointmentValidation.search),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAllAppointments(req, res);
  }
);

// Get appointment by ID
appointmentRouter.get("/:appointmentId", 
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAppointmentById(req, res);
  }
);

// Get appointments for a specific patient
appointmentRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getPatientAppointments(req, res);
});

// Get appointments for a specific doctor
appointmentRouter.get("/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAppointments(req, res);
});

// Create a new appointment
appointmentRouter.post("/", 
  validate(appointmentValidation.create),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.createAppointment(req, res);
  }
);

// Update an appointment
appointmentRouter.put("/:appointmentId", 
  validateParams(genericValidation.id),
  validate(appointmentValidation.update),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.updateAppointment(req, res);
  }
);

// Cancel an appointment
appointmentRouter.patch("/:appointmentId/cancel", async (req: ExpressRequest, res: Response) => {
  await appointmentController.cancelAppointment(req, res);
});

// Complete an appointment
appointmentRouter.patch("/:appointmentId/complete", async (req: ExpressRequest, res: Response) => {
  await appointmentController.completeAppointment(req, res);
});

// Delete an appointment (soft delete)
appointmentRouter.delete("/:appointmentId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.deleteAppointment(req, res);
});

// Check doctor availability for a specific date and time
appointmentRouter.get("/availability/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.checkDoctorAvailability(req, res);
});

// Get available time slots for a doctor on a specific date
appointmentRouter.get("/slots/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAvailableSlots(req, res);
});

// Get doctor schedule for a date range
appointmentRouter.get("/schedule/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorSchedule(req, res);
});

export default appointmentRouter;