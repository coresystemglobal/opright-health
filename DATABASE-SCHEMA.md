# Database Schema (ERD)

73 tables, grouped by domain. Nearly every table has `tenant_id` → **tenants** (omitted from per-domain diagrams to reduce noise; shown in the hub map). PK is `id` (UUID) everywhere; `created_at`/`updated_at`/`deleted_at` (paranoid soft-delete) are omitted. Derived from `src/modules/**/**.model.ts`.

## Top-level hub map

Everything hangs off four hubs: **tenants** (the hospital), **users** (accounts), **patients** (tenant-scoped clinical record), and **persons** (global cross-tenant identity).

```mermaid
erDiagram
  TENANTS  ||--o{ USERS       : "owns"
  TENANTS  ||--o{ PATIENTS    : "owns"
  TENANTS  ||--o{ EVERYTHING  : "tenant_id on ~all tables"
  USERS    ||--o| PATIENTS    : "user_id (nullable)"
  USERS    ||--o| DOCTORS     : "user_id"
  PERSONS  ||--o{ PATIENTS    : "person_id (MPI link, nullable)"
  PERSONS  ||--o| PERSONS     : "merged_into_id (self)"
  ROLES    ||--o{ USERS       : "role_id"
  PATIENTS ||--o{ EMR_BILLING_ETC : "patient_id across departments"
```

## 1. Identity & Tenancy

```mermaid
erDiagram
  TENANTS ||--o{ USERS : tenant_id
  TENANTS ||--o{ PATIENTS : tenant_id
  USERS ||--o| PATIENTS : user_id
  PERSONS ||--o{ PATIENTS : person_id
  PERSONS ||--o| PERSONS : merged_into_id
  ROLES ||--o{ ROLE_PERMISSIONS : role_id
  PERMISSIONS ||--o{ ROLE_PERMISSIONS : permission_id
  ROLES ||--o{ USERS : role_id

  TENANTS { uuid id string name string subdomain enum status }
  USERS { uuid id string email enum role uuid tenant_id uuid role_id }
  PERSONS { uuid id string national_id string verified_email enum status uuid merged_into_id }
  PATIENTS { uuid id string mrn string first_name date dob uuid tenant_id uuid user_id uuid person_id }
  ROLES { uuid id string name }
  PERMISSIONS { uuid id string name }
  ROLE_PERMISSIONS { uuid id uuid role_id uuid permission_id }
```

`mrn` is unique per `(tenant_id, mrn)`. `persons` is the only non-tenant-scoped table.

## 2. Clinical / EMR

```mermaid
erDiagram
  PATIENTS ||--o{ ALLERGIES : patient_id
  PATIENTS ||--o{ MEDICATIONS : patient_id
  PATIENTS ||--o{ VITAL_SIGNS : patient_id
  PATIENTS ||--o{ CLINICAL_NOTES : patient_id
  PATIENTS ||--o{ MEDICAL_RECORDS : patient_id
  PATIENTS ||--o{ PRESCRIPTIONS : patient_id
  DOCTORS ||--o{ PRESCRIPTIONS : doctor_id
  PRESCRIPTIONS ||--o{ PRESCRIPTION_ITEMS : prescription_id
  PHARMACY_ITEMS ||--o{ PRESCRIPTION_ITEMS : pharmacy_item_id
  PATIENTS ||--o{ TEST_ORDERS : patient_id
  LAB_TESTS ||--o{ TEST_ORDERS : lab_test_id
  TEST_ORDERS ||--o{ TEST_RESULTS : test_order_id

  PRESCRIPTIONS { uuid id string prescription_number enum status uuid patient_id uuid doctor_id }
  PRESCRIPTION_ITEMS { uuid id string medication_name int quantity int dispensed_quantity bool is_dispensed }
  CLINICAL_NOTES { uuid id enum note_type text content_encrypted uuid patient_id }
  TEST_ORDERS { uuid id enum status uuid patient_id uuid lab_test_id }
```

Encrypted columns (AES-256-GCM): clinical note content/diagnosis, prescription text, appointment diagnosis/treatment, patient contact PII.

## 3. Appointments / Scheduling / Queue / Triage

