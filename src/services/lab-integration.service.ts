import axios from 'axios';
import { TestOrder } from '../models/test-order.model';
import { TestResult } from '../models/test-result.model';
import { QueueService, JobType } from './queue.service';

interface LabSystemConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

interface ExternalLabOrder {
  orderId: string;
  patientId: string;
  tests: Array<{
    code: string;
    name: string;
  }>;
  priority: 'routine' | 'urgent' | 'stat';
  specimenType: string;
}

interface ExternalLabResult {
  orderId: string;
  testCode: string;
  value: string | number;
  units?: string;
  referenceRange?: string;
  status: 'preliminary' | 'final' | 'corrected';
  timestamp: string;
}

export class LabIntegrationService {
  private static configs: Map<string, LabSystemConfig> = new Map([
    ['quest', {
      baseUrl: process.env.QUEST_LAB_URL || 'https://api.questdiagnostics.com',
      apiKey: process.env.QUEST_API_KEY || '',
      timeout: 30000
    }],
    ['labcorp', {
      baseUrl: process.env.LABCORP_URL || 'https://api.labcorp.com',
      apiKey: process.env.LABCORP_API_KEY || '',
      timeout: 30000
    }]
  ]);

  static async sendOrderToLab(testOrder: TestOrder, labSystem: string = 'quest'): Promise<string> {
    const config = this.configs.get(labSystem);
    if (!config) {
      throw new Error(`Lab system ${labSystem} not configured`);
    }

    const externalOrder: ExternalLabOrder = {
      orderId: testOrder.id,
      patientId: testOrder.patient_id,
      tests: (testOrder as any).test_ids?.map((id: string) => ({
        code: `TEST_${id}`,
        name: `Test ${id}`
      })) || [],
      priority: testOrder.urgency as any,
      specimenType: 'blood' // Default, should come from test order
    };

    try {
      const response = await axios.post(
        `${config.baseUrl}/orders`,
        externalOrder,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: config.timeout
        }
      );

      // Update test order with external reference
      await testOrder.update({
        external_lab_id: (response.data as any).externalOrderId,
        status: 'sent_to_lab'
      });

      return (response.data as any).externalOrderId;
    } catch (error: any) {
      throw new Error(`Failed to send order to ${labSystem}: ${error.message}`);
    }
  }

  static async receiveLabResults(results: ExternalLabResult[], labSystem: string): Promise<void> {
    for (const result of results) {
      // Queue result processing to avoid blocking
      await QueueService.addJob(JobType.PROCESS_LAB_RESULT, {
        tenantId: 'system', // Will be determined from order
        data: { result, labSystem }
      });
    }
  }

  static async processLabResult(result: ExternalLabResult, labSystem: string): Promise<void> {
    try {
      // Find the test order
      const testOrder = await TestOrder.findOne({
        where: { id: result.orderId }
      });

      if (!testOrder) {
        console.error(`Test order ${result.orderId} not found`);
        return;
      }

      // Create or update test result
      await TestResult.upsert({
        test_order_id: testOrder.id,
        test_id: result.testCode,
        value: result.value.toString(),
        units: result.units,
        reference_range: result.referenceRange,
        status: result.status,
        result_date: new Date(result.timestamp),
        external_lab_system: labSystem
      });

      // Update order status if all results received
      const resultCount = await TestResult.count({
        where: { test_order_id: testOrder.id }
      });

      if (resultCount >= ((testOrder as any).test_ids?.length || 0)) {
        await testOrder.update({ status: 'completed' });
      }

    } catch (error) {
      console.error('Error processing lab result:', error);
    }
  }

  static async getOrderStatus(orderId: string, labSystem: string = 'quest'): Promise<any> {
    const config = this.configs.get(labSystem);
    if (!config) {
      throw new Error(`Lab system ${labSystem} not configured`);
    }

    try {
      const response = await axios.get(
        `${config.baseUrl}/orders/${orderId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          },
          timeout: config.timeout
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get order status from ${labSystem}: ${error.message}`);
    }
  }
}