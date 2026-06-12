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

- [ ] 🔴 Define final tier names, limits, and pricing
- [ ] 🟡 Subscription model exists (`subscription.model.ts`) — add `seat_limit`, `patient_limit`, `storage_limit_gb` columns
- [ ] 🔴 Enforcement middleware: block operations when tenant exceeds plan limits
- [ ] 🔴 Plan management admin API (create, edit, deactivate plans)
- [ ] 🔴 Self-service plan upgrade / downgrade (with proration)
- [ ] 🔴 Free trial logic (14-day trial, auto-expire, grace period)
- [ ] 🔴 Trial-to-paid conversion flow and notifications
- [ ] 🔴 Plan comparison page (for frontend)
- [ ] 🔴 Usage dashboard for tenants (seats used, patient count, storage consumed)

---

## 2. Payment Collection

The billing and payment modules are scaffolded but gateway integration is missing.

- [ ] 🟡 `billing.service.ts` and `payment.service.ts` exist — review for completeness
- [ ] 🔴 Integrate **Paystack** as primary gateway (local cards, bank transfer, USSD) — *decided*
- [ ] 🔴 Integrate **Stripe** as fallback for international payments — *decided*
- [ ] 🔴 Webhook handler for payment events (success, failure, refund, dispute)
- [ ] 🔴 Automatic invoice generation on payment
- [ ] 🟡 Invoice model exists — add PDF export using PDFKit — *decided*
- [ ] 🔴 Payment retry logic for failed recurring charges
- [ ] 🔴 Dunning flow: email sequence for overdue accounts (Day 1, Day 3, Day 7, suspend)
- [ ] 🔴 Refund handling API
- [ ] 🔴 Multi-currency support (NGN, USD, GBP minimum)
- [ ] 🔴 VAT / tax calculation per region
- [ ] 🔴 Payment receipt emails (update `email.service.ts`)
- [ ] 🔴 Bulk payment collection for patient fees (outpatient, inpatient, lab, pharmacy)
- [ ] 🔴 Insurance co-pay collection flow
- [ ] 🔴 Payment history and statement download for tenants

---

## 3. Reporting

`reports.service.ts` has the data layer for demographics, doctor performance, and financials. What's missing:

- [ ] 🟡 Patient demographics report — complete and expose via API
- [ ] 🟡 Doctor performance report — complete and expose via API
- [ ] 🟡 Financial summary report — complete and expose via API
- [ ] 🔴 **Export formats:** PDF, CSV, and Excel for every report
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
- [ ] 🔴 Custom date-range filtering on all reports
- [ ] 🔴 Report audit log (who ran what report and when)

---

## 4. Analytics

`analytics.service.ts` has the SQL queries. What's needed on top:

- [ ] 🟡 Patient trend analytics (new vs returning, cohort analysis)
- [ ] 🟡 Revenue trend analytics (MRR, ARR, churn)
- [ ] 🟡 Appointment metrics (completion rate, cancellation rate, peak hours)
- [ ] 🟡 Performance KPIs (per doctor, per department)
- [ ] 🔴 **Analytics dashboard API** — aggregate all KPIs into a single endpoint for the frontend dashboard
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

- [ ] 🟡 Patient registration and profile (model exists)
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
- [ ] 🔴 Clinical notes (SOAP format: Subjective, Objective, Assessment, Plan)
- [ ] 🔴 Referral management (internal department-to-department, external)
- [ ] 🔴 Discharge planning and summary generation
- [ ] 🔴 Vital signs recording and trend display
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
- [ ] 🔴 SMS notifications — VTpass (primary, Nigeria) + Twilio (global) — *decided*
- [ ] 🔴 WhatsApp notifications (Twilio WhatsApp API or 360dialog)
- [ ] 🔴 Push notifications for mobile (FCM / APNs)
- [ ] 🔴 Appointment reminders (24h and 2h before, configurable per tenant)
- [ ] 🔴 Lab result ready notification (to patient and doctor)
- [ ] 🔴 Prescription ready notification
- [ ] 🔴 Payment due and receipt notifications
- [ ] 🔴 System alert notifications (to admins — downtime, failed jobs, threshold breaches)
- [ ] 🔴 Notification preferences per user (opt-in / opt-out per channel)

---

## 12. Compliance & Security

- [ ] 🟡 Audit logging (`audit.middleware.ts` exists — review coverage)
- [ ] 🟡 Error tracking (`error-tracking.service.ts` — `sendToExternalService` is a stub)
- [ ] 🟡 Rate limiting (middleware exists)
- [ ] 🔴 **NDPR compliance** (Nigeria Data Protection Regulation) — *priority 1, decided*
- [ ] 🔴 **GDPR compliance** (EU deployments) — *priority 1, decided*
- [ ] 🔴 **HIPAA compliance checklist** (US deployments) — *deferred until US expansion*
- [ ] 🔴 Data encryption at rest (database-level and field-level for PII)
- [ ] 🔴 Data retention and purge policies (configurable per tenant)
- [ ] 🔴 Patient data export (right to access / right to portability)
- [ ] 🔴 Patient data deletion (right to erasure)
- [ ] 🔴 Penetration testing and security audit before go-live
- [ ] 🔴 2FA / MFA for all staff accounts
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

- [ ] 🔴 CI/CD pipeline (GitHub Actions — lint, test, build, deploy)
- [ ] 🔴 Staging environment setup
- [ ] 🔴 Environment-specific config management (dev / staging / prod)
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
- [ ] 🔴 Demo / sandbox environment with seed data
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
