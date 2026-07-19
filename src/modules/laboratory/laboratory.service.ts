import {
  LabTest,
  TestOrder,
  TestResult,
  Patient,
  Doctor,
  Appointment
} from '../../models';
import {
  TestCategory,
  SpecimenType,
  TestOrderStatus,
  TestUrgency,
  TestResultStatus,
  CreateTestOrderRequest,
  UpdateTestOrderRequest,
  SpecimenCollection,
  TestResult as TestResultInterface,
  LabReportRequest
} from '@appTypes/laboratory.types';
import { PaginationOptions, ApiResponse } from '@appTypes/common.types';
import { Op, Transaction, fn, col } from 'sequelize';

/**
 * Laboratory data is tenant-scoped: every method takes the caller's tenantId
 * and only ever reads/writes rows for that tenant. Creates stamp tenant_id,
 * reads filter by it, and by-id mutations verify the loaded row belongs to the
 * tenant (a row from another tenant reads as "not found"). The lab-test catalog
 * is per-tenant.
 */
export class LaboratoryService {
  // Lab Test Catalog Management
  static async getAllTests(
    tenantId: string,
    options: PaginationOptions & {
      category?: TestCategory;
      department?: string;
      isActive?: boolean;
      search?: string;
    } = { page: 1, limit: 50, offset: 0 }
  ): Promise<{ tests: LabTest[]; total: number }> {
    const whereClause: any = { tenant_id: tenantId };

    if (options.category) whereClause.category = options.category;
    if (options.department) whereClause.department = options.department;
    if (options.isActive !== undefined) whereClause.is_active = options.isActive;

    if (options.search) {
      whereClause[Op.or] = [
        { test_name: { [Op.iLike]: `%${options.search}%` } },
        { test_code: { [Op.iLike]: `%${options.search}%` } },
        { description: { [Op.iLike]: `%${options.search}%` } }
      ];
    }

    const { count, rows } = await LabTest.findAndCountAll({
      where: whereClause,
      limit: options.limit,
      offset: options.offset,
      order: [['test_name', 'ASC']]
    });

    return {
      tests: rows,
      total: count
    };
  }

  static async getTestById(id: string, tenantId: string): Promise<LabTest | null> {
    return LabTest.findOne({ where: { id, tenant_id: tenantId } });
  }

  static async getTestByCode(testCode: string, tenantId: string): Promise<LabTest | null> {
    return LabTest.findOne({
      where: { test_code: testCode, tenant_id: tenantId, is_active: true }
    });
  }

  static async getTestsByCategory(category: TestCategory, tenantId: string): Promise<LabTest[]> {
    return LabTest.findAll({
      where: { category, tenant_id: tenantId, is_active: true },
      order: [['test_name', 'ASC']]
    });
  }

  static async createLabTest(testData: {
    test_code: string;
    test_name: string;
    description?: string;
    category: TestCategory;
    specimen_type: SpecimenType;
    price: number;
    turnaround_time_hours?: number;
    preparation_instructions?: string;
    fasting_required?: boolean;
    special_requirements?: string;
    reference_ranges?: any[];
  }, tenantId: string): Promise<LabTest> {
    return LabTest.create({ ...testData, tenant_id: tenantId } as any);
  }

  static async updateLabTest(id: string, updates: Partial<LabTest>, tenantId: string): Promise<LabTest | null> {
    const test = await LabTest.findOne({ where: { id, tenant_id: tenantId } });
    if (!test) return null;

    const safeUpdates: any = { ...updates };
    delete safeUpdates.tenant_id; // never reassign ownership via update
    await test.update(safeUpdates);
    return test;
  }

  static async deactivateLabTest(id: string, tenantId: string): Promise<boolean> {
    const test = await LabTest.findOne({ where: { id, tenant_id: tenantId } });
    if (!test) return false;

    await test.update({ is_active: false });
    return true;
  }

