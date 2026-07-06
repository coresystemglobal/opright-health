# HMS — Product TODO & Review List

> Status legend: 🔴 Not started · 🟡 Scaffolded / partial · 🟢 Done

---

## 1. Subscription Plans

**Decision needed: Feature-gated tiers vs flat all-inclusive**

| Approach | Pros | Cons |
|---|---|---|
| **Flat / all-inclusive** | Simple to sell, no feature disputes, easier support | Can't upsell; small clinics subsidise large hospitals |
| **Feature-gated tiers** | Natural upsell path, scalable revenue | More complex to build and maintain |

**Recommended:** Flat all-inclusive with **seat/capacity limits** per tier (not feature limits). Every subscriber gets every feature; tiers differ only by patient volume, user seats, and storage. This is how Epic, Veeva, and most modern SaaS HMS tools work — hospitals won't accept a crippled product.

### Suggested tiers

| Tier | Target | Patients | Users | Storage |
|---|---|---|---|---|
| **Starter** | Small clinics, solo practitioners | Up to 500 | Up to 5 | 10 GB |
| **Growth** | Mid-size hospitals | Up to 5,000 | Up to 50 | 100 GB |
| **Enterprise** | Large hospital networks | Unlimited | Unlimited | Unlimited |

### Tasks

- [x] 🟢 Define final tier names, limits, and pricing — `plan.config.ts` (env-configurable; INDIVIDUAL/BASIC/STANDARD/PRO)
- [x] 🟢 Plan limits per tier (patients/users/storage/API) in `plan.config.ts`; subscription model has grace-period + Paystack columns
- [x] 🟢 Enforcement middleware — `requireActiveSubscription` gates all `/api/*` routes for any request carrying x-tenant-id
- [x] 🟢 `checkResourceLimit` wired onto POST /api/patients (patient cap); user seats tracked on /auth/register with tenant header
- [x] 🟢 Flat all-inclusive enforced — every tier carries `all_features` in `plan.config.ts`; tiers differ only by capacity (patients/users/storage/API), per decision #1
- [ ] 🔴 Plan management admin API (create, edit, deactivate plans)
- [ ] 🔴 Self-service plan upgrade / downgrade (with proration)
- [x] 🟢 Free trial logic — TRIALING passes with `X-Trial-Days-Remaining` header; PAST_DUE honours grace period, then 402
- [ ] 🔴 Trial-to-paid conversion flow and notifications
- [ ] 🔴 Plan comparison page (for frontend)
- [ ] 🔴 Usage dashboard for tenants (seats used, patient count, storage consumed)

---

## 2. Payment Collection

Gateway integration implemented 2026-06-12 (`src/modules/billing/providers/`).

- [x] 🟢 `billing.service.ts` and `payment.service.ts` reviewed and wired to real providers
- [x] 🟢 Paystack primary gateway — initialize, verify, HMAC-SHA512 webhooks, refunds
- [x] 🟢 Stripe international fallback — Checkout Sessions, signed webhooks, refunds
- [x] 🟢 Flutterwave alternative gateway — initialize, verify, webhooks, refunds
- [x] 🟢 Webhook handlers for success / failure / refund events (raw-body signature verification)
- [ ] 🔴 Dispute/chargeback webhook events
- [x] 🟢 PDF invoice export — `pdf-invoice.service.ts` using PDFKit; Clinical Blue design; `GET /invoices/:id/pdf` download endpoint
- [ ] 🔴 Payment retry logic for failed recurring charges
- [x] 🟢 Dunning flow — `dunning.service.ts`: marks overdue, sends day-1/3/7/14 branded emails; idempotent per stage; cron fires at 08:00 daily
- [x] 🟢 Refund handling API (`POST /refund/:paymentId`, backed by all three providers)
- [x] 🟢 Automatic invoice generation on payment — `invoice-auto.service.ts` creates a linked invoice when none was supplied at initiation
- [x] 🟢 Payment receipt emails — `payment-email.service.ts` sends branded receipt after every verified payment
- [ ] 🟡 Multi-currency support — NGN via Paystack, USD/GBP/EUR via Stripe; needs per-invoice currency handling
- [ ] 🔴 VAT / tax calculation per region
- [ ] 🔴 Bulk payment collection for patient fees (outpatient, inpatient, lab, pharmacy)
- [ ] 🔴 Insurance co-pay collection flow
- [ ] 🔴 Payment history and statement download for tenants

