import express from 'express';
import { specs, swaggerUi, swaggerUiOptions } from '@config/swagger.config';

const docsRouter = express.Router();

docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(specs, swaggerUiOptions));

export default docsRouter;