  // Test Order Management
  static async createTestOrder(
    orderData: CreateTestOrderRequest,
    tenantId: string,
    transaction?: Transaction
  ): Promise<TestOrder> {
    // Validate test exists, is active, and belongs to this tenant
    const labTest = await LabTest.findOne({ where: { id: orderData.test_ids[0], tenant_id: tenantId } });
    if (!labTest || !labTest.is_active) {
      throw new Error('Lab test not found or inactive');
    }

    // Validate patient exists within this tenant
    const patient = await Patient.findOne({ where: { id: orderData.patient_id, tenant_id: tenantId } });
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Validate doctor exists
    const doctor = await Doctor.findByPk(orderData.doctor_id);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // If appointment_id provided, validate it exists
    if (orderData.appointment_id) {
      const appointment = await Appointment.findByPk(orderData.appointment_id);
      if (!appointment) {
        throw new Error('Appointment not found');
      }
    }

    // For now, create one order per test (can be enhanced for bulk orders)
    const testOrder = await TestOrder.create({
      tenant_id: tenantId,
      patient_id: orderData.patient_id,
      doctor_id: orderData.doctor_id,
      lab_test_id: orderData.test_ids[0],
      appointment_id: orderData.appointment_id,
      urgency: orderData.urgency,
      clinical_notes: orderData.clinical_notes,
      special_instructions: orderData.special_instructions,
      created_by: orderData.doctor_id // Assuming doctor creates the order
    }, { transaction });

    return testOrder;
  }

  static async getTestOrder(id: string, tenantId: string): Promise<TestOrder | null> {
    return TestOrder.findOne({
      where: { id, tenant_id: tenantId },
      include: [
        { model: Patient },
        { model: Doctor },
        { model: LabTest },
        { model: Appointment },
        { model: TestResult }
      ]
    });
  }

  static async getTestOrdersByPatient(
    patientId: string,
    tenantId: string,
    options: PaginationOptions & {
      status?: TestOrderStatus;
      dateRange?: { start: Date; end: Date };
    } = { page: 1, limit: 20, offset: 0 }
  ): Promise<{ orders: TestOrder[]; total: number }> {
    const whereClause: any = { patient_id: patientId, tenant_id: tenantId };

    if (options.status) whereClause.status = options.status;
    if (options.dateRange) {
      whereClause.created_at = {
        [Op.between]: [options.dateRange.start, options.dateRange.end]
      };
    }

    const { count, rows } = await TestOrder.findAndCountAll({
      where: whereClause,
      include: [
        { model: Doctor },
        { model: LabTest },
        { model: TestResult }
      ],
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']]
    });

    return {
      orders: rows,
      total: count
    };
  }

  static async getTestOrdersByDoctor(
    doctorId: string,
    tenantId: string,
    options: PaginationOptions & {
      status?: TestOrderStatus;
      urgency?: TestUrgency;
    } = { page: 1, limit: 20, offset: 0 }
  ): Promise<{ orders: TestOrder[]; total: number }> {
    const whereClause: any = { doctor_id: doctorId, tenant_id: tenantId };

    if (options.status) whereClause.status = options.status;
    if (options.urgency) whereClause.urgency = options.urgency;

    const { count, rows } = await TestOrder.findAndCountAll({
      where: whereClause,
      include: [
        { model: Patient },
        { model: LabTest },
        { model: TestResult }
      ],
      limit: options.limit,
      offset: options.offset,
      order: [['created_at', 'DESC']]
    });

    return {
      orders: rows,
      total: count
    };
  }

  static async getPendingOrders(tenantId: string): Promise<TestOrder[]> {
    return TestOrder.findAll({
      where: {
        tenant_id: tenantId,
        status: {
          [Op.in]: [
            TestOrderStatus.ORDERED,
            TestOrderStatus.SPECIMEN_COLLECTED,
            TestOrderStatus.PROCESSING
          ]
        }
      },
      include: [
        { model: Patient },
        { model: Doctor },
        { model: LabTest }
      ],
      order: [['urgency', 'DESC'], ['created_at', 'ASC']]
    });
  }

  static async getOverdueOrders(tenantId: string): Promise<TestOrder[]> {
    const orders = await TestOrder.getOverdueOrders();
    return orders.filter(order => order.tenant_id === tenantId && order.is_overdue);
  }

  static async updateTestOrder(
    id: string,
    updates: UpdateTestOrderRequest,
    tenantId: string
  ): Promise<TestOrder | null> {
    const order = await TestOrder.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) return null;