---

## 3. Reporting

`reports.service.ts` has the data layer for demographics, doctor performance, and financials. What's missing:

- [x] 🟢 Patient demographics report — exposed at `GET /api/reports/patient-demographics`
- [x] 🟢 Doctor performance report — exposed at `GET /api/reports/doctor-performance`
- [x] 🟢 Financial summary report — exposed at `GET /api/reports/financial`
- [x] 🟢 **Export formats** — `GET /api/reports/export?reportType=…&format=csv|xlsx|pdf|json` via `report-export.service.ts` (PDFKit + ExcelJS, Clinical Blue PDF styling); covers all four report types with date-range filtering
- [ ] 🔴 Appointment volume report (daily / weekly / monthly, by department)
- [ ] 🔴 Lab turnaround time report (order → result)
- [ ] 🔴 Bed occupancy report (ward-level, hospital-level)
- [ ] 🔴 Prescription and pharmacy dispensing report
- [ ] 🔴 Waitlist and no-show report
- [ ] 🔴 Insurance claims report (submitted, approved, rejected, pending)
- [ ] 🔴 Staff attendance and shift report
- [ ] 🔴 Inventory consumption report
- [ ] 🔴 Scheduled / automated reports (cron-based, emailed to admins)
- [ ] 🔴 Report access control (which roles can view which reports)
- [x] 🟢 Custom date-range filtering on all reports (`startDate`/`endDate` query params, validated)
- [ ] 🔴 Report audit log (who ran what report and when)

---

## 4. Analytics

`analytics.service.ts` has the SQL queries. What's needed on top:

- [ ] 🟡 Patient trend analytics (new vs returning, cohort analysis)
- [ ] 🟡 Revenue trend analytics (MRR, ARR, churn)
- [ ] 🟡 Appointment metrics (completion rate, cancellation rate, peak hours)
- [ ] 🟡 Performance KPIs (per doctor, per department)
- [x] 🟢 **Analytics dashboard API** — `GET /api/dashboard/analytics`: overview stats + trend series + performance KPIs + realtime metrics in one call; date-range params; 60s Redis cache; raw data for frontend-rendered charts
- [ ] 🔴 Real-time occupancy tracker (beds, wards, emergency)
- [ ] 🔴 Wait time analytics (average, by department, by doctor)
- [ ] 🔴 Readmission rate tracking (30-day, 60-day, 90-day)
- [ ] 🔴 Disease / diagnosis trend tracking (ICD-10 codes)
- [ ] 🔴 Staff utilization rate (booked hours vs available hours)
- [ ] 🔴 Revenue per patient, revenue per doctor
- [ ] 🔴 Patient satisfaction score tracking (post-appointment survey)
- [ ] 🟡 Predictive insights (ML service exists in `ml-prediction.service.ts` — review depth)
- [ ] 🔴 Tenant-level SaaS analytics (MRR, churn, plan distribution — admin-only)
- [ ] 🔴 Alerting: notify admins when KPIs cross defined thresholds

---

## 5. Patient Management

- [x] 🟢 Patient registration and profile — full CRUD module (`modules/patients`) with validation, permissions, and plan-capacity check on create
- [ ] 🔴 Patient portal — self-service login, view appointments, lab results, invoices
- [ ] 🔴 Patient mobile app API (`mobile-api.service.ts` exists — review completeness)
- [ ] 🔴 Patient medical history timeline view
- [ ] 🔴 Chronic disease management flags
- [ ] 🔴 Patient consent forms (digital signature)
- [ ] 🔴 Next-of-kin / emergency contact management
- [ ] 🔴 Patient-to-doctor messaging (secure in-app)
- [ ] 🔴 Patient feedback and satisfaction surveys

---

## 6. Clinical Operations

