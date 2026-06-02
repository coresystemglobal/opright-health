import express, { Request, Response } from 'express';
import triageController from './triage.controller';
import authentication from '@middlewares/authentication';

const triageRouter = express.Router();

// POST /api/triage/start — begin a new triage session
triageRouter.post('/start', authentication, async (req: Request, res: Response) => {
  await triageController.startSession(req, res);
});

// POST /api/triage/answer — submit an answer and get the next question (or result)
triageRouter.post('/answer', authentication, async (req: Request, res: Response) => {
  await triageController.submitAnswer(req, res);
});

// GET /api/triage/result/:sessionId — fetch completed session result
triageRouter.get('/result/:sessionId', authentication, async (req: Request, res: Response) => {
  await triageController.getResult(req, res);
});

export default triageRouter;
