import express, { Request, Response } from 'express';
import tenantSettingsController from './tenant-settings.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { validate, tenantValidation } from '@utils/validator';

const tenantSettingsRouter = express.Router();

// GET /api/tenant/reminder-settings — effective reminder config for the caller tenant
tenantSettingsRouter.get('/reminder-settings',
  authentication,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    await tenantSettingsController.getReminderSettings(req, res);
  }
);

// PATCH /api/tenant/reminder-settings — update reminder config (partial)
tenantSettingsRouter.patch('/reminder-settings',
  authentication,
  tenantMiddleware,
  validate(tenantValidation.reminderSettings),
  async (req: Request, res: Response) => {
    await tenantSettingsController.updateReminderSettings(req, res);
  }
);

export default tenantSettingsRouter;