- [ ] 🟡 Appointment scheduling (module exists)
- [ ] 🟡 Appointment waitlist (model exists — implement waitlist promotion)
- [ ] 🟡 Telemedicine / video consultation via Daily.co (`telemedicine.service.ts` — review depth) — *decided*
- [ ] 🔴 Electronic prescriptions (generate, send to pharmacy, track fulfilment)
- [x] 🟢 Clinical notes (SOAP) — full CRUD at `/api/clinical-notes` (create/list-by-patient/get/update/delete) plus lock-to-sign; enforces is_locked immutability and 24h edit window
- [ ] 🔴 Referral management (internal department-to-department, external)
- [ ] 🔴 Discharge planning and summary generation
- [x] 🟢 Vital signs recording — full CRUD at `/api/vital-signs` with auto-BMI; `/patient/:id/latest` and `/patient/:id/trends` (time-series per metric, date-range filtered) for trend display
- [ ] 🔴 Allergy and medication interaction alerts
- [ ] 🟡 Lab test ordering and results (`lab-integration.service.ts`, `laboratory.service.ts`)
- [ ] 🔴 Radiology / imaging order management (DICOM-lite, at minimum order tracking)
- [ ] 🔴 Surgical procedure scheduling and records

---

## 7. Ward & Bed Management

- [ ] 🔴 Ward / room / bed inventory (create, categorize, set status)
- [ ] 🔴 Bed assignment on admission
- [ ] 🔴 Real-time bed availability board
- [ ] 🔴 Inpatient tracking (admission, daily notes, discharge)
- [ ] 🔴 ICU / isolation ward flags
- [ ] 🔴 Housekeeping workflow (bed cleaning status between patients)

---

## 8. Pharmacy & Inventory

- [ ] 🔴 Drug / medication catalogue (name, form, strength, stock level)
- [ ] 🔴 Prescription dispensing workflow
- [ ] 🔴 Stock level tracking with low-stock alerts
- [ ] 🔴 Reorder / purchase order management
- [ ] 🔴 Drug expiry tracking and alerts
- [ ] 🔴 Medical supplies inventory (consumables, equipment)
- [ ] 🔴 Supplier management
- [ ] 🔴 Inventory valuation report

---

## 9. Staff & HR

- [ ] 🟡 User / staff accounts (model and auth exist)
- [ ] 🟡 Role-based access control (RBAC fully implemented)
- [ ] 🔴 Staff scheduling / shift management
- [ ] 🔴 On-call roster management
- [ ] 🔴 Staff attendance tracking (clock-in / clock-out)
- [ ] 🔴 Leave / time-off requests and approvals
- [ ] 🔴 Payroll data export (hours worked, leave taken — not full payroll, just the data feed)
- [ ] 🔴 Credentialing / licence expiry tracking for doctors and nurses
- [ ] 🔴 Staff performance reviews

---

## 10. Insurance & Claims

- [ ] 🟡 `insurance.service.ts` exists — review completeness
- [ ] 🔴 Insurance provider directory (HMOs, insurers)
- [ ] 🔴 Patient insurance policy management
- [ ] 🔴 Pre-authorization request workflow
- [ ] 🔴 Claims submission (HL7 837 or custom per provider)
- [ ] 🔴 Claims status tracking (submitted, approved, denied, appealed)
- [ ] 🔴 Co-pay and co-insurance calculation at point of billing
- [ ] 🔴 Denial management and re-submission workflow
- [ ] 🔴 EOB (Explanation of Benefits) parsing and reconciliation

---

## 11. Notifications & Communications

- [ ] 🟡 In-app notifications (service exists)
- [ ] 🟡 Email notifications (service exists, updated to Clinical Blue)
- [x] 🟢 SMS notifications — `sendSms()` in `modules/notifications/sms` with VTpass (primary, Nigeria) + Twilio (global) providers behind a factory; automatic primary→fallback, E.164 normalization, bulk send; env-configurable
- [ ] 🔴 WhatsApp notifications (Twilio WhatsApp API or 360dialog)
- [ ] 🔴 Push notifications for mobile (FCM / APNs)
- [x] 🟢 Appointment reminders — `appointment-reminder.service.ts` texts patients 24h & 2h before via `sendSms()`; idempotent per stage (reminder_*_sent_at columns); cron every 30 min from `core`
- [ ] 🔴 Lab result ready notification (to patient and doctor)
- [ ] 🔴 Prescription ready notification
- [ ] 🔴 Payment due and receipt notifications
- [ ] 🔴 System alert notifications (to admins — downtime, failed jobs, threshold breaches)
- [ ] 🔴 Notification preferences per user (opt-in / opt-out per channel)

---

## 12. Compliance & Security

