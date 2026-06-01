import { QueueService, JobType } from './queue.service';
import { NotificationService, NotificationType } from './notification.service';
import { Appointment } from '../models/appointment.model';
import { Patient } from '../models/patient.model';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: 'appointment_created' | 'appointment_completed' | 'patient_registered' | 'lab_result_ready' | 'payment_received';
  conditions: any[];
  actions: WorkflowAction[];
  isActive: boolean;
  tenantId: string;
}

interface WorkflowAction {
  type: 'send_notification' | 'send_email' | 'create_task' | 'schedule_followup' | 'update_record' | 'generate_report';
  parameters: any;
  delay?: number; // in minutes
}

export class WorkflowAutomationService {
  private static rules: Map<string, WorkflowRule> = new Map();

  static initializeDefaultWorkflows(tenantId: string): void {
    const defaultRules: WorkflowRule[] = [
      {
        id: 'appointment-reminder',
        name: 'Appointment Reminder',
        trigger: 'appointment_created',
        conditions: [],
        actions: [
          {
            type: 'send_notification',
            parameters: {
              type: NotificationType.APPOINTMENT_REMINDER,
              title: 'Appointment Scheduled',
              message: 'Your appointment has been scheduled'
            }
          },
          {
            type: 'send_email',
            parameters: {
              template: 'appointment-confirmation',
              delay: 1440 // 24 hours before
            },
            delay: 1440
          }
        ],
        isActive: true,
        tenantId
      },
      {
        id: 'post-appointment-followup',
        name: 'Post-Appointment Follow-up',
        trigger: 'appointment_completed',
        conditions: [{ field: 'appointment_type', operator: 'equals', value: 'consultation' }],
        actions: [
          {
            type: 'schedule_followup',
            parameters: {
              days: 7,
              type: 'phone_call'
            },
            delay: 10080 // 7 days
          },
          {
            type: 'send_email',
            parameters: {
              template: 'post-visit-survey'
            },
            delay: 60 // 1 hour
          }
        ],
        isActive: true,
        tenantId
      },
      {
        id: 'new-patient-onboarding',
        name: 'New Patient Onboarding',
        trigger: 'patient_registered',
        conditions: [],
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'welcome-packet'
            }
          },
          {
            type: 'create_task',
            parameters: {
              title: 'Complete patient intake',
              assignedTo: 'registration_staff',
              priority: 'normal'
            }
          }
        ],
        isActive: true,
        tenantId
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  static async triggerWorkflow(
    trigger: WorkflowRule['trigger'], 
    data: any, 
    tenantId: string
  ): Promise<void> {
    const applicableRules = Array.from(this.rules.values()).filter(
      rule => rule.trigger === trigger && rule.tenantId === tenantId && rule.isActive
    );

    for (const rule of applicableRules) {
      if (this.evaluateConditions(rule.conditions, data)) {
        await this.executeActions(rule.actions, data, tenantId);
      }
    }
  }

  private static evaluateConditions(conditions: any[], data: any): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = data[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'greater_than':
          return fieldValue > condition.value;
        case 'less_than':
          return fieldValue < condition.value;
        case 'contains':
          return fieldValue && fieldValue.includes(condition.value);
        default:
          return true;
      }
    });
  }

  private static async executeActions(actions: WorkflowAction[], data: any, tenantId: string): Promise<void> {
    for (const action of actions) {
      if (action.delay) {
        // Schedule delayed action
        await QueueService.addJob(JobType.SEND_NOTIFICATION, {
          tenantId,
          data: { action, triggerData: data }
        }, {
          delay: action.delay * 60 * 1000 // Convert minutes to milliseconds
        });
      } else {
        // Execute immediately
        await this.executeAction(action, data, tenantId);
      }
    }
  }

  private static async executeAction(action: WorkflowAction, data: any, tenantId: string): Promise<void> {
    switch (action.type) {
      case 'send_notification':
        await NotificationService.sendNotification({
          type: action.parameters.type,
          title: action.parameters.title,
          message: this.interpolateMessage(action.parameters.message, data),
          tenantId,
          userId: data.patientId || data.userId
        });
        break;

      case 'send_email':
        await QueueService.addJob(JobType.SEND_EMAIL, {
          tenantId,
          data: {
            template: action.parameters.template,
            to: data.email,
            data
          }
        });
        break;

      case 'create_task':
        // Create task in task management system
        console.log('Creating task:', action.parameters.title);
        break;

      case 'schedule_followup':
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + action.parameters.days);
        
        // Schedule follow-up appointment or call
        console.log('Scheduling follow-up for:', followupDate);
        break;

      case 'update_record':
        // Update patient or appointment record
        if (data.patientId && action.parameters.updates) {
          await Patient.update(action.parameters.updates, {
            where: { id: data.patientId, tenant_id: tenantId }
          });
        }
        break;

      case 'generate_report':
        await QueueService.addJob(JobType.GENERATE_REPORT, {
          tenantId,
          data: {
            reportType: action.parameters.reportType,
            parameters: action.parameters
          }
        });
        break;
    }
  }

  private static interpolateMessage(message: string, data: any): string {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  static addCustomRule(rule: WorkflowRule): void {
    this.rules.set(rule.id, rule);
  }

  static removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  static getActiveRules(tenantId: string): WorkflowRule[] {
    return Array.from(this.rules.values()).filter(
      rule => rule.tenantId === tenantId && rule.isActive
    );
  }

  static async processScheduledWorkflow(jobData: any): Promise<void> {
    const { action, triggerData } = jobData.data;
    await this.executeAction(action, triggerData, jobData.tenantId);
  }

  // Predefined workflow templates
  static getWorkflowTemplates(): Partial<WorkflowRule>[] {
    return [
      {
        name: 'Lab Result Notification',
        trigger: 'lab_result_ready',
        actions: [
          {
            type: 'send_notification',
            parameters: {
              type: NotificationType.LAB_RESULT,
              title: 'Lab Results Available',
              message: 'Your lab results are ready for review'
            }
          }
        ]
      },
      {
        name: 'Payment Confirmation',
        trigger: 'payment_received',
        actions: [
          {
            type: 'send_email',
            parameters: {
              template: 'payment-receipt'
            }
          }
        ]
      }
    ];
  }
}