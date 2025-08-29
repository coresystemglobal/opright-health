import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital Management System API',
      version: '1.0.0',
      description: 'A comprehensive hospital management system API with patient registration, appointment scheduling, billing, and reporting capabilities.',
      contact: {
        name: 'API Support',
        email: 'support@hospital-management.com'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.hospital-management.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['first_name', 'last_name', 'email', 'password', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            first_name: {
              type: 'string',
              description: 'User first name',
              example: 'John'
            },
            last_name: {
              type: 'string',
              description: 'User last name',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john.doe@example.com'
            },
            username: {
              type: 'string',
              description: 'Unique username',
              example: 'johndoe'
            },
            role: {
              type: 'string',
              enum: ['patient', 'admin', 'staff', 'doctor'],
              description: 'User role'
            },
            phone: {
              type: 'string',
              description: 'Phone number',
              example: '+1234567890'
            },
            verified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            is_active: {
              type: 'boolean',
              description: 'Account active status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Patient: {
          type: 'object',
          required: ['mrn', 'first_name', 'last_name', 'date_of_birth'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            mrn: {
              type: 'string',
              description: 'Medical Record Number',
              example: 'MRN12345'
            },
            first_name: {
              type: 'string',
              description: 'Patient first name',
              example: 'Jane'
            },
            last_name: {
              type: 'string',
              description: 'Patient last name',
              example: 'Smith'
            },
            date_of_birth: {
              type: 'string',
              format: 'date',
              description: 'Date of birth',
              example: '1985-06-15'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              description: 'Patient gender'
            },
            phone: {
              type: 'string',
              description: 'Phone number',
              example: '+1234567890'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
              example: 'jane.smith@example.com'
            },
            address: {
              type: 'string',
              description: 'Home address'
            },
            emergency_contact_name: {
              type: 'string',
              description: 'Emergency contact name'
            },
            emergency_contact_phone: {
              type: 'string',
              description: 'Emergency contact phone'
            }
          }
        },
        Doctor: {
          type: 'object',
          required: ['user_id', 'specialization', 'license_number'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'Associated user ID'
            },
            specialization: {
              type: 'string',
              description: 'Medical specialization',
              example: 'Cardiology'
            },
            license_number: {
              type: 'string',
              description: 'Medical license number',
              example: 'MD123456'
            },
            experience_years: {
              type: 'integer',
              description: 'Years of experience',
              example: 10
            },
            qualification: {
              type: 'string',
              description: 'Medical qualifications',
              example: 'MD, FACC'
            },
            consultation_fee: {
              type: 'number',
              format: 'decimal',
              description: 'Consultation fee amount',
              example: 150.00
            },
            working_hours: {
              type: 'object',
              description: 'Working schedule'
            },
            is_available: {
              type: 'boolean',
              description: 'Current availability status'
            }
          }
        },
        Appointment: {
          type: 'object',
          required: ['patient_id', 'doctor_id', 'appointment_date', 'reason_for_visit'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            patient_id: {
              type: 'string',
              format: 'uuid',
              description: 'Patient ID'
            },
            doctor_id: {
              type: 'string',
              format: 'uuid',
              description: 'Doctor ID'
            },
            appointment_date: {
              type: 'string',
              format: 'date-time',
              description: 'Appointment date and time',
              example: '2024-01-15T10:00:00Z'
            },
            reason_for_visit: {
              type: 'string',
              description: 'Reason for appointment',
              example: 'Regular checkup'
            },
            notes: {
              type: 'string',
              description: 'Additional notes'
            },
            status: {
              type: 'string',
              enum: ['pending', 'scheduled', 'completed', 'cancelled', 'no_show'],
              description: 'Appointment status'
            },
            appointment_type: {
              type: 'string',
              enum: ['in-person', 'virtual', 'phone'],
              description: 'Type of appointment'
            }
          }
        },
        Invoice: {
          type: 'object',
          required: ['patient_id', 'total_amount', 'payment_status', 'due_date', 'items'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            patient_id: {
              type: 'string',
              format: 'uuid',
              description: 'Patient ID'
            },
            appointment_id: {
              type: 'string',
              format: 'uuid',
              description: 'Associated appointment ID'
            },
            invoice_number: {
              type: 'string',
              description: 'Invoice number',
              example: 'INV-2024-001'
            },
            invoice_date: {
              type: 'string',
              format: 'date',
              description: 'Invoice date'
            },
            due_date: {
              type: 'string',
              format: 'date',
              description: 'Payment due date'
            },
            total_amount: {
              type: 'number',
              format: 'decimal',
              description: 'Total invoice amount',
              example: 250.00
            },
            paid_amount: {
              type: 'number',
              format: 'decimal',
              description: 'Amount paid',
              example: 100.00
            },
            balance: {
              type: 'number',
              format: 'decimal',
              description: 'Remaining balance',
              example: 150.00
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
              description: 'Payment status'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'integer' },
                  unit_price: { type: 'number' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        },
        Payment: {
          type: 'object',
          required: ['invoice_id', 'amount', 'payment_method'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier'
            },
            invoice_id: {
              type: 'string',
              format: 'uuid',
              description: 'Associated invoice ID'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              description: 'Payment amount',
              example: 150.00
            },
            payment_method: {
              type: 'string',
              enum: ['stripe', 'paystack', 'flutterwave', 'cash', 'bank_transfer'],
              description: 'Payment method used'
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
              description: 'Payment status'
            },
            payment_date: {
              type: 'string',
              format: 'date-time',
              description: 'Payment timestamp'
            },
            transaction_id: {
              type: 'string',
              description: 'External transaction ID'
            },
            gateway_response: {
              type: 'object',
              description: 'Payment gateway response data'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            error: {
              type: 'string',
              description: 'Detailed error information'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {}
                },
                count: {
                  type: 'integer',
                  description: 'Total number of items'
                },
                page: {
                  type: 'integer',
                  description: 'Current page number'
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Patients',
        description: 'Patient registration and management'
      },
      {
        name: 'Doctors',
        description: 'Doctor profile and availability management'
      },
      {
        name: 'Appointments',
        description: 'Appointment scheduling and management'
      },
      {
        name: 'Invoices',
        description: 'Invoice generation and billing'
      },
      {
        name: 'Payments',
        description: 'Payment processing and records'
      },
      {
        name: 'Dashboard',
        description: 'System dashboard and analytics'
      },
      {
        name: 'Reports',
        description: 'Comprehensive reporting and analytics'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/modules/**/*.route.ts',
    './src/controllers/*.ts',
    './src/modules/**/*.controller.ts'
  ]
};

const specs = swaggerJSDoc(options);

export const setupSwagger = (app: Application): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Hospital Management API Documentation'
  }));

  // Serve the raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default specs;