import { AppointmentWaitlist, WaitlistStatus } from '@modules/appointments/appointment-waitlist.model';

import { Resource, ResourceType, ResourceStatus } from '@modules/hospital/resource.model';

import { Appointment, Priority } from '@modules/appointments/appointment.model';

import { Op } from 'sequelize';

interface CreateWaitlistDTO {
  patient_id: string;
  doctor_id?: string;
  department_id?: string;
  priority: Priority;
  preferred_date_start?: Date;
  preferred_date_end?: Date;
  preferred_time_slots?: string[];
  preferred_days?: number[];
  reason?: string;
  notes?: string;
  tenant_id: string;
}

interface CreateResourceDTO {
  code: string;
  name: string;
  resource_type: ResourceType;
  description?: string;
  department_id?: string;
  location?: string;
  floor?: string;
  building?: string;
  capacity?: number;
  requires_approval?: boolean;
  features?: Record<string, any>;
  available_from?: string;
  available_until?: string;
  notes?: string;
  tenant_id: string;
}

export class SchedulerService {
  // ============ WAITLIST MANAGEMENT ============

  static async addToWaitlist(data: CreateWaitlistDTO): Promise<AppointmentWaitlist> {
    const waitlistEntry = await AppointmentWaitlist.create({
      ...data,
      status: WaitlistStatus.WAITING,
      // Set expiration to 30 days from now
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    return waitlistEntry;
  }

  static async getWaitlist(options: {
    tenantId: string;
    status?: WaitlistStatus;
    priority?: Priority;
    doctorId?: string;
    departmentId?: string;
    limit?: number;
  }): Promise<AppointmentWaitlist[]> {
    const where: any = { tenant_id: options.tenantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.priority) {
      where.priority = options.priority;
    }

    if (options.doctorId) {
      where.doctor_id = options.doctorId;
    }

    if (options.departmentId) {
      where.department_id = options.departmentId;
    }

    return await AppointmentWaitlist.findAll({
      where,
      order: [
        ['priority', 'DESC'],
        ['created_at', 'ASC']
      ],
      limit: options.limit || 50,
      include: [
        { association: 'patient', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        { association: 'doctor', attributes: ['id', 'specialization'] },
        { association: 'department', attributes: ['id', 'name'] }
      ]
    });
  }

  static async getHighPriorityWaitlist(tenantId: string): Promise<AppointmentWaitlist[]> {
    const highPriorityEntries = await this.getWaitlist({
      tenantId,
      status: WaitlistStatus.WAITING,
      limit: 100
    });

    return highPriorityEntries.filter(entry => entry.is_high_priority);
  }

  static async markAsContacted(waitlistId: string): Promise<AppointmentWaitlist> {
    const entry = await AppointmentWaitlist.findByPk(waitlistId);
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    await entry.markAsContacted();
    return entry;
  }

  static async markAsScheduled(
    waitlistId: string, 
    appointmentId: string
  ): Promise<AppointmentWaitlist> {
    const entry = await AppointmentWaitlist.findByPk(waitlistId);
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    await entry.markAsScheduled(appointmentId);
    return entry;
  }

  static async expireOldEntries(tenantId: string): Promise<number> {
    const expiredEntries = await AppointmentWaitlist.findAll({
      where: {
        tenant_id: tenantId,
        status: WaitlistStatus.WAITING,
        expires_at: { [Op.lte]: new Date() }
      }
    });

    for (const entry of expiredEntries) {
      await entry.markAsExpired();
    }

    return expiredEntries.length;
  }

  static async cancelWaitlistEntry(waitlistId: string): Promise<void> {
    const entry = await AppointmentWaitlist.findByPk(waitlistId);
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    await entry.cancel();
  }

  // ============ RESOURCE MANAGEMENT ============

  static async createResource(data: CreateResourceDTO): Promise<Resource> {
    return await Resource.create({
      ...data,
      status: ResourceStatus.AVAILABLE,
      is_active: true
    });
  }

  static async getResources(options: {
    tenantId: string;
    resourceType?: ResourceType;
    departmentId?: string;
    status?: ResourceStatus;
    activeOnly?: boolean;
  }): Promise<Resource[]> {
    const where: any = { tenant_id: options.tenantId };

    if (options.resourceType) {
      where.resource_type = options.resourceType;
    }

    if (options.departmentId) {
      where.department_id = options.departmentId;
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.activeOnly) {
      where.is_active = true;
    }

    return await Resource.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        { association: 'department', attributes: ['id', 'name', 'code'] }
      ]
    });
  }

  static async getAvailableResources(
    tenantId: string,
    resourceType?: ResourceType,
    time?: string
  ): Promise<Resource[]> {
    const resources = await this.getResources({
      tenantId,
      resourceType,
      activeOnly: true
    });

    return resources.filter(r => {
      if (!r.is_available_now) return false;
      if (time && !r.isAvailableAt(time)) return false;
      return true;
    });
  }

  static async getResourceById(resourceId: string): Promise<Resource | null> {
    return await Resource.findByPk(resourceId, {
      include: [{ association: 'department' }]
    });
  }

