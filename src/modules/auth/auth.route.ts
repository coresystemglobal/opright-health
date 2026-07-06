import { Router } from 'express';
import { AuthController } from './auth.controller';
import authentication from '@middlewares/authentication';
import twofaRouter from './twofa.route';

const authRouter = Router();

authRouter.use('/2fa', twofaRouter);

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);

authRouter.post('/logout', authentication, AuthController.logout);

authRouter.post('/refresh-token', AuthController.refreshToken);

authRouter.post('/forgot-password', AuthController.forgotPassword);

authRouter.post('/reset-password', AuthController.resetPassword);

authRouter.post('/verify-email', AuthController.verifyEmail);

authRouter.get('/me', authentication, AuthController.getProfile);

export default authRouter;