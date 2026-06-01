import express from 'express';
import { MobileAPIService } from '../services/mobile-api.service';
import { ResponseUtil } from '../utils/response.util';
import { tenantMiddleware } from '../middlewares/tenant.middleware';
import authentication from '../middlewares/authentication';

const mobileRouter = express.Router();

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: Get mobile patient profile
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Patient profile for mobile app
 */
mobileRouter.get('/profile', tenantMiddleware, authentication, async (req: any, res) => {
  try {
    const profile = await MobileAPIService.getPatientProfile(req.user.userId, req.tenant.id);
    const mobileResponse = MobileAPIService.formatMobileResponse(profile, req);
    return ResponseUtil.success(res, mobileResponse, 'Profile retrieved successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

/**
 * @swagger
 * /api/mobile/appointments:
 *   get:
 *     summary: Get upcoming appointments for mobile
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Upcoming appointments
 */
mobileRouter.get('/appointments', tenantMiddleware, authentication, async (req: any, res) => {
  try {
    const appointments = await MobileAPIService.getUpcomingAppointments(req.user.userId, req.tenant.id);
    const mobileResponse = MobileAPIService.formatMobileResponse(appointments, req);
    return ResponseUtil.success(res, mobileResponse, 'Appointments retrieved successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

/**
 * @swagger
 * /api/mobile/appointments/{id}/cancel:
 *   post:
 *     summary: Cancel appointment from mobile
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 */
mobileRouter.post('/appointments/:id/cancel', tenantMiddleware, authentication, async (req: any, res) => {
  try {
    await MobileAPIService.cancelAppointment(req.params.id, req.user.userId, req.body.reason);
    return ResponseUtil.success(res, null, 'Appointment cancelled successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

mobileRouter.post('/appointments/request', tenantMiddleware, authentication, async (req: any, res) => {
  try {
    const result = await MobileAPIService.requestAppointment(req.user.userId, req.tenant.id, req.body);
    return ResponseUtil.success(res, result, result.message);
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

mobileRouter.get('/lab-results', tenantMiddleware, authentication, async (req: any, res) => {
  try {
    const results = await MobileAPIService.getLabResults(req.user.userId, req.tenant.id);
    const mobileResponse = MobileAPIService.formatMobileResponse(results, req);
    return ResponseUtil.success(res, mobileResponse, 'Lab results retrieved successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message);
  }
});

export default mobileRouter;