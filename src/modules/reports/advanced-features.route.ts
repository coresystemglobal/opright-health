import express from 'express';
import { AdvancedFeaturesController } from './advanced-features.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { requireFeature } from '@middlewares/billing.middleware';

const advancedRouter = express.Router();

// Analytics endpoints
/**
 * @swagger
 * /api/advanced/analytics:
 *   get:
 *     summary: Get advanced analytics
 *     tags: [Advanced Features]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
advancedRouter.get('/analytics',
  tenantMiddleware,
  authentication,
  requireFeature('advanced_analytics'),
  AdvancedFeaturesController.getAnalytics
);

advancedRouter.get('/metrics/realtime',
  tenantMiddleware,
  authentication,
  AdvancedFeaturesController.getRealtimeMetrics
);

// ML Prediction endpoints
advancedRouter.get('/predictions/patient-risk/:patientId',
  tenantMiddleware,
  authentication,
  requireFeature('ml_predictions'),
  AdvancedFeaturesController.predictPatientRisk
);

advancedRouter.get('/predictions/no-show/:appointmentId',
  tenantMiddleware,
  authentication,
  requireFeature('ml_predictions'),
  AdvancedFeaturesController.predictNoShow
);

// IoT Device endpoints
advancedRouter.get('/iot/devices/:deviceId/readings',
  tenantMiddleware,
  authentication,
  requireFeature('iot_integration'),
  AdvancedFeaturesController.getDeviceReadings
);

advancedRouter.get('/iot/patients/:patientId/vitals',
  tenantMiddleware,
  authentication,
  AdvancedFeaturesController.getPatientVitals
);

// Workflow endpoints
advancedRouter.get('/workflows/rules',
  tenantMiddleware,
  authentication,
  requireFeature('workflow_automation'),
  AdvancedFeaturesController.getWorkflowRules
);

// Telemedicine endpoints
/**
 * @swagger
 * /api/advanced/telemedicine/sessions:
 *   post:
 *     summary: Create video session
 *     tags: [Telemedicine]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appointmentId:
 *                 type: string
 *               doctorId:
 *                 type: string
 *               patientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Video session created successfully
 */
advancedRouter.post('/telemedicine/sessions',
  tenantMiddleware,
  authentication,
  requireFeature('telemedicine'),
  AdvancedFeaturesController.createVideoSession
);

advancedRouter.post('/telemedicine/sessions/:sessionId/start',
  tenantMiddleware,
  authentication,
  requireFeature('telemedicine'),
  AdvancedFeaturesController.startVideoSession
);

advancedRouter.post('/telemedicine/sessions/:sessionId/chat',
  tenantMiddleware,
  authentication,
  requireFeature('telemedicine'),
  AdvancedFeaturesController.sendChatMessage
);

export default advancedRouter;