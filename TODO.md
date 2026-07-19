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
- [x] 🟡 Appointment volume trend (daily/weekly/monthly) via `GET /api/reports/trends?metric=appointments`; by-department split still TODO
- [x] 🟢 Lab turnaround time — in `GET /api/reports/operational-metrics` (avg/min/max hours order→results)
- [x] 🟢 Bed occupancy — in operational-metrics (occupancy rate, admissions/discharges, avg length of stay)
- [x] 🟢 Prescription and pharmacy dispensing report — `GET /api/reports/prescription-dispensing` (reports:view, tenant-scoped, date-range): status mix, item-level dispense/fill rates, top-20 medications; exportable via `/export?reportType=prescription-dispensing`
- [x] 🟢 Waitlist and no-show report — `GET /api/reports/waitlist-no-show` (reports:view): tenant-scoped waitlist status mix + promotion rate, plus appointment no-show/cancellation rates; exportable
- [x] 🟢 Insurance claims report (submitted, approved, rejected, pending) — `GET /api/reports/insurance-claims` (invoice:view finance-tier): status & type breakdown, claimed vs approved value, approval/rejection rates, per-provider split; exportable
- [ ] 🔴 Staff attendance and shift report
- [ ] 🔴 Inventory consumption report
- [x] 🟢 Scheduled / automated reports — **configurable per-tenant schedules** (`report-schedule.service` + `report_schedules` table): CRUD at `/api/reports/schedules` (analytics-tier) to pick report type (digest or any of the 10 report types, incl. prescription-dispensing, waitlist-no-show, insurance-claims), format (html inline / csv / xlsx / pdf attachment), frequency (daily/weekly/monthly), recipients (explicit or tenant admins) and params; hourly cron (`scheduleReportRunner` in `core`) delivers each schedule when its `next_run_at` comes due and advances the cadence; `POST /schedules/:id/run` for on-demand delivery. Digest reuses the inventory-valuation + operations + revenue-trend summary
- [x] 🟢 Report exports extended — inventory-valuation, operational-metrics, and trends now exportable via `/api/reports/export` (CSV/XLSX/PDF)
- [x] 🟢 Report access control — all `/api/reports/*` now require auth + tenant; per-report permission gating (clinical/summary→reports:view, financial & inventory-valuation→invoice:view, operational/trends/system-health→analytics:view); export re-checks finance permission for finance report types
- [x] 🟢 Custom date-range filtering on all reports (`startDate`/`endDate` query params, validated)
- [ ] 🔴 Report audit log (who ran what report and when)

---

## 4. Analytics

`analytics.service.ts` has the SQL queries. What's needed on top:

- [x] 🟡 Patient registration trend — `GET /api/reports/trends?metric=patients` (period grouping + period-over-period delta); new-vs-returning/cohorts still TODO
- [x] 🟡 Revenue trend — `GET /api/reports/trends?metric=revenue` (period grouping + delta); MRR/ARR/churn still TODO
- [ ] 🟡 Appointment metrics (completion rate, cancellation rate, peak hours)
- [ ] 🟡 Performance KPIs (per doctor, per department)
- [x] 🟢 **Analytics dashboard API** — `GET /api/dashboard/analytics`: overview stats + trend series + performance KPIs + realtime metrics in one call; date-range params; 60s Redis cache; raw data for frontend-rendered charts
- [ ] 🔴 Real-time occupancy tracker (beds, wards, emergency)
- [x] 🟡 Wait time analytics — average wait (check-in→start) in operational-metrics; by-department/doctor breakdown still TODO
- [ ] 🔴 Readmission rate tracking (30-day, 60-day, 90-day)
- [ ] 🔴 Disease / diagnosis trend tracking (ICD-10 codes)
- [x] 🟢 Doctor utilization — booked minutes vs assumed capacity (business days × 8h) per doctor in operational-metrics
- [ ] 🔴 Revenue per patient, revenue per doctor
- [ ] 🔴 Patient satisfaction score tracking (post-appointment survey)
- [ ] 🟡 Predictive insights (ML service exists in `ml-prediction.service.ts` — review depth)
- [ ] 🔴 Tenant-level SaaS analytics (MRR, churn, plan distribution — admin-only)
- [ ] 🔴 Alerting: notify admins when KPIs cross defined thresholds

---

## 5. Patient Management

