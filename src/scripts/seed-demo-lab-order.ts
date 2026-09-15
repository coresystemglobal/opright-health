/**
 * Dev helper: seeds one completed lab order (with results) for the test patient
 * so the patient web client's Lab Reports page shows populated data. Idempotent
 * per order_number. Not part of the normal seed set.
 *
 *   ts-node -r tsconfig-paths/register src/scripts/seed-demo-lab-order.ts
 */
import sequelize from '../core/database';
import { LabTest } from '../modules/laboratory/lab-test.model';
import { TestOrder } from '../modules/laboratory/test-order.model';
import { TestResult } from '../modules/laboratory/test-result.model';
import {
  TestCategory,
  SpecimenType,
  TestOrderStatus,
  TestUrgency,
  TestResultStatus,
} from '../types/laboratory.types';

const TENANT = 'a0000000-0000-0000-0000-000000000001';
const PATIENT = 'c0000000-0000-0000-0000-000000000001';
const DOCTOR = 'd0000000-0000-0000-0000-000000000002';
const DOCTOR_USER = 'b0000000-0000-0000-0000-000000000004';
const ORDER_NUMBER = 'ORD-DEMO-0001';

async function run() {
  await sequelize.authenticate();
  console.log('Database connected.');

  const [test] = await LabTest.findOrCreate({
    where: { test_code: 'CBC' },
    defaults: {
      tenant_id: TENANT,
      test_code: 'CBC',
      test_name: 'Complete Blood Count (CBC)',
      description: 'Measures red cells, white cells and platelets.',
      category: TestCategory.HEMATOLOGY,
      specimen_type: SpecimenType.BLOOD,
      price: 45,
      turnaround_time_hours: 24,
    } as any,
  });

  const existing = await TestOrder.findOne({ where: { order_number: ORDER_NUMBER } });
  if (existing) {
    console.log(`Order ${ORDER_NUMBER} already exists (${existing.id}) — skipping.`);
    return;
  }

  const order = await TestOrder.create({
    tenant_id: TENANT,
    order_number: ORDER_NUMBER,
    patient_id: PATIENT,
    doctor_id: DOCTOR,
    lab_test_id: (test as any).id,
    status: TestOrderStatus.COMPLETED,
    urgency: TestUrgency.ROUTINE,
    clinical_notes: 'Routine screening — results within expected ranges apart from mild leukocytosis.',
    created_by: DOCTOR_USER,
  } as any);

  await TestResult.bulkCreate([
    {
      tenant_id: TENANT,
      test_order_id: (order as any).id,
      patient_id: PATIENT,
      lab_test_id: (test as any).id,
      parameter_name: 'Hemoglobin',
      value: '13.6',
      numeric_value: 13.6,
      units: 'g/dL',
      status: TestResultStatus.NORMAL,
    },
    {
      tenant_id: TENANT,
      test_order_id: (order as any).id,
      patient_id: PATIENT,
      lab_test_id: (test as any).id,
      parameter_name: 'White Blood Cells',
      value: '11.4',
      numeric_value: 11.4,
      units: '10^9/L',
      status: TestResultStatus.ABNORMAL,
    },
  ] as any[]);

  console.log(`Created order ${ORDER_NUMBER} (${(order as any).id}) with 2 results.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-demo-lab-order failed:', err);
    process.exit(1);
  });
