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

export class LaboratoryService {
  // Lab Test Catalog Management
  static async getAllTests(
    options: PaginationOptions & { 
      category?: TestCategory;
      department?: string;
      isActive?: boolean;
      search?: string;
    } = { page: 1, limit: 50, offset: 0 }
  ): Promise<{ tests: LabTest[]; total: number }> {
    const whereClause: any = {};
    
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

  static async getTestById(id: string): Promise<LabTest | null> {
    return LabTest.findByPk(id);
  }

  static async getTestByCode(testCode: string): Promise<LabTest | null> {
    return LabTest.findOne({
      where: { test_code: testCode, is_active: true }
    });
  }

  static async getTestsByCategory(category: TestCategory): Promise<LabTest[]> {
    return LabTest.getTestsByCategory(category);
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
  }): Promise<LabTest> {
    return LabTest.create(testData);
  }

  static async updateLabTest(id: string, updates: Partial<LabTest>): Promise<LabTest | null> {
    const test = await LabTest.findByPk(id);
    if (!test) return null;

    await test.update(updates);
    return test;
  }

  static async deactivateLabTest(id: string): Promise<boolean> {
    const test = await LabTest.findByPk(id);
    if (!test) return false;

    await test.update({ is_active: false });
    return true;
  }

  // Test Order Management
  static async createTestOrder(
    orderData: CreateTestOrderRequest,
    transaction?: Transaction
  ): Promise<TestOrder> {
    // Validate test exists and is active
    const labTest = await LabTest.findByPk(orderData.test_ids[0]);
    if (!labTest || !labTest.is_active) {
      throw new Error('Lab test not found or inactive');
    }

    // Validate patient exists
    const patient = await Patient.findByPk(orderData.patient_id);
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

  static async getTestOrder(id: string): Promise<TestOrder | null> {
    return TestOrder.findByPk(id, {
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
    options: PaginationOptions & { 
      status?: TestOrderStatus;
      dateRange?: { start: Date; end: Date };
    } = { page: 1, limit: 20, offset: 0 }
  ): Promise<{ orders: TestOrder[]; total: number }> {
    const whereClause: any = { patient_id: patientId };
    
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
    options: PaginationOptions & { 
      status?: TestOrderStatus;
      urgency?: TestUrgency;
    } = { page: 1, limit: 20, offset: 0 }
  ): Promise<{ orders: TestOrder[]; total: number }> {
    const whereClause: any = { doctor_id: doctorId };
    
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

  static async getPendingOrders(): Promise<TestOrder[]> {
    return TestOrder.findAll({
      where: {
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

  static async getOverdueOrders(): Promise<TestOrder[]> {
    const orders = await TestOrder.getOverdueOrders();
    return orders.filter(order => order.is_overdue);
  }

  static async updateTestOrder(
    id: string,
    updates: UpdateTestOrderRequest
  ): Promise<TestOrder | null> {
    const order = await TestOrder.findByPk(id);
    if (!order) return null;

    await order.update(updates);
    return order;
  }

  // Specimen Collection
  static async collectSpecimen(
    orderId: string,
    collectionData: SpecimenCollection
  ): Promise<TestOrder> {
    const order = await TestOrder.findByPk(orderId);
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

  static async startProcessing(orderId: string): Promise<TestOrder> {
    const order = await TestOrder.findByPk(orderId);
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
    performedBy: string
  ): Promise<TestResult[]> {
    const order = await TestOrder.findByPk(orderId);
    if (!order) {
      throw new Error('Test order not found');
    }

    const testResults: TestResult[] = [];

    for (const result of results) {
      const testResult = await TestResult.create({
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

    return testResults;
  }

  static async getTestResults(orderId: string): Promise<TestResult[]> {
    return TestResult.findAll({
      where: { test_order_id: orderId },
      order: [['parameter_name', 'ASC']]
    });
  }

  static async reviewTestResults(
    orderId: string,
    reviewerId: string
  ): Promise<TestOrder> {
    const order = await TestOrder.findByPk(orderId);
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.review(reviewerId);
    return order;
  }

  // Reporting and Analytics
  static async getLabReport(request: LabReportRequest): Promise<any> {
    const whereClause: any = { patient_id: request.patient_id };
    
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

  static async getCriticalResults(): Promise<TestResult[]> {
    return TestResult.getCriticalResults();
  }

  static async getLabStatistics(dateRange: { start: Date; end: Date }): Promise<any> {
    const totalOrders = await TestOrder.count({
      where: {
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const completedOrders = await TestOrder.count({
      where: {
        status: TestOrderStatus.COMPLETED,
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const urgentOrders = await TestOrder.count({
      where: {
        urgency: { [Op.in]: [TestUrgency.URGENT, TestUrgency.STAT, TestUrgency.EMERGENCY] },
        created_at: {
          [Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    const criticalResults = await TestResult.count({
      where: {
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
  static async cancelTestOrder(orderId: string, reason?: string): Promise<TestOrder> {
    const order = await TestOrder.findByPk(orderId);
    if (!order) {
      throw new Error('Test order not found');
    }

    await order.cancel(reason);
    return order;
  }

  static async getWorkload(dateRange?: { start: Date; end: Date }): Promise<any> {
    const whereClause: any = {};
    
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