- [x] 🟢 Patient registration and profile — full CRUD module (`modules/patients`) with validation, permissions, and plan-capacity check on create
- [x] 🟢 Master Patient Index (MPI) — **Phase 1**: global `persons` table (cross-tenant identity, NIN/verified-contact keys with partial-unique indexes) + `patient.person_id` link; MRN now **unique per-tenant** (`PAT`+6 digits, was global `PAT`+9); NIN deterministic auto-link on patient create + manual `POST/DELETE /api/patients/:id/link-person` and `GET /api/persons/search|:id`. Companion hardening done: patient get/update/delete are now tenant-scoped (`findOne` on `{id, tenant_id}` + `tenantMiddleware` on those routes), and the ML-prediction / EMR-summary patient lookups take an optional tenant scope. **Phase 2** done: `patient_record_shares` table + consent-gated sharing — source tenant grants a scope (demographics/allergies/medications/lab_results/clinical_notes/full_record) of a Person's records to a recipient tenant (`POST/GET /api/patients/:id/record-shares`, `.../:shareId/revoke`, `record_share:grant`), and the recipient reads them read-only, scope-limited, and audit-logged via `GET /api/patients/:id/external-records` (`record_share:view_external`) — the only sanctioned cross-tenant data path. **Phase 3** done: direct-to-consumer platform tenant — a seeded system tenant (migration 062) anchors hospital-less users; `optionalTenantMiddleware` falls back to it when no `x-tenant-id` is sent (applied to telemedicine, triage, and the patient portal incl. lab-results); `POST /api/persons/self-enroll` (auth, no tenant) gives a consumer a platform-tenant Patient linked to a verified Person, so they can use telemedicine / hold record shares without belonging to a hospital.
- [x] 🟢 Patient portal — `/api/portal`: dashboard summary + self-service appointments, prescriptions, invoices, lab results and profile; every endpoint resolves the patient from the authenticated user (own-data-only), reusing the domain services (login uses existing auth)
- [ ] 🔴 Patient mobile app API (`mobile-api.service.ts` exists — review completeness)
- [ ] 🔴 Patient medical history timeline view
- [ ] 🔴 Chronic disease management flags
- [x] 🟢 Patient consent management — `/api/compliance/consent` (per-type grant/withdraw, append-only history) with **digital-signature capture**: `POST /consent/:id/sign` (drawn/typed/uploaded, signer role, IP/UA), SHA-256 document hash for tamper-evidence, `GET /signatures/:id/verify`
- [ ] 🔴 Next-of-kin / emergency contact management
- [ ] 🔴 Patient-to-doctor messaging (secure in-app)
- [ ] 🔴 Patient feedback and satisfaction surveys

---

## 6. Clinical Operations

- [ ] 🟡 Appointment scheduling (module exists)
- [ ] 🟡 Appointment waitlist (model exists — implement waitlist promotion)
- [x] 🟢 Telemedicine / video consultation — persistent `telemedicine` module (`telemedicine_sessions` table): create / list / get sessions + scheduled→active→completed / cancelled lifecycle at `/api/telemedicine/sessions` (start/end/cancel, duration computed on end); pluggable video-provider stub (`buildRoomLinks` generates room + join/host links for Daily.co / Jitsi / WebRTC — swap for a vendor SDK without touching the lifecycle). Supersedes the in-memory `integrations/telemedicine.service.ts` stub
- [x] 🟢 Electronic prescriptions — `/api/prescriptions`: create (multi-item, transactional, auto RX number), list-by-patient, get; status lifecycle draft→issued→sent_to_pharmacy→(partially_)dispensed / cancelled with transition guards; per-item dispense tracking
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

- [x] 🟢 Ward / room / bed inventory — `/api/wards` + `/api/beds`: CRUD, ward types, bed types, manual status (available/reserved/cleaning/maintenance/blocked)
- [x] 🟢 Bed assignment on admission — `POST /api/admissions` transactionally occupies the bed; guarded against double-admission and non-assignable beds
- [x] 🟢 Real-time bed availability board — `GET /api/beds/board` (per-ward + tenant totals by status); per-ward `GET /api/wards/:id/availability`
- [x] 🟢 Inpatient tracking (admission → transfer → discharge) — `/api/admissions` with transfer between beds and discharge; daily notes still TODO
- [x] 🟢 ICU / isolation ward flags — via `ward_type` (icu, isolation, …) and `bed_type`
- [x] 🟢 Housekeeping workflow — beds go to `cleaning` on discharge/transfer; staff mark `available` via `PATCH /api/beds/:id/status`

---

## 8. Pharmacy & Inventory

