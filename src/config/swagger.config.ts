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
        url: 'https://hms-api.fly.dev/api/v1',
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
  apis: [
    './src/docs/swagger.yaml',
    './src/modules/auth/*.docs.yaml',
    './src/modules/users/*.docs.yaml',
    './src/modules/patients/*.docs.yaml',
    './src/modules/doctors/*.docs.yaml',
    './src/modules/hospital/*.docs.yaml',
    './src/modules/appointments/*.docs.yaml',
    './src/modules/triage/*.docs.yaml',
    './src/modules/laboratory/*.docs.yaml',
    './src/modules/billing/*.docs.yaml',
    './src/modules/clinical/*.docs.yaml',
    './src/modules/queue/*.docs.yaml',
    './src/modules/ambulance/*.docs.yaml',
    './src/modules/files/*.docs.yaml',
    './src/modules/reports/*.docs.yaml',
    './src/modules/notifications/*.docs.yaml',
    './src/modules/audit/*.docs.yaml',
    './src/modules/fhir/*.docs.yaml',
    './src/modules/faq/*.docs.yaml',
    './src/modules/mobile/*.docs.yaml',
    './src/modules/rbac/*.docs.yaml',
    './src/modules/health/*.docs.yaml',
    './src/modules/visitors/*.docs.yaml',
  ]
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hospital Management API'
};

export { swaggerUi };