import { Router } from 'express';
import * as queueController from '../controllers/queue.controller';
import { checkPermission } from '../middlewares/permission.middleware';
import { PERMISSIONS } from '../config/rbac.config';

const router = Router();

router.post('/check-in', checkPermission(PERMISSIONS.QUEUE_CHECK_IN), queueController.checkIn);
router.get('/list', checkPermission(PERMISSIONS.QUEUE_VIEW), queueController.getQueue);
router.post('/call-next', checkPermission(PERMISSIONS.QUEUE_CALL_NEXT), queueController.callNext);
router.patch('/:queueId/priority', checkPermission(PERMISSIONS.QUEUE_UPDATE_PRIORITY), queueController.updatePriority);
router.get('/analytics', checkPermission(PERMISSIONS.QUEUE_ANALYTICS), queueController.getAnalytics);

export default router;