    await order.update(updates);
    return order;
  }

  // Specimen Collection
  static async collectSpecimen(
    orderId: string,
    collectionData: SpecimenCollection,
    tenantId: string
  ): Promise<TestOrder> {
    const order = await TestOrder.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.collectSpecimen(
      collectionData.collected_by,
      collectionData.specimen_quality,
      collectionData.collection_notes
    );

    return order;
  }

  static async startProcessing(orderId: string, tenantId: string): Promise<TestOrder> {
    const order = await TestOrder.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.startProcessing();
    return order;
  }

  // Results Management
  static async addTestResults(
    orderId: string,
    results: TestResultInterface[],
    performedBy: string,
    tenantId: string
  ): Promise<TestResult[]> {
    const order = await TestOrder.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) {
      throw new Error('Test order not found');
    }

    const testResults: TestResult[] = [];

    for (const result of results) {
      const testResult = await TestResult.create({
        tenant_id: tenantId,
        test_order_id: orderId,
        parameter_name: result.parameter_name,
        value: result.value.toString(),
        numeric_value: typeof result.value === 'number' ? result.value : null,
        units: result.units,
        reference_range: result.reference_range,
        status: result.status,
        is_critical: result.is_critical,
        notes: result.notes,
        performed_at: new Date(),
        performed_by: performedBy
      });

      testResults.push(testResult);
    }

    // Update order status
    await order.update({ status: TestOrderStatus.COMPLETED });

    // Notify patient + ordering doctor that results are ready (non-fatal)
    import('@modules/laboratory/lab-notifications.service')
      .then(({ notifyLabResultReady }) => notifyLabResultReady(order.id))
      .catch(() => {});

    return testResults;
  }

  static async getTestResults(orderId: string, tenantId: string): Promise<TestResult[]> {
    return TestResult.findAll({
      where: { test_order_id: orderId, tenant_id: tenantId },
      order: [['parameter_name', 'ASC']]
    });
  }

  static async reviewTestResults(
    orderId: string,
    reviewerId: string,
    tenantId: string
  ): Promise<TestOrder> {
    const order = await TestOrder.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.review(reviewerId);
    return order;
  }

  // Reporting and Analytics
  static async getLabReport(request: LabReportRequest, tenantId: string): Promise<any> {
    const whereClause: any = { patient_id: request.patient_id, tenant_id: tenantId };

    if (request.date_range) {
      whereClause.results_available_at = {
        [Op.between]: [
          new Date(request.date_range.start_date),
          new Date(request.date_range.end_date)
        ]
      };
    }

    const orders = await TestOrder.findAll({
      where: whereClause,
      include: [
        {
          model: LabTest,
          where: request.test_categories ?
            { category: { [Op.in]: request.test_categories } } :
            undefined
        },
        {
          model: TestResult,
          where: request.include_normal_results ?
            undefined :
            { status: { [Op.ne]: TestResultStatus.NORMAL } }
        },
        { model: Patient },
        { model: Doctor }
      ],
      order: [['results_available_at', 'DESC']]
    });

    return {
      patient_id: request.patient_id,
      report_generated_at: new Date(),
      total_tests: orders.length,
      orders: orders
    };
  }

  static async getCriticalResults(tenantId: string): Promise<TestResult[]> {
    const results = await TestResult.getCriticalResults();
    return results.filter(r => r.tenant_id === tenantId);
  }

  static async getLabStatistics(dateRange: { start: Date; end: Date }, tenantId: string): Promise<any> {
    const totalOrders = await TestOrder.count({
      where: {
        tenant_id: tenantId,
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const completedOrders = await TestOrder.count({
      where: {
        tenant_id: tenantId,
        status: TestOrderStatus.COMPLETED,
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const urgentOrders = await TestOrder.count({
      where: {
        tenant_id: tenantId,
        urgency: { [Op.in]: [TestUrgency.URGENT, TestUrgency.STAT, TestUrgency.EMERGENCY] },
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const criticalResults = await TestResult.count({
      where: {
        tenant_id: tenantId,
        is_critical: true,
        performed_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    return {
      date_range: dateRange,
      total_orders: totalOrders,
      completed_orders: completedOrders,
      completion_rate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(2) : 0,
      urgent_orders: urgentOrders,
      critical_results: criticalResults
    };
  }

  // Utility Methods
  static async cancelTestOrder(orderId: string, reason: string | undefined, tenantId: string): Promise<TestOrder> {
    const order = await TestOrder.findOne({ where: { id: orderId, tenant_id: tenantId } });
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.cancel(reason);
    return order;
  }

  static async getWorkload(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = { tenant_id: tenantId };

    if (dateRange) {
      whereClause.created_at = {
        [Op.between]: [dateRange.start, dateRange.end]
      };
    }

    const workload = await TestOrder.findAll({
      where: whereClause,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status']
    });

    return workload.reduce((acc: any, item: any) => {
      acc[item.status] = parseInt(item.dataValues.count);
      return acc;
    }, {});
  }
}
