import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      version: '1.0.0',
      description: 'Comprehensive hospital management system with multi-tenancy, RBAC, and file management',
      contact: {
        name: 'API Support',
        email: 'support@hospital-system.com'
      }
    },
    servers: [
      {
        url: 'https://hospital-management-system-faithful-smoke-2949.fly.dev/api/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Validation error' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/docs/swagger.yaml', './src/modules/**/*.route.ts', './src/modules/**/*.controller.ts']
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hospital Management API'
};

export { swaggerUi };