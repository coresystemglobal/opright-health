# Database Data Flow

How a request travels through the layers and where **tenant isolation** and **global identity (MPI)** apply.

## 1. Standard tenant-scoped write (e.g. create a patient)

```mermaid
sequenceDiagram
  participant C as Client
  participant MW as Edge + Auth + Tenant + RBAC + Joi
  participant Ctrl as Controller
  participant Svc as Service
  participant DB as Postgres

  C->>MW: POST /api/v1/api/patients (JWT, x-tenant-id)
  MW->>MW: verify JWT → req.user
  MW->>MW: resolve tenant (400 if missing / inactive)
  MW->>MW: checkPermission(patient:create)
  MW->>MW: validate(body)
  MW->>Ctrl: req.user, req.tenant, body
  Ctrl->>Svc: createPatient({...body, tenant_id})
  Note over Svc: if national_id → resolve/create MPI Person first
  Svc->>DB: INSERT patient (tenant_id, person_id, mrn per-tenant)
  DB-->>Svc: row
  Svc-->>Ctrl: patient
  Ctrl-->>C: 201 + patient
```

Every domain read/write carries `tenant_id`; a query without it is a cross-tenant leak. Reads scope with `where: { tenant_id }`; the `(tenant_id, mrn)` unique index keeps MRNs hospital-local.

## 2. Cross-hospital identity (MPI)

The same human at two hospitals is two tenant-scoped `Patient` rows linked to one global `Person`.

```mermaid
flowchart LR
  subgraph TA["Tenant A — Graceful Hospital"]
    PA["Patient A<br/>id, mrn=PAT000123<br/>tenant_id=A"]
  end
  subgraph TB["Tenant B — Hilltop Medical"]
    PB["Patient B<br/>id, mrn=PAT000045<br/>tenant_id=B"]
  end
  subgraph MPI["Global (not tenant-scoped)"]
    PERSON["Person<br/>national_id (NIN)<br/>status, merged_into_id"]
  end
  PA -- person_id --> PERSON
  PB -- person_id --> PERSON

  DEPTS["All departments (lab, pharmacy,<br/>billing, appointments, wards)"] -. join on patient_id .-> PA
```

- Linking is **deterministic on exact NIN match** at create, or a manual tenant-checked `POST /api/patients/:id/link-person`. No fuzzy auto-merge.
- Departments always join on the tenant-local `patient_id` — MPI adds identity, it does not change intra-hospital joins.

## 3. Consent-gated cross-tenant read (planned — MPI Phase 2)

```mermaid
sequenceDiagram
  participant B as Recipient tenant (Hilltop)
  participant Svc as external-records service
  participant Grant as patient_record_shares
  participant A as Source tenant (Graceful) EMR
  participant Audit as audit_logs

  B->>Svc: GET /api/patients/:id/external-records
  Svc->>Svc: resolve patient.person_id
  Svc->>Grant: active grant? person_id, recipient=B, scope, not expired
  Grant-->>Svc: allowed scopes
  Svc->>A: read source Patient EMR limited to scope (read-only)
  A-->>Svc: allergies / meds / labs (per scope)
  Svc->>Audit: log access (who, what, which grant)
  Svc-->>B: scoped, read-only projection
```

This is the **only** sanctioned cross-tenant data path — dashed today, to be built in Phase 2. A companion hardening PR closes the remaining accidental cross-tenant `Patient.findByPk` lookups so nothing reads across tenants except through this gate.