- [ ] 🟡 Audit logging (`audit.middleware.ts` exists — review coverage)
- [x] 🟢 Error tracking — middleware wired; Slack alerts fire for high/critical severity
- [ ] 🟡 Rate limiting (middleware exists)
- [ ] 🔴 **NDPR compliance** (Nigeria Data Protection Regulation) — *priority 1, decided*
- [ ] 🔴 **GDPR compliance** (EU deployments) — *priority 1, decided*
- [ ] 🔴 **HIPAA compliance checklist** (US deployments) — *deferred until US expansion*
- [ ] 🔴 Data encryption at rest (database-level and field-level for PII)
- [ ] 🔴 Data retention and purge policies (configurable per tenant)
- [ ] 🔴 Patient data export (right to access / right to portability)
- [ ] 🔴 Patient data deletion (right to erasure)
- [ ] 🔴 Penetration testing and security audit before go-live
- [x] 🟢 2FA / MFA — TOTP setup/enable/disable/verify endpoints (`modules/auth/twofa.*`)
- [x] 🟢 Token revocation — `token_blacklist` table + logout invalidation
- [ ] 🟡 Backup (`backup.service.ts` complete including restore)
- [ ] 🔴 Disaster recovery runbook and tested restore procedure

---

## 13. Integrations

- [ ] 🟡 FHIR R4 module exists — review completeness against the standard
- [ ] 🟡 IoT device integration (`iot-device.service.ts` — review depth)
- [ ] 🔴 HL7 v2 message handling (for legacy lab and radiology systems)
- [ ] 🔴 Government health registry integration (NHIS in Nigeria, or country-specific)
- [ ] 🔴 Biometric device integration (fingerprint / face ID for patient identity)
- [ ] 🔴 Medical device data ingestion (vitals monitors, glucometers)
- [ ] 🔴 EHR data import / migration tool (for onboarding new tenants)
- [ ] 🔴 Accounting system export (QuickBooks, Sage, or CSV journal entries)
- [ ] 🔴 Google / Outlook calendar sync for appointments

---

## 14. Infrastructure & DevOps

- [ ] 🟡 CI/CD pipeline — GitHub Actions Fly.io deploy workflow exists; add lint/test/build gates before deploy
- [ ] 🔴 Staging environment setup
- [ ] 🟡 Environment-specific config — `DATABASE_URL`/`REDIS_URL` support + env validation at boot; per-env files still needed
- [ ] 🔴 Database migration strategy and rollback plan
- [ ] 🔴 Health check endpoint (already exists — ensure it covers DB, Redis, RabbitMQ)
- [ ] 🔴 Horizontal scaling plan (stateless API, shared Redis session)
- [ ] 🔴 CDN for file uploads and static assets
- [ ] 🔴 Log aggregation (Papertrail, Datadog, or self-hosted ELK)
- [ ] 🔴 Uptime monitoring and alerting (Uptime Robot or Better Uptime)
- [ ] 🔴 Load testing before go-live (k6 or Artillery)
- [ ] 🔴 Multi-region deployment plan (for data residency compliance)

---

## 15. Go-to-Market / Onboarding

- [ ] 🔴 Tenant onboarding wizard (hospital name, logo, departments, first admin user)
- [ ] 🟡 Demo / sandbox — comprehensive test-data seeder exists (`seeders/test-data.seeder.ts`); hosted sandbox env still needed
- [ ] 🔴 In-app help documentation and tooltips
- [ ] 🔴 Admin super-panel (manage all tenants, view subscription status, impersonate)
- [ ] 🔴 System health dashboard for ops team
- [ ] 🔴 Customer support ticket integration (Intercom or Freshdesk)
- [ ] 🔴 Changelog / release notes page

---

## Decisions — Resolved (2026-06-12)

| # | Decision | Resolution |
|---|---|---|
| 1 | Subscription model | ✅ Capacity-based flat — all features for everyone, tiers by volume/seats/storage |
| 2 | Payment gateway | ✅ Paystack (primary) + Stripe (international) |
| 3 | SMS provider | ✅ VTpass (primary, Nigeria) + Twilio (global) |
| 4 | Telemedicine | ✅ Daily.co |
| 5 | Analytics charts | ✅ Frontend-rendered, backend serves raw data |
| 6 | PDF generation | ✅ PDFKit |
| 7 | Deployment target | ✅ Railway (early stage) → Contabo VPS (later) |
| 8 | Compliance priority | ✅ NDPR + GDPR first, HIPAA later for US expansion |
