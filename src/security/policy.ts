import { PUBLIC, SELF, type PolicyEntry } from './types';

/**
 * ============================================================================
 *  ACCESS POLICY - the single source of truth for API authorisation.
 * ============================================================================
 *
 *  Every route reachable under /api/v1 MUST have an entry here. A request that
 *  matches no entry is DENIED (403 NO_POLICY), and `npm run verify:policy`
 *  fails the build. Adding a route without a policy entry therefore fails
 *  closed - it cannot silently expose data.
 *
 *  ORDER MATTERS: first match wins, exactly like Express. Literal segments are
 *  listed before their :param siblings (/api/patients/me precedes
 *  /api/patients/:id). Preserve that ordering when editing.
 *
 *  FIELDS
 *    m       HTTP method.
 *    p       Path as mounted under /api/v1 (see router.ts).
 *    perm    'resource:action' | PUBLIC (no auth) | SELF (caller's own record).
 *    tenant  'required' -> caller must belong to the x-tenant-id they send.
 *            'optional' -> falls back to the platform tenant.
 *            'none'     -> not tenant-scoped.
 *    review  Permission was DERIVED from the route shape during migration, not
 *            transcribed from an existing checkPermission call. Confirm against
 *            the intended role model, then remove the flag.
 *
 *  PUBLIC entries are deliberate security decisions; adding one warrants review
 *  on its own.
 */
