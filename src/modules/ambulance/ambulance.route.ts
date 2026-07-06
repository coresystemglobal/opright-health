import { Router } from 'express';
import * as ambulanceController from './ambulance.controller';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';

const router = Router();

router.post('/request', ambulanceController.requestAmbulance);

router.post('/dispatch', checkPermission(PERMISSIONS.QUEUE_UPDATE_PRIORITY), ambulanceController.dispatchAmbulance);

router.patch('/:requestId/status', ambulanceController.updateStatus);

router.get('/active', checkPermission(PERMISSIONS.QUEUE_VIEW), ambulanceController.getActiveRequests);

router.get('/available', checkPermission(PERMISSIONS.QUEUE_VIEW), ambulanceController.getAvailableAmbulances);

export default router;
