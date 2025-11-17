import express from 'express';
import { specs, swaggerUi, swaggerUiOptions } from '../config/swagger.config';

const docsRouter = express.Router();

/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: Interactive API documentation using Swagger UI
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: API documentation page
 */
docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(specs, swaggerUiOptions));

export default docsRouter;