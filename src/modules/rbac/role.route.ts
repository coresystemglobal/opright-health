import express from 'express';
import { RoleController } from './role.controller';
import authentication from '@middlewares/authentication';
import { validate } from '@utils/validator';
import { rbacValidation } from '@utils/validator';

const roleRouter = express.Router();

// Get all roles
roleRouter.get('/', authentication, RoleController.getAllRoles);

// Get role by ID
roleRouter.get('/:id', authentication, RoleController.getRoleById);

// Create new role
roleRouter.post('/', authentication, validate(rbacValidation.createRole), RoleController.createRole);

// Assign permissions to role
roleRouter.post('/:id/permissions', authentication, validate(rbacValidation.assignPermissions), RoleController.assignPermissions);

// Assign role to user
roleRouter.post('/assign', authentication, validate(rbacValidation.assignRoleToUser), RoleController.assignRoleToUser);

// Remove permissions from role
roleRouter.delete('/:id/permissions', authentication, validate(rbacValidation.assignPermissions), RoleController.removePermissions);

// Get role permissions
roleRouter.get('/:id/permissions', authentication, RoleController.getRolePermissions);

// Get users by role
roleRouter.get('/:id/users', authentication, RoleController.getUsersByRole);

// Seed default roles
roleRouter.post('/seed', authentication, RoleController.seedRoles);

export default roleRouter;