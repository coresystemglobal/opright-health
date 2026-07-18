# System Architecture

Multi-tenant hospital-management backend — Node.js / Express / TypeScript / Sequelize / PostgreSQL. Each **Tenant** is a hospital/clinic; almost every table is tenant-scoped. Diagrams are [Mermaid](https://mermaid.js.org) and render on GitHub.

## Runtime architecture

```mermaid
flowchart TB
  subgraph Clients
    WEB[Web app]
    MOB[Mobile app]
    PORTAL[Patient portal]
    DEV[IoT / medical devices]
  end

  subgraph Edge["Express edge middleware (core/index.ts)"]
    HELMET[helmet + CORS]
    BODY["express.json (raw body captured for webhook signatures)"]
    RL[Rate limiters: auth / payment / api / general]
    IDEM[Idempotency replay guard]
  end

  subgraph API["API layer — /api/v1 (router.ts)"]
    AUTHMW[authentication - JWT]
    TENANT[tenantMiddleware - x-tenant-id]
    RBAC[checkPermission - RBAC]
    VALID[validate - Joi]
    BILL[subscription / resource-limit guards]
    ROUTERS[Feature routers: patients, appointments, billing, pharmacy, wards, staff, reports, mpi, telemedicine, iot, ...]
  end

  subgraph Services["Service layer (business logic)"]
    SVC[Domain services]
    ENC[EncryptionUtil - AES-256-GCM field encryption]
  end

  subgraph Data
    ORM[Sequelize models - 73 tables]
    PG[(PostgreSQL)]
  end

  subgraph Realtime
    IO[Socket.IO - NotificationService]
  end

  subgraph Cron["Scheduled jobs (core/index.ts)"]
    DUN[Dunning - daily 08:00]
    REM[Appointment reminders - every 30 min]
    RPT[Report scheduler - hourly]
  end

  subgraph External["External providers"]
    PAY[Paystack / Stripe / Flutterwave]
    MAIL[Nodemailer email]
    SMS[SMS gateway]
    PUSH[FCM + VAPID web-push]
  end

  WEB & MOB & PORTAL --> HELMET
  DEV --> HELMET
  HELMET --> BODY --> RL --> IDEM --> AUTHMW
  AUTHMW --> TENANT --> RBAC --> VALID --> BILL --> ROUTERS
  ROUTERS --> SVC
  SVC --> ENC --> ORM
  SVC --> ORM
  ORM --> PG
  SVC --> IO
  IO -.push.-> WEB & MOB
  SVC --> MAIL & SMS & PUSH
  PAY -.signed webhook.-> BODY
  Cron --> SVC
```

## Layer responsibilities

| Layer | Responsibility | Key files |
|---|---|---|
| Edge | TLS headers, CORS, rate limiting, raw-body capture (webhook signatures), idempotency | `src/core/index.ts`, `src/middlewares/rate-limiter.middleware.ts`, `idempotency.middleware.ts` |
| Auth | JWT verification, attaches `req.user` | `src/middlewares/authentication.ts` |
| Tenant | Resolves `req.tenant` from `x-tenant-id`; **rejects requests with no tenant (400)** | `src/middlewares/tenant.middleware.ts` |
| RBAC | Role→permission gate per route | `src/middlewares/permission.middleware.ts`, `src/config/rbac.config.ts` |
| Validation | Joi schemas per endpoint | `src/utils/validators/*` |
| Services | Business logic, transactions, tenant scoping | `src/modules/**/**.service.ts` |
| Encryption | Transparent AES-256-GCM getters/setters on sensitive PII/medical columns | `src/utils/encryption.util.ts` |
| Data | Sequelize models → Postgres (paranoid soft-delete, `underscored`) | `src/modules/**/**.model.ts`, `src/models/index.ts` |

## Cross-cutting concerns

- **Multi-tenancy** — `tenant_id` on nearly every table; services filter by it. The tenant is the hospital.
- **MPI / global identity** — a global `Person` sits above tenant-scoped `Patient` rows (`patient.person_id`) so one human is recognizable across hospitals. Cross-tenant clinical reads are consent-gated (planned Phase 2), never implicit.
- **Encryption at rest** — medical/sensitive fields (diagnosis, notes, patient contact PII) are encrypted; basic identifiers stay plaintext for search.
- **Audit** — `audit_logs` records privileged actions; compliance module adds consent + NDPR/GDPR data-subject requests.
