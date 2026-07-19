import express, { Request, Response } from 'express';
import triageController from './triage.controller';
import authentication from '@middlewares/authentication';
import { optionalTenantMiddleware } from '@middlewares/optional-tenant.middleware';

// Triage is a direct-to-consumer surface: tenant resolves from x-tenant-id when
// present, otherwise falls back to the platform tenant, so a hospital-less user
// can self-triage.
const triageRouter = express.Router();

triageRouter.post('/start', authentication, optionalTenantMiddleware, async (req: Request, res: Response) => {
  await triageController.startSession(req, res);
});

triageRouter.post('/answer', authentication, optionalTenantMiddleware, async (req: Request, res: Response) => {
  await triageController.submitAnswer(req, res);
});

triageRouter.get('/result/:sessionId', authentication, optionalTenantMiddleware, async (req: Request, res: Response) => {
  await triageController.getResult(req, res);
});

export default triageRouter;
