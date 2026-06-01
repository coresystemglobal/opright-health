# MediCore HMS — Backend API

The core backend service for the MediCore Hospital Management System. Powers all clinical, operational, and administrative features across the platform.

**Role in the monorepo:**
- `hms/` → **This repo** — Express REST API (api.yourapp.com)
- `Health-bridge/` → Hospital web app (app.yourapp.com)
- `healthbridge/` → Public landing page (yourapp.com)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Language | TypeScript 5 |
| Database | PostgreSQL + Sequelize ORM |
| Cache | Redis (ioredis) |
| Message Queue | RabbitMQ (amqplib) |
| Real-time | Socket.IO |
| Auth | JWT + bcrypt |
| Payments | Stripe, Paystack, Flutterwave |
| File Storage | Backblaze B2 (S3-compatible) |
| Email | Nodemailer + Brevo SMTP |
| API Docs | Swagger / OpenAPI |
| Tests | Jest + Supertest |
| Security | Helmet, express-rate-limit, XSS sanitizer |

---

## Feature Modules

### Clinical
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Patients | `GET POST PUT DELETE /api/patients` | Patient profiles, MRN generation, medical history |
| Doctors | `GET POST PUT DELETE /api/doctors` | Doctor profiles, specializations, availability |
| Appointments | `GET POST PUT DELETE /api/appointments` | Scheduling, waitlist, conflict detection, time slots |
| Triage | `POST /api/triage/start` `POST /api/triage/answer` `GET /api/triage/result/:id` | Adaptive symptom checker — rule engine scores answers to produce low/moderate/urgent/emergency risk levels with clinical recommendations |
| Laboratory | `GET POST PUT DELETE /api/laboratory` | Test catalog, orders, results, Quest/LabCorp integration |
| Medications | `GET POST PUT DELETE /api/medications` | Prescriptions, dosage, frequency, route, active tracking |
| Allergies | via EMR | Allergen type, severity, reactions |
| Vital Signs | via EMR | BP, pulse, temperature, SpO2, weight tracking |
| Clinical Notes | via EMR | SOAP notes, follow-up, discharge notes |
| Medical Records | via EMR | Structured patient history |
| ICD-10 Codes | via service | Diagnosis code lookup |
| FHIR R4 | `GET POST /api/fhir` | Patient and Appointment resources, bidirectional conversion |
| Telemedicine | via service | Video sessions, in-session chat, prescription issuance |
| Family Members | `GET POST PUT DELETE /api/family` | Per-patient family health tracking |
| Doctor Reviews | `GET POST DELETE /api/reviews` | Patient ratings, aggregate avg, one review per doctor per user |

### Operations
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Queue | `GET POST PATCH /api/queue` | Patient check-in, call-next, priority, analytics |
| Ambulance | `GET POST PATCH /api/ambulance` | Dispatch, fleet tracking, status lifecycle |
| Departments | `GET POST PUT DELETE /api/departments` | Dept management, staff assignment, bed tracking |
| Hospitals | `GET POST PUT DELETE /api/hospitals` | Facility management, accreditation, status |

### Business
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Invoices | `GET POST PUT DELETE /api/invoices` | Invoice generation, line items, status tracking |
| Payments | `GET POST /api/payments` | Stripe, Paystack, Flutterwave — initiate, verify, refund, webhooks |
| Billing | `GET POST /api/billing` | 4-tier subscription plans, usage tracking, feature gating |
| Dashboard | `GET /api/dashboard` | KPI metrics, summary statistics |
| Reports | `GET POST /api/reports` | 9 report types, custom builder, PDF/CSV/Excel export |
| Advanced Analytics | `GET /api/advanced` | ML predictions (no-show, risk score), IoT device data, trend analysis |
| Workflow Automation | via service | 5 trigger types × 6 action types, delayed scheduling |

### Platform
| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `POST /auth/login` `POST /auth/register` `POST /auth/refresh` etc. | JWT access + refresh tokens, email verification, password reset |
| Users | `GET POST PUT DELETE /api/users` | User CRUD, role assignment, status toggle |
| Roles | `GET POST PUT DELETE /api/roles` | Role management |
| Permissions | `GET POST PUT DELETE /api/permissions` | Granular permission management |
| Files | `GET POST DELETE /api/files` | Multi-tenant cloud file storage (Backblaze B2) |
| Audit Logs | `GET /api/audit` | All system events — CREATE/UPDATE/DELETE/LOGIN/LOGOUT/ACCESS/EXPORT |
| Notifications | `GET /api/notifications` | Real-time via Socket.IO, 5 notification types |
| Mobile API | `GET /api/mobile` | Patient-optimised compact endpoints for future mobile app |
| FAQs | `GET POST PUT DELETE /api/faqs` | Public + private FAQ management |
| Insurance | via service | Clearinghouse integration, NPI, coverage verification |
| Health Checks | `GET /health` `GET /ready` `GET /live` | Kubernetes-ready probes |
| API Docs | `GET /api-docs` | Swagger UI |

### Subscription Plans (Billing Tiers)
| Plan | Price | Patients | Users | Storage |
|------|-------|----------|-------|---------|
| Individual | $49/mo | 50 | 1 | 512MB |
| Basic | $99/mo | 100 | 5 | 1GB |
| Standard | $299/mo | 500 | 20 | 5GB |
| Pro | $599/mo | Unlimited | Unlimited | 20GB |

### RBAC — 8 Roles
`super_admin` · `admin` · `doctor` · `nurse` · `receptionist` · `lab_technician` · `billing_staff` · `patient`

---

## Database

**39 migrations · 35 models**

Core entities: User, Patient, Doctor, Hospital, Tenant, Appointment, AppointmentWaitlist

Clinical: Allergy, Medication, VitalSign, ClinicalNote, MedicalRecord, ICD10Code, LabTest, TestOrder, TestResult, DoctorReview, FamilyMember

Triage: TriageSession, TriageQuestion, TriageRule, TriageAnswer, TriageResult, TriageAuditLog

Operations: Queue, Ambulance, AmbulanceRequest, Department, DepartmentStaff, Resource

Business: Invoice, Payment, Subscription, UsageTracking, FAQ, File, AuditLog, Role, Permission, RolePermission

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis
- RabbitMQ

### Install & Run

```bash
cd hms
npm install

# Copy and fill in environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Seed triage data (questions + rules)
npm run seed

# Start development server
npm run dev
```

### Run Tests

```bash
npm test              # all tests
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
```

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hms_db
DB_USER=postgres
DB_PASSWORD=yourpassword

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# Email (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_login
SMTP_PASS=your_brevo_key

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYSTACK_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...

# File Storage (Backblaze B2)
B2_KEY_ID=your_key_id
B2_APPLICATION_KEY=your_app_key
B2_BUCKET_NAME=your_bucket
```

---

## API Documentation

Swagger UI available at `http://localhost:3000/api-docs` when running locally.

---

## Multi-Tenancy

Every hospital is a tenant. All patient/clinical data is isolated by `tenant_id`. The tenant context is injected via the `X-Tenant-ID` request header or the `tenantMiddleware`. CORS is configured to allow `yourapp.com` and `app.yourapp.com`.