```mermaid
erDiagram
  PATIENTS ||--o{ APPOINTMENTS : patient_id
  DOCTORS ||--o{ APPOINTMENTS : doctor_id
  PATIENTS ||--o{ APPOINTMENT_WAITLIST : patient_id
  DOCTORS ||--o{ APPOINTMENT_WAITLIST : doctor_id
  PATIENTS ||--o{ QUEUES : patient_id
  USERS ||--o{ TRIAGE_SESSIONS : user_id
  TRIAGE_SESSIONS ||--o{ TRIAGE_ANSWERS : session_id
  TRIAGE_QUESTIONS ||--o{ TRIAGE_ANSWERS : question_id
  TRIAGE_SESSIONS ||--o{ TRIAGE_RESULTS : session_id
  TRIAGE_SESSIONS ||--o{ TRIAGE_AUDIT_LOGS : session_id

  APPOINTMENTS { uuid id date appointment_date enum status enum type uuid patient_id uuid doctor_id }
  APPOINTMENT_WAITLIST { uuid id enum status uuid patient_id uuid doctor_id }
  TRIAGE_SESSIONS { uuid id enum status uuid user_id uuid tenant_id }
```

Triage runs with only `authentication` (no `tenantMiddleware`) — usable without a hospital context.

## 4. Billing / Insurance

```mermaid
erDiagram
  PATIENTS ||--o{ INVOICES : patient_id
  DOCTORS ||--o{ INVOICES : doctor_id
  INVOICES ||--o{ PAYMENTS : invoice_id
  TENANTS ||--o{ SUBSCRIPTIONS : tenant_id
  TENANTS ||--o{ USAGE_TRACKING : tenant_id
  PATIENTS ||--o{ PATIENT_INSURANCE_POLICIES : patient_id
  INSURANCE_PROVIDERS ||--o{ PATIENT_INSURANCE_POLICIES : insurance_provider_id
  PATIENTS ||--o{ INSURANCE_CLAIMS : patient_id
  INSURANCE_PROVIDERS ||--o{ INSURANCE_CLAIMS : insurance_provider_id
  PATIENT_INSURANCE_POLICIES ||--o{ INSURANCE_CLAIMS : policy_id
  INVOICES ||--o| INSURANCE_CLAIMS : invoice_id

  INVOICES { uuid id enum status decimal total uuid patient_id }
  PAYMENTS { uuid id enum method enum status decimal amount uuid invoice_id }
  INSURANCE_CLAIMS { uuid id enum status enum claim_type decimal claimed_amount decimal approved_amount }
```

## 5. Pharmacy / Supplies / Inventory

```mermaid
erDiagram
  PHARMACY_ITEMS ||--o{ STOCK_BATCHES : pharmacy_item_id
  PHARMACY_ITEMS ||--o{ STOCK_MOVEMENTS : pharmacy_item_id
  STOCK_BATCHES ||--o{ STOCK_MOVEMENTS : batch_id
  SUPPLY_ITEMS ||--o{ SUPPLY_MOVEMENTS : supply_item_id
  DEPARTMENTS ||--o{ SUPPLY_MOVEMENTS : department_id
  DEPARTMENTS ||--o{ EQUIPMENT : department_id

  PHARMACY_ITEMS { uuid id string name string sku int reorder_level }
  STOCK_BATCHES { uuid id int quantity decimal cost_price date expiry }
  STOCK_MOVEMENTS { uuid id enum movement_type int quantity int balance_after }
  SUPPLY_ITEMS { uuid id string name string sku int on_hand }
  EQUIPMENT { uuid id string name enum status enum category }
```

## 6. Wards / Beds / Admissions

```mermaid
erDiagram
  HOSPITALS ||--o{ WARDS : hospital_id
  DEPARTMENTS ||--o{ WARDS : department_id
  WARDS ||--o{ BEDS : ward_id
  PATIENTS ||--o{ ADMISSIONS : patient_id
  WARDS ||--o{ ADMISSIONS : ward_id
  BEDS ||--o{ ADMISSIONS : bed_id
  DOCTORS ||--o{ ADMISSIONS : admitting_doctor_id

  WARDS { uuid id string name enum ward_type enum gender_restriction }
  BEDS { uuid id string label enum bed_type enum status uuid ward_id }
  ADMISSIONS { uuid id enum status uuid patient_id uuid ward_id uuid bed_id }
```

## 7. Staff / HR

