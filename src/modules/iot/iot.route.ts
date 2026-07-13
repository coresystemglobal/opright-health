import express, { Request, Response } from 'express';
import iotController from './iot.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, validateParams, validateQuery, iotValidation, genericValidation } from '@utils/validator';

const iotRouter = express.Router();
const auth = [authentication, tenantMiddleware];
const wrap = (fn: (req: Request, res: Response) => Promise<Response>) => (req: Request, res: Response) => fn(req, res);

// ── Readings (before /devices/:id to keep paths clear) ──────────────────────
iotRouter.get('/readings', ...auth, validateQuery(iotValidation.listReadings), wrap(iotController.listReadings));
iotRouter.get('/patients/:patientId/readings', ...auth, wrap(iotController.patientReadings));

// ── Devices ─────────────────────────────────────────────────────────────────
iotRouter.post('/devices', ...auth, validate(iotValidation.registerDevice), wrap(iotController.registerDevice));
iotRouter.get('/devices', ...auth, validateQuery(iotValidation.listDevices), wrap(iotController.listDevices));
iotRouter.get('/devices/:id', ...auth, validateParams(genericValidation.id), wrap(iotController.getDevice));
iotRouter.put('/devices/:id', ...auth, validateParams(genericValidation.id), validate(iotValidation.updateDevice), wrap(iotController.updateDevice));
iotRouter.delete('/devices/:id', ...auth, validateParams(genericValidation.id), wrap(iotController.deleteDevice));

// Ingest a reading from a device (vitals monitors, glucometers, wearables…).
iotRouter.post('/devices/:id/readings', ...auth, validateParams(genericValidation.id), validate(iotValidation.ingestReading), wrap(iotController.ingestReading));

export default iotRouter;
