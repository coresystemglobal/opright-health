import express from 'express';
import { Request as ExpressRequest, Response } from 'express';
import appointmentController from './appointment.controller';
import { validate, validateParams, validateQuery, appointmentValidation, genericValidation } from '@utils/validator';

const appointmentRouter = express.Router();

appointmentRouter.get("/",
  validateQuery(appointmentValidation.search),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAllAppointments(req, res);
  }
);

appointmentRouter.get("/:appointmentId",
  validateParams(genericValidation.id),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.getAppointmentById(req, res);
  }
);

appointmentRouter.get("/patient/:patientId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getPatientAppointments(req, res);
});

appointmentRouter.get("/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAppointments(req, res);
});

appointmentRouter.post("/",
  validate(appointmentValidation.create),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.createAppointment(req, res);
  }
);

appointmentRouter.put("/:appointmentId",
  validateParams(genericValidation.id),
  validate(appointmentValidation.update),
  async (req: ExpressRequest, res: Response) => {
    await appointmentController.updateAppointment(req, res);
  }
);

appointmentRouter.patch("/:appointmentId/cancel", async (req: ExpressRequest, res: Response) => {
  await appointmentController.cancelAppointment(req, res);
});

appointmentRouter.patch("/:appointmentId/complete", async (req: ExpressRequest, res: Response) => {
  await appointmentController.completeAppointment(req, res);
});

appointmentRouter.delete("/:appointmentId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.deleteAppointment(req, res);
});

appointmentRouter.get("/availability/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.checkDoctorAvailability(req, res);
});

appointmentRouter.get("/slots/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorAvailableSlots(req, res);
});

appointmentRouter.get("/schedule/doctor/:doctorId", async (req: ExpressRequest, res: Response) => {
  await appointmentController.getDoctorSchedule(req, res);
});

export default appointmentRouter;