```mermaid
erDiagram
  USERS ||--o| STAFF_PROFILES : user_id
  DEPARTMENTS ||--o{ STAFF_PROFILES : department_id
  STAFF_PROFILES ||--o{ STAFF_SHIFTS : staff_id
  STAFF_PROFILES ||--o{ STAFF_LEAVE_REQUESTS : staff_id
  STAFF_PROFILES ||--o{ STAFF_ATTENDANCE : staff_id
  STAFF_PROFILES ||--o{ STAFF_PERFORMANCE_REVIEWS : staff_id
  USERS ||--o{ DOCTORS : user_id
  DOCTORS ||--o{ DOCTOR_REVIEWS : doctor_id
  DEPARTMENTS ||--o{ DEPARTMENT_STAFF : department_id
  USERS ||--o{ DEPARTMENT_STAFF : user_id

  STAFF_PROFILES { uuid id string employee_no string job_title enum employment_status date hire_date }
  STAFF_SHIFTS { uuid id enum shift_type bool is_on_call datetime starts_at }
  STAFF_LEAVE_REQUESTS { uuid id enum leave_type enum status int days }
  STAFF_PERFORMANCE_REVIEWS { uuid id enum review_type enum status int overall_rating }
```

## 8. IoT / Telemedicine

```mermaid
erDiagram
  IOT_DEVICES ||--o{ IOT_DEVICE_READINGS : device_id
  PATIENTS ||--o| IOT_DEVICES : assigned_patient_id
  PATIENTS ||--o{ IOT_DEVICE_READINGS : patient_id
  APPOINTMENTS ||--o| TELEMEDICINE_SESSIONS : appointment_id
  DOCTORS ||--o{ TELEMEDICINE_SESSIONS : doctor_id
  PATIENTS ||--o{ TELEMEDICINE_SESSIONS : patient_id

  IOT_DEVICES { uuid id string external_device_id enum device_type enum status jsonb thresholds }
  IOT_DEVICE_READINGS { uuid id jsonb metrics jsonb alerts bool is_abnormal datetime recorded_at }
  TELEMEDICINE_SESSIONS { uuid id enum provider enum status string room_name int duration_minutes }
```

## 9. Reports / Audit / Compliance

```mermaid
erDiagram
  TENANTS ||--o{ REPORT_SCHEDULES : tenant_id
  TENANTS ||--o{ AUDIT_LOGS : tenant_id
  USERS ||--o{ AUDIT_LOGS : user_id
  PATIENTS ||--o{ CONSENT_RECORDS : patient_id
  CONSENT_RECORDS ||--o{ CONSENT_SIGNATURES : consent_record_id
  PATIENTS ||--o{ DATA_SUBJECT_REQUESTS : patient_id

  REPORT_SCHEDULES { uuid id enum report_type enum format enum frequency datetime next_run_at }
  AUDIT_LOGS { uuid id enum action string resource uuid resource_id }
  CONSENT_RECORDS { uuid id enum consent_type bool granted date withdrawn_at }
  DATA_SUBJECT_REQUESTS { uuid id enum request_type enum status }
```

## 10. Notifications / Files / System

```mermaid
erDiagram
  USERS ||--o{ NOTIFICATIONS : user_id
  USERS ||--o{ NOTIFICATION_PREFERENCES : user_id
  USERS ||--o{ PUSH_SUBSCRIPTIONS : user_id
  USERS ||--o{ FAMILY_MEMBERS : user_id
  TENANTS ||--o{ FILES : tenant_id
  TENANTS ||--o{ FAQS : tenant_id
  TENANTS ||--o{ VISITOR_LOGS : tenant_id
  PATIENTS ||--o{ VISITOR_LOGS : patient_id
  PATIENTS ||--o{ AMBULANCE_REQUESTS : patient_id
  AMBULANCES ||--o{ AMBULANCE_REQUESTS : ambulance_id

  NOTIFICATIONS { uuid id enum type enum channel bool read }
  FILES { uuid id string name enum file_type string url }
  VISITOR_LOGS { uuid id enum status enum purpose datetime check_in }
```

## Planned (MPI Phase 2)

Not yet in the DB — shown so the direction is visible:

```mermaid
erDiagram
  PERSONS ||--o{ PATIENT_RECORD_SHARES : person_id
  TENANTS ||--o{ PATIENT_RECORD_SHARES : "source + recipient"
  CONSENT_SIGNATURES ||--o| PATIENT_RECORD_SHARES : consent_signature_id
  PATIENT_RECORD_SHARES { uuid id uuid person_id uuid source_tenant_id uuid recipient_tenant_id enum scope enum status date expires_at }
```
