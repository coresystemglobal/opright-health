import { Request, Response } from 'express';
import { Tenant } from '@modules/tenancy/tenant.model';
import type { ReminderSettings } from '@modules/tenancy/tenant.model';
import { ResponseUtil } from '@utils/response.util';

const tenantSettingsController = {
  /**
   * Returns the caller tenant's effective reminder settings (defaults applied).
   */
  getReminderSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) return ResponseUtil.notFound(res, 'Tenant not found');

      return ResponseUtil.success(res, tenant.effective_reminder_settings, 'Reminder settings retrieved successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve reminder settings', 500, [msg]);
    }
  },

  /**
   * Updates the caller tenant's reminder settings. Accepts a partial object;
   * unspecified fields keep their stored (or default) value.
   */
  updateReminderSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);

      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) return ResponseUtil.notFound(res, 'Tenant not found');

      const incoming: ReminderSettings = req.body;
      // Merge onto whatever is stored so partial updates don't wipe other fields
      const merged: ReminderSettings = { ...(tenant.reminder_settings || {}), ...incoming };

      if (merged.short_lead_hours !== undefined && merged.long_lead_hours !== undefined
          && merged.short_lead_hours >= merged.long_lead_hours) {
        return ResponseUtil.validationError(res, ['short_lead_hours must be less than long_lead_hours']);
      }

      await tenant.update({ reminder_settings: merged });

      return ResponseUtil.success(res, tenant.effective_reminder_settings, 'Reminder settings updated successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update reminder settings', 500, [msg]);
    }
  }
};

export default tenantSettingsController;