- [x] 🟢 Drug / medication catalogue — `/api/pharmacy/items` (name, generic, SKU, form, strength, unit, price, reorder level)
- [x] 🟢 Stock dispensing workflow — `POST /api/pharmacy/items/:id/dispense` with transactional FEFO (first-expiry-first-out), insufficient-stock guard, per-batch audit; optional prescription reference
- [x] 🟢 Stock level tracking with low-stock alerts — batch-level quantities; `GET /api/pharmacy/alerts/low-stock`; per-item `GET /items/:id/stock`
- [ ] 🟡 Reorder / purchase order management — reorder level + low-stock alert exist; PO workflow still TODO
- [x] 🟢 Drug expiry tracking and alerts — batch expiry dates, expired stock excluded from dispensing, `GET /api/pharmacy/alerts/expiring?days=`
- [ ] 🟡 Supplier management — captured per batch (supplier field); dedicated supplier directory still TODO
- [x] 🟢 Stock movement audit trail — every receipt/dispense/adjustment/wastage recorded (`GET /api/pharmacy/movements`)
- [x] 🟢 Pharmacy dispense wired into e-prescriptions — prescription items link to a pharmacy catalogue item (`pharmacy_item_id`); dispensing a prescription atomically FEFO-decrements real stock (rolls back if any linked line lacks stock) and records a stock movement referencing the prescription
- [x] 🟢 Medical supplies inventory — `/api/supplies`: consumables (`/items` with transactional receive/issue-to-department/adjust/wastage ledger + low-stock alerts) and an equipment asset register (`/equipment`: status lifecycle, maintenance tracking + due alerts)
- [x] 🟢 Inventory valuation report — `GET /api/reports/inventory-valuation`: pharmacy (batch cost + retail) and supplies (on_hand × price), by-category breakdown + grand totals

---

## 9. Staff & HR

- [x] 🟢 Staff / HR records — `staff` module (`staff_profiles` table): employment record (employee no, job title, employment type/status, hire/termination dates, department, licence, base salary, emergency contact) linked to a `User` account; CRUD at `/api/staff`, gated by new `staff:view` / `staff:manage` permissions (admin tier)
- [ ] 🟡 Role-based access control (RBAC fully implemented)
- [x] 🟢 Staff scheduling / shift management — `staff_shifts` table; CRUD + filtered roster listing at `/api/staff/shifts` (by staff/department/type/status/date window)
- [x] 🟢 On-call roster management — on-call shifts (`shift_type=on_call`/`is_on_call`) surfaced via `GET /api/staff/shifts/on-call?from=&to=`
- [x] 🟢 Staff attendance tracking (clock-in / clock-out) — `staff_attendance` table (one row per staff/day, unique); `POST /api/staff/:id/clock-in` and `/clock-out` compute hours worked; `GET /api/staff/attendance` with date/status filters
- [x] 🟢 Leave / time-off requests and approvals — `staff_leave_requests` table; submit / list / approve / reject / cancel at `/api/staff/leave`, inclusive day-count computed on submit, plus per-staff balance at `/api/staff/:id/leave-balance`
- [x] 🟢 Payroll data export (hours worked, leave taken — not full payroll, just the data feed) — `GET /api/staff/payroll/export?from=&to=` aggregates per-staff hours worked, days present, and approved leave days
- [x] 🟢 Credentialing / licence expiry tracking for doctors and nurses — licence fields on the staff record + `GET /api/staff/licences/expiring?within_days=` (soonest-first, flags already-expired)
- [x] 🟢 Staff performance reviews — `staff_performance_reviews` table; per-competency + overall (1–5) ratings, strengths / areas-for-improvement / goals, with a draft → submitted → acknowledged → finalized workflow (`/api/staff/reviews`, staff:manage; ratings lock on finalize)

---

## 10. Insurance & Claims

- [ ] 🟡 `integrations/insurance.service.ts` — external clearinghouse eligibility check (separate from the new persistent module)
- [x] 🟢 Insurance provider directory (HMOs, insurers) — `/api/insurance/providers` CRUD
- [x] 🟢 Patient insurance policy management — `/api/insurance/policies` (coverage %, validity, primary flag, per-patient list)
- [x] 🟢 Pre-authorization request workflow — claims support `claim_type=preauthorization` with an authorization_code on approval
- [x] 🟢 Claims submission & status tracking — `/api/insurance/claims`: create → submit → decision (approve/partial/reject) → pay / cancel, guarded lifecycle
- [x] 🟢 Co-pay and co-insurance calculation — `POST /api/insurance/claims/estimate` and auto co-pay on claim create/decision from policy coverage %
- [ ] 🔴 Claims submission via HL7 837 EDI (currently a custom claim record per provider)
- [ ] 🔴 Denial management and re-submission workflow
- [ ] 🔴 EOB (Explanation of Benefits) parsing and reconciliation

---

## 11. Notifications & Communications

