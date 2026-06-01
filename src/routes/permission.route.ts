import express from 'express';
import { PermissionController } from '../controllers/permission.controller';
import authentication from '../middlewares/authentication';
import { validate } from '../utils/validator';
import { rbacValidation } from '../utils/validator';

const permissionRouter = express.Router();

// Get all permissions
permissionRouter.get('/', authentication, PermissionController.getAllPermissions);

// Get permission by ID
permissionRouter.get('/:id', authentication, PermissionController.getPermissionById);

// Create new permission
permissionRouter.post('/', authentication, validate(rbacValidation.createPermission), PermissionController.createPermission);

// Update permission
permissionRouter.put('/:id', authentication, validate(rbacValidation.updatePermission), PermissionController.updatePermission);

// Delete permission
permissionRouter.delete('/:id', authentication, PermissionController.deletePermission);

// Seed default permissions
permissionRouter.post('/seed', authentication, PermissionController.seedPermissions);

export default permissionRouter;