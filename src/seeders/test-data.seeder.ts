/**
 * Comprehensive Test Data Seeder
 *
 * Seeds the database with realistic test data for all major entities.
 * Idempotent — skips records that already exist (by id or unique key).
 *
 * Usage:
 *   npx ts-node src/scripts/seed-test-data.ts
 */

import bcrypt from 'bcryptjs';
import testData from './test-data.json';
import { Tenant } from '@modules/tenancy/tenant.model';
import { Role, RoleType } from '@modules/rbac/role.model';
import { Permission } from '@modules/rbac/permission.model';
import { RolePermission } from '@modules/rbac/role-permission.model';
import { User } from '@modules/users/user.model';
import { Patient } from '@modules/patients/patient.model';
import { Doctor } from '@modules/doctors/doctor.model';
import { Hospital } from '@modules/hospital/hospital.model';
import { Appointment } from '@modules/appointments/appointment.model';
import { Invoice } from '@modules/billing/invoice.model';
import { Payment } from '@modules/billing/payment.model';
import { LabTest } from '@modules/laboratory/lab-test.model';
import { Subscription } from '@modules/billing/subscription.model';
import { FAQ } from '@modules/faq/faq.model';

const BCRYPT_SALT_ROUNDS = 10; // faster for seeding; production uses 12

async function findOrCreate<T extends { findByPk: Function; create: Function }>(
  model: T,
  id: string,
  data: Record<string, any>,
  label: string,
): Promise<any> {
  const existing = await model.findByPk(id);
  if (existing) {
    console.log(`  [skip] ${label} "${id}" already exists`);
    return existing;
  }
  const record = await model.create({ id, ...data });
  console.log(`  [created] ${label} "${id}"`);
  return record;
}

export class TestSeeder {
  static async seedAll(): Promise<void> {
    console.log('\n========================================');
    console.log('  HMS Test Data Seeder');
    console.log('========================================\n');

    await this.seedTenants();
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedRolePermissions();
    await this.seedUsers();
    await this.seedPatients();
    await this.seedDoctors();
    await this.seedHospitals();
    await this.seedAppointments();
    await this.seedInvoices();
    await this.seedPayments();
    await this.seedLabTests();
    await this.seedSubscriptions();
    await this.seedFAQs();

    console.log('\n========================================');
    console.log('  Seeding complete!');
    console.log('========================================\n');
  }

  // ──────────────────────────────────────────────
  // Tenants
  // ──────────────────────────────────────────────
  private static async seedTenants(): Promise<void> {
    console.log('→ Seeding tenants...');
    for (const t of testData.tenants as any[]) {
      await findOrCreate(Tenant, t.id, {
        name: t.name,
        subdomain: t.subdomain,
        status: t.status,
        contact_email: t.contact_email,
        contact_phone: t.contact_phone,
        address: t.address,
      }, 'Tenant');
    }
  }

  // ──────────────────────────────────────────────
  // Roles
  // ──────────────────────────────────────────────
  private static async seedRoles(): Promise<void> {
    console.log('→ Seeding roles...');
    for (const r of testData.roles as any[]) {
      const existing = await Role.findOne({ where: { role: r.role } });
      if (existing) {
        console.log(`  [skip] Role "${r.role}" already exists`);
        continue;
      }
      await Role.create(r);
      console.log(`  [created] Role "${r.role}"`);
    }
  }

  // ──────────────────────────────────────────────
  // Permissions
  // ──────────────────────────────────────────────
  private static async seedPermissions(): Promise<void> {
    console.log('→ Seeding permissions...');
    for (const p of testData.permissions as any[]) {
      const existing = await Permission.findOne({ where: { name: p.name } });
      if (existing) {
        console.log(`  [skip] Permission "${p.name}" already exists`);
        continue;
      }
      await Permission.create(p);
      console.log(`  [created] Permission "${p.name}"`);
    }
  }

