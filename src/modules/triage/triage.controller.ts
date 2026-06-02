import { Request, Response } from 'express';
import triageService from '@modules/triage/triage.service';

import { ResponseUtil } from '@utils/response.util';

const triageController = {
  startSession: async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;

    if (!userId) return ResponseUtil.unauthorized(res);
    if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
    if (!req.body.primary_symptom) return ResponseUtil.validationError(res, ['primary_symptom is required']);

    const result = await triageService.startSession(userId, tenantId, req.body);
    return res.status(result.statusCode).json(result);
  },

  submitAnswer: async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) return ResponseUtil.unauthorized(res);

    const { session_id, question_id, answer_value } = req.body;
    if (!session_id || !question_id || answer_value === undefined) {
      return ResponseUtil.validationError(res, ['session_id, question_id, and answer_value are required']);
    }

    const result = await triageService.submitAnswer(userId, req.body);
    return res.status(result.statusCode).json(result);
  },

  getResult: async (req: Request, res: Response): Promise<Response> => {
    const userId = (req as any).user?.userId;
    if (!userId) return ResponseUtil.unauthorized(res);

    const { sessionId } = req.params;
    const result = await triageService.getResult(userId, sessionId);
    return res.status(result.statusCode).json(result);
  }
};

export default triageController;
