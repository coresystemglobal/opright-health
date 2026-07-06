
import express from 'express';
import { FHIRController } from './fhir.controller';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import authentication from '@middlewares/authentication';

const fhirRouter = express.Router();

fhirRouter.get('/Patient/:id', tenantMiddleware, authentication, FHIRController.getPatient);

fhirRouter.post('/Patient', tenantMiddleware, authentication, FHIRController.createPatient);

fhirRouter.get('/Appointment/:id', tenantMiddleware, authentication, FHIRController.getAppointment);

export default fhirRouter;