  // ──────────────────────────────────────────────
  // Role → Permission mappings
  // ──────────────────────────────────────────────
  private static async seedRolePermissions(): Promise<void> {
    console.log('→ Seeding role-permission mappings...');
    const allPermissions = await Permission.findAll();
    const roleMap = testData.rolePermissions as Record<string, string[] | '__ALL__'>;

    for (const [roleName, permNames] of Object.entries(roleMap)) {
      const role = await Role.findOne({ where: { role: roleName } });
      if (!role) {
        console.log(`  [warn] Role "${roleName}" not found, skipping`);
        continue;
      }

      const permsToAssign =
        permNames === '__ALL__'
          ? allPermissions
          : allPermissions.filter((p: any) => (permNames as string[]).includes(p.name));

      for (const perm of permsToAssign) {
        const exists = await RolePermission.findOne({
          where: { role_id: role.id, permission_id: perm.id },
        });
        if (!exists) {
          await RolePermission.create({ role_id: role.id, permission_id: perm.id });
        }
      }
      console.log(`  [ok] ${roleName} → ${permsToAssign.length} permissions`);
    }
  }

  // ──────────────────────────────────────────────
  // Users (passwords hashed with bcrypt)
  // ──────────────────────────────────────────────
  private static async seedUsers(): Promise<void> {
    console.log('→ Seeding users...');

    // Resolve role IDs for fast lookup
    const roleCache: Record<string, string | undefined> = {};
    for (const roleType of Object.values(RoleType)) {
      const role = await Role.findOne({ where: { role: roleType } });
      if (role) roleCache[roleType] = role.id;
    }

    for (const u of testData.users as any[]) {
      const existing = await User.findByPk(u.id);
      if (existing) {
        console.log(`  [skip] User "${u.email}" already exists`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(u.password, BCRYPT_SALT_ROUNDS);

      await User.create({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        password: hashedPassword,
        phone: u.phone,
        verified: u.verified,
        is_active: u.is_active,
        tenant_id: u.tenant_id,
        role_id: roleCache[u.role],
        failed_login_attempts: u.failed_login_attempts ?? 0,
        locked_until: u.locked_until ?? null,
      });
      console.log(`  [created] User "${u.email}" (role: ${u.role})`);
    }
  }

  // ──────────────────────────────────────────────
  // Patients
  // ──────────────────────────────────────────────
  private static async seedPatients(): Promise<void> {
    console.log('→ Seeding patients...');
    for (const p of testData.patients as any[]) {
      await findOrCreate(Patient, p.id, {
        mrn: p.mrn,
        first_name: p.first_name,
        last_name: p.last_name,
        date_of_birth: p.date_of_birth,
        gender: p.gender,
        phone: p.phone,
        email: p.email,
        address: p.address,
        emergency_contact_name: p.emergency_contact_name,
        emergency_contact_phone: p.emergency_contact_phone,
        user_id: p.user_id ?? null,
        tenant_id: p.tenant_id,
      }, 'Patient');
    }
  }

  // ──────────────────────────────────────────────
  // Doctors
  // ──────────────────────────────────────────────
  private static async seedDoctors(): Promise<void> {
    console.log('→ Seeding doctors...');
    for (const d of testData.doctors as any[]) {
      await findOrCreate(Doctor, d.id, {
        user_id: d.user_id,
        specialization: d.specialization,
        license_number: d.license_number,
        consultation_fee: d.consultation_fee,
        experience_years: d.experience_years,
        qualification: d.qualification,
        department: d.department,
        is_available: d.is_available,
        working_hours_start: d.working_hours_start,
        working_hours_end: d.working_hours_end,
        working_days: d.working_days,
        appointment_duration_minutes: d.appointment_duration_minutes,
        max_appointments_per_day: d.max_appointments_per_day,
      }, 'Doctor');
    }
  }

  // ──────────────────────────────────────────────
  // Hospitals
  // ──────────────────────────────────────────────
  private static async seedHospitals(): Promise<void> {
    console.log('→ Seeding hospitals...');
    for (const h of testData.hospitals as any[]) {
      await findOrCreate(Hospital, h.id, {
        name: h.name,
        short_name: h.short_name,
        license_number: h.license_number,
        hospital_type: h.hospital_type,
        description: h.description,
        address: h.address,
        city: h.city,
        state: h.state,
        postal_code: h.postal_code,
        country: h.country,
        phone: h.phone,
        emergency_phone: h.emergency_phone,
        email: h.email,
        website: h.website,
        bed_capacity: h.bed_capacity,
        icu_beds: h.icu_beds ?? null,
        emergency_beds: h.emergency_beds ?? null,
        is_active: h.is_active,
        is_24_hours: h.is_24_hours,
        visiting_hours_start: h.visiting_hours_start ?? null,
        visiting_hours_end: h.visiting_hours_end ?? null,
        accreditation_status: h.accreditation_status,
        services_offered: h.services_offered,
        specialties: h.specialties,
      }, 'Hospital');
    }
  }

  // ──────────────────────────────────────────────
  // Appointments
  // ──────────────────────────────────────────────
  private static async seedAppointments(): Promise<void> {
    console.log('→ Seeding appointments...');
    for (const a of testData.appointments as any[]) {
      await findOrCreate(Appointment, a.id, {
        patient_id: a.patient_id,
        doctor_id: a.doctor_id,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        duration_minutes: a.duration_minutes,
        status: a.status,
        appointment_type: a.appointment_type,
        priority: a.priority,
        notes: a.notes ?? null,
        chief_complaint: a.chief_complaint ?? null,
        diagnosis: a.diagnosis ?? null,
        created_by: a.created_by,
        consultation_fee: a.consultation_fee,
        is_follow_up: a.is_follow_up,
        cancellation_reason: a.cancellation_reason ?? null,
        completed_at: a.completed_at ?? null,
      }, 'Appointment');
    }
  }

  // ──────────────────────────────────────────────
  // Invoices
  // ──────────────────────────────────────────────
  private static async seedInvoices(): Promise<void> {
    console.log('→ Seeding invoices...');
    for (const inv of testData.invoices as any[]) {
      await findOrCreate(Invoice, inv.id, {
        invoice_number: inv.invoice_number,
        patient_id: inv.patient_id,
        doctor_id: inv.doctor_id,
        appointment_id: inv.appointment_id ?? null,
        invoice_type: inv.invoice_type,
        description: inv.description,
        subtotal: inv.subtotal,
        tax_rate: inv.tax_rate,
        tax_amount: inv.tax_amount,
        discount_amount: inv.discount_amount,
        total_amount: inv.total_amount,
        paid_amount: inv.paid_amount,
        payment_status: inv.payment_status,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        paid_at: inv.paid_at ?? null,
      }, 'Invoice');
    }
  }

  // ──────────────────────────────────────────────
  // Payments
  // ──────────────────────────────────────────────
  private static async seedPayments(): Promise<void> {
    console.log('→ Seeding payments...');
    for (const pay of testData.payments as any[]) {
      await findOrCreate(Payment, pay.id, {
        invoice_id: pay.invoice_id,
        amount: pay.amount,
        payment_method: pay.payment_method,
        payment_status: pay.payment_status,
        payment_date: pay.payment_date,
        transaction_id: pay.transaction_id,
        payment_processor: pay.payment_processor,
        currency: pay.currency,
        card_last_four: pay.card_last_four ?? null,
        card_brand: pay.card_brand ?? null,
        created_by: pay.created_by,
      }, 'Payment');
    }
  }

  // ──────────────────────────────────────────────
  // Lab Tests
  // ──────────────────────────────────────────────
  private static async seedLabTests(): Promise<void> {
    console.log('→ Seeding lab tests...');
    for (const lt of testData.labTests as any[]) {
      await findOrCreate(LabTest, lt.id, {
        test_code: lt.test_code,
        test_name: lt.test_name,
        description: lt.description,
        category: lt.category,
        specimen_type: lt.specimen_type,
        department: lt.department,
        price: lt.price,
        turnaround_time_hours: lt.turnaround_time_hours,
        fasting_required: lt.fasting_required,
        preparation_instructions: lt.preparation_instructions ?? null,
        is_active: lt.is_active,
      }, 'LabTest');
    }
  }

  // ──────────────────────────────────────────────
  // Subscriptions
  // ──────────────────────────────────────────────
  private static async seedSubscriptions(): Promise<void> {
    console.log('→ Seeding subscriptions...');
    for (const sub of testData.subscriptions as any[]) {
      await findOrCreate(Subscription, sub.id, {
        tenant_id: sub.tenant_id,
        plan_type: sub.plan_type,
        billing_cycle: sub.billing_cycle,
        status: sub.status,
        amount: sub.amount,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
      }, 'Subscription');
    }
  }

  // ──────────────────────────────────────────────
  // FAQs
  // ──────────────────────────────────────────────
  private static async seedFAQs(): Promise<void> {
    console.log('→ Seeding FAQs...');
    for (const faq of testData.faqs as any[]) {
      await findOrCreate(FAQ, faq.id, {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        is_active: faq.is_active,
        sort_order: faq.sort_order,
      }, 'FAQ');
    }
  }
}

export default TestSeeder;
