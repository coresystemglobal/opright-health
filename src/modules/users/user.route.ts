import express, { Request, Response } from 'express';
import { UserController } from './user.controller';
import authentication from '@middlewares/authentication';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validateParams, genericValidation } from '@utils/validator';

const userRouter = express.Router();

// GET /api/users/search — search users (admin)
userRouter.get('/search',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  async (req: Request, res: Response) => {
    await UserController.searchUsers(req, res);
  }
);

// GET /api/users — list all users (admin)
userRouter.get('/',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  async (req: Request, res: Response) => {
    await UserController.getAllUsers(req, res);
  }
);

// GET /api/users/:id — get user by ID
userRouter.get('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_VIEW),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.getUserById(req, res);
  }
);

// PUT /api/users/:id — update user profile
userRouter.put('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_UPDATE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.updateUser(req, res);
  }
);

// PATCH /api/users/:id/password — change password (own account)
userRouter.patch('/:id/password',
  authentication,
  async (req: Request, res: Response) => {
    await UserController.changePassword(req, res);
  }
);

// PATCH /api/users/:id/status — toggle active/inactive (admin)
userRouter.patch('/:id/status',
  authentication,
  checkPermission(PERMISSIONS.USER_MANAGE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.toggleUserStatus(req, res);
  }
);

// DELETE /api/users/:id — delete user (admin)
userRouter.delete('/:id',
  authentication,
  checkPermission(PERMISSIONS.USER_DELETE),
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await UserController.deleteUser(req, res);
  }
);

export default userRouter;