- [x] 🟢 In-app notifications — now persisted (`notifications` table, history + read state) and delivered real-time via Socket.IO through the dispatcher
- [x] 🟢 Email notifications — wired as a dispatcher channel (Clinical Blue templates via `sendEmail`)
- [x] 🟢 SMS notifications — `sendSms()` in `modules/notifications/sms` with VTpass (primary, Nigeria) + Twilio (global) providers behind a factory; automatic primary→fallback, E.164 normalization, bulk send; env-configurable
- [ ] 🔴 WhatsApp notifications (Twilio WhatsApp API or 360dialog)
- [x] 🟢 Push notifications — FCM (mobile/patient) + VAPID web-push (staff web) providers; device registry (`POST/DELETE /api/notifications/devices`), invalid-token pruning; unified `dispatchNotification()` fans out in-app+push+email+SMS by preference
- [x] 🟢 Event wiring (PR B) — appointment booked/cancelled/rescheduled and lab-results-ready dispatch to patient (in-app/push/email) + doctor (in-app/push); reminders now also fan out on in-app/push/email alongside SMS
- [x] 🟢 Appointment reminders — `appointment-reminder.service.ts` texts patients before appointments via `sendSms()`; idempotent per stage (reminder_*_sent_at columns); cron every 30 min from `core`. Per-tenant configurable (`Tenant.reminder_settings`: enable + long/short lead hours) via `GET/PATCH /api/tenant/reminder-settings`; patients can opt out (`Patient.sms_opt_out`)
- [x] 🟢 Lab result ready notification (to patient and doctor) — fires on results entry (`addTestResults`) via the dispatcher
- [ ] 🔴 Prescription ready notification
- [ ] 🔴 Payment due and receipt notifications
- [ ] 🔴 System alert notifications (to admins — downtime, failed jobs, threshold breaches)
- [x] 🟢 Notification preferences per user — per-channel + per-type overrides (`GET/PATCH /api/notifications/preferences`), honoured by the dispatcher

---

## 12. Compliance & Security

- [ ] 🟡 Audit logging (`audit.middleware.ts` exists — review coverage)
- [x] 🟢 Error tracking — middleware wired; Slack alerts fire for high/critical severity
- [ ] 🟡 Rate limiting (middleware exists)
- [x] 🟢 **NDPR / GDPR data-subject rights** — `compliance` module (`/api/compliance`): data export, erasure (anonymization), consent management, data-subject-request workflow, retention preview
- [ ] 🔴 **HIPAA compliance checklist** (US deployments) — *deferred until US expansion*
- [x] 🟢 Field-level encryption at rest (AES-256-GCM) for sensitive/medical fields — patient contact PII (phone, address, emergency contacts) + clinical free-text (appointment & clinical-note diagnosis/treatment/prescription/notes); transparent getter/setter, legacy-tolerant, backfill script. Searchable basics (name/email/MRN) stay plaintext. (DB-level/TDE + email blind-index still optional follow-ups)
- [x] 🟢 Data retention preview — `GET /api/compliance/retention/preview?years=` lists patients past retention (purge remains a deliberate, separately-authorized action)
- [x] 🟢 Patient data export (right to access / portability) — `GET /api/compliance/patients/:id/export` aggregates all records
- [x] 🟢 Patient data erasure (right to erasure) — `POST /api/compliance/patients/:id/anonymize` redacts direct identifiers while retaining de-identified clinical records per medical-retention law; also triggered by completing an erasure request
- [ ] 🔴 Penetration testing and security audit before go-live
- [x] 🟢 2FA / MFA — TOTP setup/enable/disable/verify endpoints (`modules/auth/twofa.*`)
- [x] 🟢 Token revocation — `token_blacklist` table + logout invalidation
- [ ] 🟡 Backup (`backup.service.ts` complete including restore)
- [ ] 🔴 Disaster recovery runbook and tested restore procedure

---

## 13. Integrations

- [ ] 🟡 FHIR R4 module exists — review completeness against the standard
- [x] 🟢 IoT device integration — persistent `iot` module (`iot_devices` table): register / list / update / retire devices with per-metric alert thresholds, patient assignment, and `last_seen_at` at `/api/iot/devices`. Supersedes the in-memory `integrations/iot-device.service.ts` stub
- [ ] 🔴 HL7 v2 message handling (for legacy lab and radiology systems)
- [ ] 🔴 Government health registry integration (NHIS in Nigeria, or country-specific)
- [ ] 🔴 Biometric device integration (fingerprint / face ID for patient identity)
- [x] 🟢 Medical device data ingestion (vitals monitors, glucometers) — `iot_device_readings` table; `POST /api/iot/devices/:id/readings` evaluates thresholds at ingest (flags abnormal + best-effort emergency alert), with `GET /api/iot/readings` and `GET /api/iot/patients/:id/readings`
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