export const POLICY: PolicyEntry[] = [

  // --- /api/admissions ---------------------------------------------
  { m: 'GET',    p: '/api/admissions',                                   perm: 'admission:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/admissions',                                   perm: 'admission:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/admissions/patient/:patientId',                perm: 'admission:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/admissions/:id',                               perm: 'admission:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/admissions/:id/discharge',                     perm: 'admission:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/admissions/:id/transfer',                      perm: 'admission:update', tenant: 'required', review: true },

  // --- /api/advanced -----------------------------------------------
  { m: 'GET',    p: '/api/advanced/analytics',                           perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/iot/devices/:deviceId/readings',      perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/iot/patients/:patientId/vitals',      perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/metrics/realtime',                    perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/predictions/no-show/:appointmentId',  perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/predictions/patient-risk/:patientId', perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/advanced/telemedicine/sessions',               perm: 'analytics:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/advanced/telemedicine/sessions/:sessionId/chat', perm: 'analytics:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/advanced/telemedicine/sessions/:sessionId/start', perm: 'analytics:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/advanced/workflows/rules',                     perm: 'analytics:view', tenant: 'required', review: true },

  // --- /api/ambulance ----------------------------------------------
  { m: 'GET',    p: '/api/ambulance/active',                             perm: 'queue:view', tenant: 'required' },
  { m: 'GET',    p: '/api/ambulance/available',                          perm: 'queue:view', tenant: 'required' },
  { m: 'POST',   p: '/api/ambulance/dispatch',                           perm: 'queue:update_priority', tenant: 'required' },
  { m: 'POST',   p: '/api/ambulance/request',                            perm: 'ambulance:create', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/ambulance/:requestId/status',                  perm: 'ambulance:update', tenant: 'required', review: true },

  // --- /api/appointments -------------------------------------------
  { m: 'GET',    p: '/api/appointments',                                 perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/appointments',                                 perm: 'appointment:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/availability/doctor/:doctorId',   perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/doctor/:doctorId',                perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/patient/:patientId',              perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/schedule/doctor/:doctorId',       perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/slots/doctor/:doctorId',          perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/appointments/:appointmentId',                  perm: 'appointment:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/appointments/:appointmentId',                  perm: 'appointment:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/appointments/:appointmentId',                  perm: 'appointment:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/appointments/:appointmentId/cancel',           perm: 'appointment:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/appointments/:appointmentId/complete',         perm: 'appointment:update', tenant: 'required', review: true },

  // --- /api/audit --------------------------------------------------
  { m: 'GET',    p: '/api/audit',                                        perm: 'reports:view', tenant: 'required' },

  // --- /api/beds ---------------------------------------------------
  { m: 'POST',   p: '/api/beds',                                         perm: 'bed:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/beds/board',                                   perm: 'bed:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/beds/ward/:wardId',                            perm: 'bed:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/beds/:id',                                     perm: 'bed:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/beds/:id',                                     perm: 'bed:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/beds/:id',                                     perm: 'bed:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/beds/:id/status',                              perm: 'bed:update', tenant: 'required', review: true },

  // --- /api/billing ------------------------------------------------
  { m: 'POST',   p: '/api/billing/cancel',                               perm: 'billing:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/billing/downgrade',                            perm: 'billing:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/billing/history',                              perm: 'billing:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/billing/plans',                                perm: 'billing:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/billing/reactivate',                           perm: 'billing:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/billing/subscription',                         perm: 'billing:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/billing/subscription',                         perm: 'billing:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/billing/upgrade',                              perm: 'billing:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/billing/usage',                                perm: 'billing:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/billing/webhook',                              perm: 'billing:create', tenant: 'required', review: true },

  // --- /api/clinical-notes -----------------------------------------
  { m: 'POST',   p: '/api/clinical-notes',                               perm: 'clinical_note:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/clinical-notes/patient/:patientId',            perm: 'clinical_note:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/clinical-notes/:id',                           perm: 'clinical_note:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/clinical-notes/:id',                           perm: 'clinical_note:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/clinical-notes/:id',                           perm: 'clinical_note:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/clinical-notes/:id/lock',                      perm: 'clinical_note:update', tenant: 'required', review: true },

  // --- /api/compliance ---------------------------------------------
  { m: 'POST',   p: '/api/compliance/consent',                           perm: 'compliance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/consent/patient/:patientId',        perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/compliance/consent/withdraw',                  perm: 'compliance:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/compliance/consent/:consentId/sign',           perm: 'compliance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/consent/:consentId/signatures',     perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/compliance/patients/:patientId/anonymize',     perm: 'compliance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/patients/:patientId/export',        perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/requests',                          perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/compliance/requests',                          perm: 'compliance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/requests/:id',                      perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/compliance/requests/:id/status',               perm: 'compliance:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/retention/preview',                 perm: 'compliance:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/compliance/signatures/:id/verify',             perm: 'compliance:view', tenant: 'required', review: true },

  // --- /api/dashboard ----------------------------------------------
  { m: 'GET',    p: '/api/dashboard',                                    perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/analytics',                          perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/analytics/revenue',                  perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/health',                             perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/summary/appointments',               perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/summary/doctors',                    perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/summary/patients',                   perm: 'analytics:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/dashboard/summary/revenue',                    perm: 'analytics:view', tenant: 'required', review: true },

  // --- /api/departments --------------------------------------------
  { m: 'GET',    p: '/api/departments',                                  perm: 'department:view', tenant: 'required' },
  { m: 'POST',   p: '/api/departments',                                  perm: 'department:create', tenant: 'required' },
  { m: 'DELETE', p: '/api/departments/:id',                              perm: 'department:delete', tenant: 'required' },
  { m: 'GET',    p: '/api/departments/:id',                              perm: 'department:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/departments/:id',                              perm: 'department:update', tenant: 'required' },
  { m: 'GET',    p: '/api/departments/:id/analytics',                    perm: 'department:view', tenant: 'required' },
  { m: 'GET',    p: '/api/departments/:id/staff',                        perm: 'department:view', tenant: 'required' },
  { m: 'POST',   p: '/api/departments/:id/staff',                        perm: 'department:manage_staff', tenant: 'required' },
  { m: 'DELETE', p: '/api/departments/:id/staff/:assignmentId',          perm: 'department:manage_staff', tenant: 'required' },

  // --- /api/doctors ------------------------------------------------
  { m: 'GET',    p: '/api/doctors',                                      perm: 'doctor:view', tenant: 'required' },
  { m: 'POST',   p: '/api/doctors',                                      perm: 'doctor:create', tenant: 'required' },
  { m: 'GET',    p: '/api/doctors/me',                                   perm: SELF, tenant: 'required' },
  { m: 'DELETE', p: '/api/doctors/:id',                                  perm: 'doctor:delete', tenant: 'required' },
  { m: 'GET',    p: '/api/doctors/:id',                                  perm: 'doctor:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/doctors/:id',                                  perm: 'doctor:update', tenant: 'required' },
  { m: 'PATCH',  p: '/api/doctors/:id/availability',                     perm: 'doctor:update', tenant: 'required' },

  // --- /api/family -------------------------------------------------
  { m: 'GET',    p: '/api/family',                                       perm: 'family:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/family',                                       perm: 'family:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/family/:id',                                   perm: 'family:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/family/:id',                                   perm: 'family:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/family/:id',                                   perm: 'family:update', tenant: 'required', review: true },

  // --- /api/faqs ---------------------------------------------------
  { m: 'GET',    p: '/api/faqs',                                         perm: 'faq:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/faqs',                                         perm: 'faq:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/categories',                              perm: 'faq:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/public',                                  perm: 'faq:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/public/categories',                       perm: 'faq:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/public/search',                           perm: 'faq:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/public/:id',                              perm: 'faq:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/search',                                  perm: 'faq:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/faqs/:id',                                     perm: 'faq:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/faqs/:id',                                     perm: 'faq:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/faqs/:id',                                     perm: 'faq:update', tenant: 'required', review: true },

  // --- /api/fhir ---------------------------------------------------
  { m: 'GET',    p: '/api/fhir/Appointment/:id',                         perm: 'fhir:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/fhir/Patient',                                 perm: 'fhir:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/fhir/Patient/:id',                             perm: 'fhir:view', tenant: 'required', review: true },

  // --- /api/files --------------------------------------------------
  { m: 'GET',    p: '/api/files',                                        perm: 'file:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/files/upload',                                 perm: 'file:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/files/:id',                                    perm: 'file:delete', tenant: 'required', review: true },

  // --- /api/hospitals ----------------------------------------------
  { m: 'GET',    p: '/api/hospitals',                                    perm: 'hospital:view', tenant: 'required' },
  { m: 'POST',   p: '/api/hospitals',                                    perm: 'hospital:create', tenant: 'required' },
  { m: 'DELETE', p: '/api/hospitals/:id',                                perm: 'hospital:delete', tenant: 'required' },
  { m: 'GET',    p: '/api/hospitals/:id',                                perm: 'hospital:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/hospitals/:id',                                perm: 'hospital:update', tenant: 'required' },
  { m: 'PATCH',  p: '/api/hospitals/:id/status',                         perm: 'hospital:update', tenant: 'required' },

  // --- /api/insurance ----------------------------------------------
  { m: 'GET',    p: '/api/insurance/claims',                             perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/insurance/claims',                             perm: 'insurance:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/insurance/claims/estimate',                    perm: 'insurance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/insurance/claims/:id',                         perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/insurance/claims/:id/cancel',                  perm: 'insurance:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/insurance/claims/:id/decision',                perm: 'insurance:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/insurance/claims/:id/pay',                     perm: 'insurance:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/insurance/claims/:id/submit',                  perm: 'insurance:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/insurance/policies',                           perm: 'insurance:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/insurance/policies/patient/:patientId',        perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/insurance/policies/:id',                       perm: 'insurance:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/insurance/policies/:id',                       perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/insurance/policies/:id',                       perm: 'insurance:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/insurance/providers',                          perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/insurance/providers',                          perm: 'insurance:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/insurance/providers/:id',                      perm: 'insurance:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/insurance/providers/:id',                      perm: 'insurance:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/insurance/providers/:id',                      perm: 'insurance:update', tenant: 'required', review: true },

  // --- /api/invoices -----------------------------------------------
  { m: 'GET',    p: '/api/invoices',                                     perm: 'invoice:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/invoices',                                     perm: 'invoice:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/invoices/patient/:patientId',                  perm: 'invoice:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/invoices/:invoiceId',                          perm: 'invoice:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/invoices/:invoiceId',                          perm: 'invoice:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/invoices/:invoiceId',                          perm: 'invoice:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/invoices/:invoiceId/cancel',                   perm: 'invoice:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/invoices/:invoiceId/payment',                  perm: 'invoice:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/invoices/:invoiceId/pdf',                      perm: 'invoice:view', tenant: 'required', review: true },

  // --- /api/iot ----------------------------------------------------
  { m: 'GET',    p: '/api/iot/devices',                                  perm: 'iot:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/iot/devices',                                  perm: 'iot:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/iot/devices/:id',                              perm: 'iot:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/iot/devices/:id',                              perm: 'iot:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/iot/devices/:id',                              perm: 'iot:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/iot/devices/:id/readings',                     perm: 'iot:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/iot/patients/:patientId/readings',             perm: 'iot:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/iot/readings',                                 perm: 'iot:view', tenant: 'required', review: true },

  // --- /api/laboratories -------------------------------------------
  { m: 'GET',    p: '/api/laboratories',                                 perm: 'facility:view', tenant: 'required' },
  { m: 'POST',   p: '/api/laboratories',                                 perm: 'facility:manage', tenant: 'required' },
  { m: 'DELETE', p: '/api/laboratories/:id',                             perm: 'facility:manage', tenant: 'required' },
  { m: 'GET',    p: '/api/laboratories/:id',                             perm: 'facility:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/laboratories/:id',                             perm: 'facility:manage', tenant: 'required' },

  // --- /api/laboratory ---------------------------------------------
  { m: 'GET',    p: '/api/laboratory/catalog/department/:department',    perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/equipment/status',                  perm: 'lab:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/laboratory/orders',                            perm: 'lab:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/laboratory/orders/bulk',                       perm: 'lab:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/doctor/:doctorId',           perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/patient/:patientId',         perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/status/overdue',             perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/status/pending',             perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/:orderId',                   perm: 'lab:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/laboratory/orders/:orderId/cancel',            perm: 'lab:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/laboratory/orders/:orderId/collect',           perm: 'lab:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/laboratory/orders/:orderId/process',           perm: 'lab:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/orders/:orderId/results',           perm: 'lab:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/laboratory/orders/:orderId/results',           perm: 'lab:create', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/laboratory/orders/:orderId/review',            perm: 'lab:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/quality-control/summary',           perm: 'lab:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/laboratory/reports/patient/:patientId',        perm: 'lab:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/results/critical',                  perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/statistics',                        perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/tests',                             perm: 'lab:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/laboratory/tests',                             perm: 'lab:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/tests/category/:category',          perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/tests/code/:testCode',              perm: 'lab:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/tests/:testId',                     perm: 'lab:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/laboratory/tests/:testId',                     perm: 'lab:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/laboratory/tests/:testId/deactivate',          perm: 'lab:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/laboratory/workload',                          perm: 'lab:view', tenant: 'required', review: true },

  // --- /api/medications --------------------------------------------
  { m: 'POST',   p: '/api/medications',                                  perm: 'medication:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/medications/patient/:patientId',               perm: 'medication:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/medications/patient/:patientId/active',        perm: 'medication:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/medications/:id',                              perm: 'medication:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/medications/:id',                              perm: 'medication:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/medications/:id',                              perm: 'medication:update', tenant: 'required', review: true },

  // --- /api/mobile -------------------------------------------------
  { m: 'GET',    p: '/api/mobile/appointments',                          perm: 'mobile:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/mobile/appointments/request',                  perm: 'mobile:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/mobile/appointments/:id/cancel',               perm: 'mobile:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/mobile/lab-results',                           perm: 'mobile:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/mobile/profile',                               perm: 'mobile:view', tenant: 'required', review: true },

  // --- /api/notifications ------------------------------------------
  { m: 'GET',    p: '/api/notifications',                                perm: 'notification:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/notifications',                                perm: 'notification:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/notifications/devices',                        perm: 'notification:delete', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/notifications/devices',                        perm: 'notification:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/notifications/preferences',                    perm: 'notification:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/notifications/preferences',                    perm: 'notification:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/notifications/read-all',                       perm: 'notification:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/notifications/unread-count',                   perm: 'notification:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/notifications/:id/read',                       perm: 'notification:update', tenant: 'required', review: true },

  // --- /api/patients -----------------------------------------------
  { m: 'GET',    p: '/api/patients',                                     perm: 'patient:view', tenant: 'required' },
  { m: 'POST',   p: '/api/patients',                                     perm: 'patient:create', tenant: 'required' },
  { m: 'GET',    p: '/api/patients/me',                                  perm: SELF, tenant: 'required' },
  { m: 'DELETE', p: '/api/patients/:id',                                 perm: 'patient:delete', tenant: 'required' },
  { m: 'GET',    p: '/api/patients/:id',                                 perm: 'patient:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/patients/:id',                                 perm: 'patient:update', tenant: 'required' },
  { m: 'GET',    p: '/api/patients/:id/external-records',                perm: 'record_share:view_external', tenant: 'required' },
  { m: 'DELETE', p: '/api/patients/:id/link-person',                     perm: 'patient:update', tenant: 'required' },
  { m: 'POST',   p: '/api/patients/:id/link-person',                     perm: 'patient:update', tenant: 'required' },
  { m: 'GET',    p: '/api/patients/:id/record-shares',                   perm: 'record_share:grant', tenant: 'required' },
  { m: 'POST',   p: '/api/patients/:id/record-shares',                   perm: 'record_share:grant', tenant: 'required' },
  { m: 'POST',   p: '/api/patients/:id/record-shares/:shareId/revoke',   perm: 'record_share:grant', tenant: 'required' },

  // --- /api/payments -----------------------------------------------
  { m: 'GET',    p: '/api/payments/all',                                 perm: 'payment:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/payments/id/:paymentId',                       perm: 'payment:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/payments/initiate',                            perm: 'payment:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/payments/paystack/callback',                   perm: PUBLIC, tenant: 'none' },
  { m: 'GET',    p: '/api/payments/ref/:reference',                      perm: 'payment:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/payments/refund/:paymentId',                   perm: 'payment:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/payments/verify/:reference',                   perm: 'payment:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/payments/webhook/flutterwave',                 perm: PUBLIC, tenant: 'none' },
  { m: 'POST',   p: '/api/payments/webhook/paystack',                    perm: PUBLIC, tenant: 'none' },
  { m: 'POST',   p: '/api/payments/webhook/stripe',                      perm: PUBLIC, tenant: 'none' },

  // --- /api/permissions --------------------------------------------
  { m: 'GET',    p: '/api/permissions',                                  perm: 'rbac:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/permissions',                                  perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/permissions/seed',                             perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/permissions/:id',                              perm: 'rbac:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/permissions/:id',                              perm: 'rbac:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/permissions/:id',                              perm: 'rbac:update', tenant: 'required', review: true },

  // --- /api/persons ------------------------------------------------
  { m: 'GET',    p: '/api/persons/search',                               perm: 'patient:view', tenant: 'required' },
  { m: 'POST',   p: '/api/persons/self-enroll',                          perm: 'mpi:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/persons/:id',                                  perm: 'patient:view', tenant: 'required' },

  // --- /api/pharmacies ---------------------------------------------
  { m: 'GET',    p: '/api/pharmacies',                                   perm: 'facility:view', tenant: 'required' },
  { m: 'POST',   p: '/api/pharmacies',                                   perm: 'facility:manage', tenant: 'required' },
  { m: 'DELETE', p: '/api/pharmacies/:id',                               perm: 'facility:manage', tenant: 'required' },
  { m: 'GET',    p: '/api/pharmacies/:id',                               perm: 'facility:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/pharmacies/:id',                               perm: 'facility:manage', tenant: 'required' },

  // --- /api/pharmacy -----------------------------------------------
  { m: 'GET',    p: '/api/pharmacy/alerts/expiring',                     perm: 'pharmacy:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/pharmacy/alerts/low-stock',                    perm: 'pharmacy:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/pharmacy/batches/:batchId/adjust',             perm: 'pharmacy:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/pharmacy/items',                               perm: 'pharmacy:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/pharmacy/items',                               perm: 'pharmacy:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/pharmacy/items/:id',                           perm: 'pharmacy:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/pharmacy/items/:id',                           perm: 'pharmacy:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/pharmacy/items/:id',                           perm: 'pharmacy:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/pharmacy/items/:id/dispense',                  perm: 'pharmacy:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/pharmacy/items/:id/receive',                   perm: 'pharmacy:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/pharmacy/items/:id/stock',                     perm: 'pharmacy:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/pharmacy/movements',                           perm: 'pharmacy:view', tenant: 'required', review: true },

  // --- /api/plans --------------------------------------------------
  { m: 'GET',    p: '/api/plans',                                        perm: 'plan:view', tenant: 'required' },
  { m: 'POST',   p: '/api/plans',                                        perm: 'plan:manage', tenant: 'required' },
  { m: 'DELETE', p: '/api/plans/:id',                                    perm: 'plan:manage', tenant: 'required' },
  { m: 'GET',    p: '/api/plans/:id',                                    perm: 'plan:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/plans/:id',                                    perm: 'plan:manage', tenant: 'required' },

  // --- /api/portal -------------------------------------------------
  { m: 'GET',    p: '/api/portal/appointments',                          perm: 'portal:view', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/portal/dashboard',                             perm: 'portal:view', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/portal/invoices',                              perm: 'portal:view', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/portal/lab-results',                           perm: 'portal:view', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/portal/prescriptions',                         perm: 'portal:view', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/portal/profile',                               perm: 'portal:view', tenant: 'optional', review: true },

  // --- /api/prescriptions ------------------------------------------
  { m: 'POST',   p: '/api/prescriptions',                                perm: 'prescription:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/prescriptions/patient/:patientId',             perm: 'prescription:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/prescriptions/:id',                            perm: 'prescription:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/prescriptions/:id/cancel',                     perm: 'prescription:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/prescriptions/:id/dispense',                   perm: 'prescription:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/prescriptions/:id/send-to-pharmacy',           perm: 'prescription:update', tenant: 'required', review: true },

  // --- /api/queue --------------------------------------------------
  { m: 'GET',    p: '/api/queue/analytics',                              perm: 'queue:analytics', tenant: 'required' },
  { m: 'POST',   p: '/api/queue/call-next',                              perm: 'queue:call_next', tenant: 'required' },
  { m: 'POST',   p: '/api/queue/check-in',                               perm: 'queue:check_in', tenant: 'required' },
  { m: 'GET',    p: '/api/queue/list',                                   perm: 'queue:view', tenant: 'required' },
  { m: 'PATCH',  p: '/api/queue/:queueId/priority',                      perm: 'queue:update_priority', tenant: 'required' },

  // --- /api/reports ------------------------------------------------
  { m: 'GET',    p: '/api/reports/appointment-analytics',                perm: 'reports:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/reports/custom',                               perm: 'reports:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/doctor-performance',                   perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/export',                               perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/financial',                            perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/insurance-claims',                     perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/inventory-valuation',                  perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/operational-metrics',                  perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/patient-demographics',                 perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/prescription-dispensing',              perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/schedules',                            perm: 'reports:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/reports/schedules',                            perm: 'reports:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/reports/schedules/:id',                        perm: 'reports:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/schedules/:id',                        perm: 'reports:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/reports/schedules/:id',                        perm: 'reports:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/reports/schedules/:id/run',                    perm: 'reports:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/system-health',                        perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/trends',                               perm: 'reports:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reports/waitlist-no-show',                     perm: 'reports:view', tenant: 'required', review: true },

  // --- /api/reviews ------------------------------------------------
  { m: 'POST',   p: '/api/reviews',                                      perm: 'review:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/reviews/doctor/:doctorId',                     perm: 'review:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/reviews/:id',                                  perm: 'review:delete', tenant: 'required', review: true },

  // --- /api/roles --------------------------------------------------
  { m: 'GET',    p: '/api/roles',                                        perm: 'rbac:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/roles',                                        perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/roles/assign',                                 perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/roles/seed',                                   perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/roles/:id',                                    perm: 'rbac:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/roles/:id/permissions',                        perm: 'rbac:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/roles/:id/permissions',                        perm: 'rbac:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/roles/:id/permissions',                        perm: 'rbac:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/roles/:id/users',                              perm: 'rbac:view', tenant: 'required', review: true },

  // --- /api/staff --------------------------------------------------
  { m: 'GET',    p: '/api/staff',                                        perm: 'staff:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff',                                        perm: 'staff:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/attendance',                             perm: 'staff:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/leave',                                  perm: 'staff:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff/leave',                                  perm: 'staff:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/leave/:id',                              perm: 'staff:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/leave/:id/approve',                      perm: 'staff:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/leave/:id/cancel',                       perm: 'staff:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/leave/:id/reject',                       perm: 'staff:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/licences/expiring',                      perm: 'staff:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/payroll/export',                         perm: 'staff:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/reviews',                                perm: 'staff:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff/reviews',                                perm: 'staff:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/staff/reviews/:id',                            perm: 'staff:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/reviews/:id',                            perm: 'staff:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/staff/reviews/:id',                            perm: 'staff:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/reviews/:id/acknowledge',                perm: 'staff:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/reviews/:id/finalize',                   perm: 'staff:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/staff/reviews/:id/submit',                     perm: 'staff:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/shifts',                                 perm: 'staff:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff/shifts',                                 perm: 'staff:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/shifts/on-call',                         perm: 'staff:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/staff/shifts/:id',                             perm: 'staff:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/shifts/:id',                             perm: 'staff:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/staff/shifts/:id',                             perm: 'staff:update', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/staff/:id',                                    perm: 'staff:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/:id',                                    perm: 'staff:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/staff/:id',                                    perm: 'staff:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff/:id/clock-in',                           perm: 'staff:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/staff/:id/clock-out',                          perm: 'staff:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/staff/:id/leave-balance',                      perm: 'staff:view', tenant: 'required', review: true },

  // --- /api/supplies -----------------------------------------------
  { m: 'GET',    p: '/api/supplies/alerts/low-stock',                    perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/equipment',                           perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/supplies/equipment',                           perm: 'supplies:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/equipment/alerts/maintenance-due',    perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/supplies/equipment/:id',                       perm: 'supplies:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/equipment/:id',                       perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/supplies/equipment/:id',                       perm: 'supplies:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/supplies/equipment/:id/maintenance',           perm: 'supplies:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/supplies/equipment/:id/status',                perm: 'supplies:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/items',                               perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/supplies/items',                               perm: 'supplies:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/supplies/items/:id',                           perm: 'supplies:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/items/:id',                           perm: 'supplies:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/supplies/items/:id',                           perm: 'supplies:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/supplies/items/:id/adjust',                    perm: 'supplies:update', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/supplies/items/:id/issue',                     perm: 'supplies:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/supplies/items/:id/receive',                   perm: 'supplies:create', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/supplies/items/:id/wastage',                   perm: 'supplies:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/supplies/movements',                           perm: 'supplies:view', tenant: 'required', review: true },

  // --- /api/telemedicine -------------------------------------------
  { m: 'GET',    p: '/api/telemedicine/sessions',                        perm: 'telemedicine:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/telemedicine/sessions',                        perm: 'telemedicine:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/telemedicine/sessions/:id',                    perm: 'telemedicine:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/telemedicine/sessions/:id/cancel',             perm: 'telemedicine:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/telemedicine/sessions/:id/end',                perm: 'telemedicine:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/telemedicine/sessions/:id/start',              perm: 'telemedicine:update', tenant: 'required', review: true },

  // --- /api/tenant -------------------------------------------------
  { m: 'GET',    p: '/api/tenant/reminder-settings',                     perm: 'tenant:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/tenant/reminder-settings',                     perm: 'tenant:update', tenant: 'required', review: true },

  // --- /api/triage -------------------------------------------------
  { m: 'POST',   p: '/api/triage/answer',                                perm: 'triage:create', tenant: 'optional', review: true },
  { m: 'GET',    p: '/api/triage/result/:sessionId',                     perm: 'triage:view', tenant: 'optional', review: true },
  { m: 'POST',   p: '/api/triage/start',                                 perm: 'triage:create', tenant: 'optional', review: true },

  // --- /api/users --------------------------------------------------
  { m: 'GET',    p: '/api/users',                                        perm: 'user:view', tenant: 'required' },
  { m: 'GET',    p: '/api/users/search',                                 perm: 'user:view', tenant: 'required' },
  { m: 'DELETE', p: '/api/users/:id',                                    perm: 'user:delete', tenant: 'required' },
  { m: 'GET',    p: '/api/users/:id',                                    perm: 'user:view', tenant: 'required' },
  { m: 'PUT',    p: '/api/users/:id',                                    perm: 'user:update', tenant: 'required' },
  { m: 'PATCH',  p: '/api/users/:id/password',                           perm: 'user:update', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/api/users/:id/status',                             perm: 'user:manage', tenant: 'required' },

  // --- /api/visitors -----------------------------------------------
  { m: 'GET',    p: '/api/visitors',                                     perm: 'queue:view', tenant: 'required' },
  { m: 'GET',    p: '/api/visitors/active',                              perm: 'queue:view', tenant: 'required' },
  { m: 'POST',   p: '/api/visitors/check-in',                            perm: PUBLIC, tenant: 'required' },
  { m: 'POST',   p: '/api/visitors/check-out/:id',                       perm: 'visitor:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/visitors/lookup',                              perm: 'visitor:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/visitors/:id',                                 perm: 'queue:view', tenant: 'required' },

  // --- /api/vital-signs --------------------------------------------
  { m: 'POST',   p: '/api/vital-signs',                                  perm: 'vital_sign:create', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/vital-signs/patient/:patientId',               perm: 'vital_sign:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/vital-signs/patient/:patientId/latest',        perm: 'vital_sign:view', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/vital-signs/patient/:patientId/trends',        perm: 'vital_sign:view', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/vital-signs/:id',                              perm: 'vital_sign:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/vital-signs/:id',                              perm: 'vital_sign:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/vital-signs/:id',                              perm: 'vital_sign:update', tenant: 'required', review: true },

  // --- /api/wards --------------------------------------------------
  { m: 'GET',    p: '/api/wards',                                        perm: 'ward:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/api/wards',                                        perm: 'ward:create', tenant: 'required', review: true },
  { m: 'DELETE', p: '/api/wards/:id',                                    perm: 'ward:delete', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/wards/:id',                                    perm: 'ward:view', tenant: 'required', review: true },
  { m: 'PUT',    p: '/api/wards/:id',                                    perm: 'ward:update', tenant: 'required', review: true },
  { m: 'GET',    p: '/api/wards/:id/availability',                       perm: 'ward:view', tenant: 'required', review: true },

  // --- /api-docs ---------------------------------------------------
  { m: 'GET',    p: '/api-docs',                                         perm: PUBLIC, tenant: 'none' },

  // --- /auth/2fa ---------------------------------------------------
  { m: 'POST',   p: '/auth/2fa/backup-codes/regenerate',                 perm: '2fa:create', tenant: 'none', review: true },
  { m: 'POST',   p: '/auth/2fa/disable',                                 perm: '2fa:create', tenant: 'none', review: true },
  { m: 'POST',   p: '/auth/2fa/enable',                                  perm: '2fa:create', tenant: 'none', review: true },
  { m: 'POST',   p: '/auth/2fa/setup',                                   perm: '2fa:create', tenant: 'none', review: true },
  { m: 'GET',    p: '/auth/2fa/status',                                  perm: '2fa:view', tenant: 'none', review: true },
  { m: 'POST',   p: '/auth/2fa/verify',                                  perm: PUBLIC, tenant: 'none' },

  // --- /auth/forgot-password ---------------------------------------
  { m: 'POST',   p: '/auth/forgot-password',                             perm: PUBLIC, tenant: 'none' },

  // --- /auth/login -------------------------------------------------
  { m: 'POST',   p: '/auth/login',                                       perm: PUBLIC, tenant: 'none' },

  // --- /auth/logout ------------------------------------------------
  { m: 'POST',   p: '/auth/logout',                                      perm: 'logout:create', tenant: 'none', review: true },

  // --- /auth/me ----------------------------------------------------
  { m: 'GET',    p: '/auth/me',                                          perm: SELF, tenant: 'none' },

  // --- /auth/refresh-token -----------------------------------------
  { m: 'POST',   p: '/auth/refresh-token',                               perm: PUBLIC, tenant: 'none' },

  // --- /auth/register ----------------------------------------------
  { m: 'POST',   p: '/auth/register',                                    perm: PUBLIC, tenant: 'none' },

  // --- /auth/reset-password ----------------------------------------
  { m: 'POST',   p: '/auth/reset-password',                              perm: PUBLIC, tenant: 'none' },

  // --- /auth/verify-email ------------------------------------------
  { m: 'POST',   p: '/auth/verify-email',                                perm: PUBLIC, tenant: 'none' },

  // --- /health -----------------------------------------------------
  { m: 'GET',    p: '/health',                                           perm: PUBLIC, tenant: 'none' },

  // --- /live -------------------------------------------------------
  { m: 'GET',    p: '/live',                                             perm: PUBLIC, tenant: 'none' },

  // --- /notifications ----------------------------------------------
  { m: 'GET',    p: '/notifications',                                    perm: 'notification:view', tenant: 'required', review: true },
  { m: 'POST',   p: '/notifications',                                    perm: 'notification:create', tenant: 'required', review: true },

  // --- /notifications/devices --------------------------------------
  { m: 'DELETE', p: '/notifications/devices',                            perm: 'notification:delete', tenant: 'required', review: true },
  { m: 'POST',   p: '/notifications/devices',                            perm: 'notification:create', tenant: 'required', review: true },

  // --- /notifications/preferences ----------------------------------
  { m: 'GET',    p: '/notifications/preferences',                        perm: 'notification:view', tenant: 'required', review: true },
  { m: 'PATCH',  p: '/notifications/preferences',                        perm: 'notification:update', tenant: 'required', review: true },

  // --- /notifications/read-all -------------------------------------
  { m: 'PATCH',  p: '/notifications/read-all',                           perm: 'notification:update', tenant: 'required', review: true },

  // --- /notifications/unread-count ---------------------------------
  { m: 'GET',    p: '/notifications/unread-count',                       perm: 'notification:view', tenant: 'required', review: true },

  // --- /notifications/:id ------------------------------------------
  { m: 'PATCH',  p: '/notifications/:id/read',                           perm: 'notification:update', tenant: 'required', review: true },

  // --- /ready ------------------------------------------------------
  { m: 'GET',    p: '/ready',                                            perm: PUBLIC, tenant: 'none' },
];
