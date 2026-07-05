import express from 'express';
import { PermissionController } from './permission.controller';
import authentication from '@middlewares/authentication';
import { validate } from '@utils/validator';
import { rbacValidation } from '@utils/validator';

const permissionRouter = express.Router();

permissionRouter.get('/', authentication, PermissionController.getAllPermissions);

permissionRouter.get('/:id', authentication, PermissionController.getPermissionById);

permissionRouter.post('/', authentication, validate(rbacValidation.createPermission), PermissionController.createPermission);

permissionRouter.put('/:id', authentication, validate(rbacValidation.updatePermission), PermissionController.updatePermission);

permissionRouter.delete('/:id', authentication, PermissionController.deletePermission);

permissionRouter.post('/seed', authentication, PermissionController.seedPermissions);

export default permissionRouter;
