import express from 'express';
import { RoleController } from './role.controller';
import authentication from '@middlewares/authentication';
import { validate } from '@utils/validator';
import { rbacValidation } from '@utils/validator';

const roleRouter = express.Router();

roleRouter.get('/', authentication, RoleController.getAllRoles);

roleRouter.get('/:id', authentication, RoleController.getRoleById);

roleRouter.post('/', authentication, validate(rbacValidation.createRole), RoleController.createRole);

roleRouter.post('/:id/permissions', authentication, validate(rbacValidation.assignPermissions), RoleController.assignPermissions);

roleRouter.post('/assign', authentication, validate(rbacValidation.assignRoleToUser), RoleController.assignRoleToUser);

roleRouter.delete('/:id/permissions', authentication, validate(rbacValidation.assignPermissions), RoleController.removePermissions);

roleRouter.get('/:id/permissions', authentication, RoleController.getRolePermissions);

roleRouter.get('/:id/users', authentication, RoleController.getUsersByRole);

roleRouter.post('/seed', authentication, RoleController.seedRoles);

export default roleRouter;
