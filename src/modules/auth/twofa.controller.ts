import { Response } from 'express';
import { AuthenticatedRequest, TypedRequest } from '@appTypes/common.types';
import { ResponseUtil } from '@utils/response.util';
import { twofaService } from './twofa.service';

export class TwoFAController {
  static async setup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      try {
        const result = await twofaService.setup(userId);
        return ResponseUtil.success(res, result, '2FA setup initiated. Scan the QR code with Google Authenticator.');
      } catch (err: any) {
        if (err.message === '2FA is already enabled') return ResponseUtil.conflict(res, err.message);
        if (err.message === 'User not found') return ResponseUtil.notFound(res, err.message);
        throw err;
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      return ResponseUtil.error(res, '2FA setup failed');
    }
  }

  static async enable(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const { totpCode } = req.body;
      if (!totpCode) return ResponseUtil.validationError(res, ['totpCode is required']);

      try {
        const result = await twofaService.enable(userId, totpCode);
        return ResponseUtil.success(res, result, '2FA enabled. Save your backup codes — they cannot be shown again.');
      } catch (err: any) {
        if (err.message === 'Invalid authenticator code') return ResponseUtil.unauthorized(res, err.message);
        if (err.message === '2FA is already enabled') return ResponseUtil.conflict(res, err.message);
        if (err.message === 'Run 2FA setup first') return ResponseUtil.validationError(res, [err.message]);
        throw err;
      }
    } catch (error) {
      console.error('2FA enable error:', error);
      return ResponseUtil.error(res, 'Failed to enable 2FA');
    }
  }

  static async verifyLogin(req: TypedRequest<{ tempToken: string; totpCode: string }>, res: Response) {
    try {
      const { tempToken, totpCode } = req.body;
      if (!tempToken || !totpCode) {
        return ResponseUtil.validationError(res, ['tempToken and totpCode are required']);
      }

      try {
        const result = await twofaService.verifyLogin(tempToken, totpCode);
        return ResponseUtil.success(res, result, 'Login successful');
      } catch (err: any) {
        if (err.message === 'Invalid authenticator code') return ResponseUtil.unauthorized(res, err.message);
        if (err.message === 'Invalid or expired challenge token') return ResponseUtil.unauthorized(res, err.message);
        if (err.message === 'Invalid token purpose') return ResponseUtil.unauthorized(res, 'Invalid token');
        if (err.message === 'User not found or inactive') return ResponseUtil.unauthorized(res, 'Invalid credentials');
        throw err;
      }
    } catch (error) {
      console.error('2FA verify login error:', error);
      return ResponseUtil.error(res, '2FA verification failed');
    }
  }

  static async disable(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const { totpCode } = req.body;
      if (!totpCode) return ResponseUtil.validationError(res, ['totpCode is required']);

      try {
        const result = await twofaService.disable(userId, totpCode);
        return ResponseUtil.success(res, null, result.message);
      } catch (err: any) {
        if (err.message === 'Invalid authenticator code') return ResponseUtil.unauthorized(res, err.message);
        if (err.message === '2FA is not enabled') return ResponseUtil.validationError(res, [err.message]);
        throw err;
      }
    } catch (error) {
      console.error('2FA disable error:', error);
      return ResponseUtil.error(res, 'Failed to disable 2FA');
    }
  }

  static async regenerateBackupCodes(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);
      const { totpCode } = req.body;
      if (!totpCode) return ResponseUtil.validationError(res, ['totpCode is required']);

      try {
        const result = await twofaService.regenerateBackupCodes(userId, totpCode);
        return ResponseUtil.success(res, result, 'New backup codes generated. Save them now.');
      } catch (err: any) {
        if (err.message === 'Invalid authenticator code') return ResponseUtil.unauthorized(res, err.message);
        if (err.message === '2FA is not enabled') return ResponseUtil.validationError(res, [err.message]);
        throw err;
      }
    } catch (error) {
      console.error('2FA regenerate backup codes error:', error);
      return ResponseUtil.error(res, 'Failed to regenerate backup codes');
    }
  }

  static async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      try {
        const result = await twofaService.getStatus(userId);
        return ResponseUtil.success(res, result, '2FA status retrieved');
      } catch (err: any) {
        if (err.message === 'User not found') return ResponseUtil.notFound(res, err.message);
        throw err;
      }
    } catch (error) {
      console.error('2FA status error:', error);
      return ResponseUtil.error(res, 'Failed to get 2FA status');
    }
  }
}
