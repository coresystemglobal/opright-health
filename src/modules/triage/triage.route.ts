import express, { Request, Response } from 'express';
import triageController from './triage.controller';
import authentication from '@middlewares/authentication';

const triageRouter = express.Router();

triageRouter.post('/start', authentication, async (req: Request, res: Response) => {
  await triageController.startSession(req, res);
});

triageRouter.post('/answer', authentication, async (req: Request, res: Response) => {
  await triageController.submitAnswer(req, res);
});

triageRouter.get('/result/:sessionId', authentication, async (req: Request, res: Response) => {
  await triageController.getResult(req, res);
});

export default triageRouter;
