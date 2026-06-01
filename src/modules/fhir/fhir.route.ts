
import express from 'express';
import { FHIRController } from './fhir.controller';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import authentication from '@middlewares/authentication';

const fhirRouter = express.Router();

/**
 * @swagger
 * /api/fhir/Patient/{id}:
 *   get:
 *     summary: Get FHIR Patient resource
 *     tags: [FHIR]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FHIR Patient resource
 */
fhirRouter.get('/Patient/:id', tenantMiddleware, authentication, FHIRController.getPatient);

/**
 * @swagger
 * /api/fhir/Patient:
 *   post:
 *     summary: Create FHIR Patient resource
 *     tags: [FHIR]
 *     requestBody:
 *       required: true
 *       content:
 *         application/fhir+json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: FHIR Patient resource created
 */
fhirRouter.post('/Patient', tenantMiddleware, authentication, FHIRController.createPatient);

fhirRouter.get('/Appointment/:id', tenantMiddleware, authentication, FHIRController.getAppointment);

export default fhirRouter;