  static async reserveResource(resourceId: string): Promise<Resource> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.reserve();
    await resource.reload();
    return resource;
  }

  static async markResourceInUse(resourceId: string): Promise<Resource> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.markInUse();
    await resource.reload();
    return resource;
  }

  static async releaseResource(resourceId: string): Promise<Resource> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.release();
    await resource.reload();
    return resource;
  }

  static async scheduleMaintenanceResource(
    resourceId: string,
    nextMaintenanceDate?: Date
  ): Promise<Resource> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.markForMaintenance();
    
    if (nextMaintenanceDate) {
      await resource.update({ next_maintenance_due: nextMaintenanceDate });
    }

    await resource.reload();
    return resource;
  }

  static async updateResource(
    resourceId: string,
    updates: Partial<CreateResourceDTO>
  ): Promise<Resource> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.update(updates);
    return resource;
  }

  static async deactivateResource(resourceId: string): Promise<void> {
    const resource = await Resource.findByPk(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }

    await resource.update({ 
      is_active: false,
      status: ResourceStatus.OUT_OF_SERVICE
    });
  }

  // ============ RECURRING APPOINTMENTS ============

  static async createRecurringAppointment(
    appointmentData: any,
    recurrencePattern: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate: Date;
      daysOfWeek?: number[];
    }
  ): Promise<Appointment[]> {
    const appointments: Appointment[] = [];
    
    // Create parent appointment
    const parent = await Appointment.create({
      ...appointmentData,
      is_recurring: true,
      recurrence_pattern: recurrencePattern
    });

    appointments.push(parent);

    // Generate recurring instances
    const instances = this.generateRecurringDates(
      new Date(appointmentData.appointment_date),
      recurrencePattern
    );

    // Create instance appointments
    for (const date of instances) {
      const instance = await Appointment.create({
        ...appointmentData,
        appointment_date: date,
        parent_recurring_id: parent.id,
        is_recurring: false,
        recurrence_pattern: null
      });

      appointments.push(instance);
    }

    return appointments;
  }

  private static generateRecurringDates(
    startDate: Date,
    pattern: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate: Date;
      daysOfWeek?: number[];
    }
  ): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Skip the first date (parent)

    while (currentDate <= pattern.endDate) {
      // For weekly, check if current day matches preferred days
      if (pattern.frequency === 'weekly' && pattern.daysOfWeek) {
        if (pattern.daysOfWeek.includes(currentDate.getDay())) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        dates.push(new Date(currentDate));

        // Increment based on frequency
        if (pattern.frequency === 'daily') {
          currentDate.setDate(currentDate.getDate() + pattern.interval);
        } else if (pattern.frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + (7 * pattern.interval));
        } else if (pattern.frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + pattern.interval);
        }
      }

      // Safety check to prevent infinite loops
      if (dates.length > 365) {
        console.warn('Recurring appointment generation exceeded 365 instances, stopping');
        break;
      }
    }

    return dates;
  }

  static async getRecurringAppointments(parentId: string): Promise<Appointment[]> {
    return await Appointment.findAll({
      where: {
        [Op.or]: [
          { id: parentId },
          { parent_recurring_id: parentId }
        ]
      },
      order: [['appointment_date', 'ASC']]
    });
  }

  static async cancelRecurringSeries(
    parentId: string,
    cancelFutureOnly: boolean = false
  ): Promise<number> {
    const where: any = {
      parent_recurring_id: parentId
    };

    if (cancelFutureOnly) {
      where.appointment_date = { [Op.gte]: new Date() };
      where.status = { [Op.notIn]: ['completed', 'cancelled'] };
    }

    const appointments = await Appointment.findAll({ where });

    for (const apt of appointments) {
      await apt.cancel('admin', 'Recurring series cancelled');
    }

    // Cancel parent if not cancelled yet
    if (!cancelFutureOnly) {
      const parent = await Appointment.findByPk(parentId);
      if (parent && parent.status !== 'cancelled') {
        await parent.cancel('admin', 'Recurring series cancelled');
      }
    }

    return appointments.length + (cancelFutureOnly ? 0 : 1);
  }

  // ============ ANALYTICS ============

  static async getWaitlistAnalytics(tenantId: string): Promise<any> {
    const allEntries = await AppointmentWaitlist.findAll({
      where: { tenant_id: tenantId }
    });

    const byStatus = allEntries.reduce((acc: any, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {});

    const byPriority = allEntries.reduce((acc: any, entry) => {
      acc[entry.priority] = (acc[entry.priority] || 0) + 1;
      return acc;
    }, {});

    const waiting = allEntries.filter(e => e.status === WaitlistStatus.WAITING);
    const avgWaitTime = waiting.length > 0
      ? waiting.reduce((sum, e) => sum + e.wait_time_days, 0) / waiting.length
      : 0;

    return {
      total_entries: allEntries.length,
      by_status: byStatus,
      by_priority: byPriority,
      currently_waiting: waiting.length,
      average_wait_time_days: Math.round(avgWaitTime),
      high_priority_waiting: waiting.filter(e => e.is_high_priority).length
    };
  }

  static async getResourceUtilization(tenantId: string): Promise<any> {
    const resources = await this.getResources({ tenantId });

    const byType = resources.reduce((acc: any, r) => {
      if (!acc[r.resource_type]) {
        acc[r.resource_type] = {
          total: 0,
          available: 0,
          in_use: 0,
          maintenance: 0,
          out_of_service: 0
        };
      }
      
      acc[r.resource_type].total++;
      acc[r.resource_type][r.status]++;
      
      return acc;
    }, {});

    const needsMaintenance = resources.filter(r => r.needs_maintenance);

    return {
      total_resources: resources.length,
      by_type: byType,
      needs_maintenance: needsMaintenance.length,
      maintenance_due: needsMaintenance.map(r => ({
        id: r.id,
        name: r.name,
        next_due: r.next_maintenance_due
      }))
    };
  }
}
