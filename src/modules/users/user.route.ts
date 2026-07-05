import express, { Request, Response } from 'express';
import { UserController } from './user.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const userRouter = express.Router();

userRouter.get('/search',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  async (req: Request, res: Response) => {
    await UserController.searchUsers(req, res);
  }
);

userRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  async (req: Request, res: Response) => {
    await UserController.getAllUsers(req, res);
  }
);

userRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.getUserById(req, res);
  }
);

userRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.updateUser(req, res);
  }
);

userRouter.patch('/:id/password',
  authentication,
  async (req: Request, res: Response) => {
    await UserController.changePassword(req, res);
  }
);

userRouter.patch('/:id/status',
  authentication,
  checkPermission(PERMISSIONS.USER_MANAGE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.toggleUserStatus(req, res);
  }
);

userRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.deleteUser(req, res);
  }
);

export default userRouter;
