import express from 'express';
import { HealthController } from './health.controller';

const healthRouter = express.Router();

healthRouter.get('/health', HealthController.healthCheck);

healthRouter.get('/ready', HealthController.readiness);

healthRouter.get('/live', HealthController.liveness);

export default healthRouter;
