import { Router } from 'express';
import { TwoFAController } from './twofa.controller';
import authentication from '@middlewares/authentication';

const twofaRouter = Router();

twofaRouter.get('/status', authentication, TwoFAController.getStatus);

twofaRouter.post('/setup', authentication, TwoFAController.setup);

twofaRouter.post('/enable', authentication, TwoFAController.enable);

twofaRouter.post('/disable', authentication, TwoFAController.disable);

twofaRouter.post('/backup-codes/regenerate', authentication, TwoFAController.regenerateBackupCodes);

twofaRouter.post('/verify', TwoFAController.verifyLogin);

export default twofaRouter;
