import { Queue, QueuePriority } from '../models/queue.model';
import { Patient } from '../models/patient.model';
import { Op } from 'sequelize';
import sequelize from '../core/database';

export class QueueManagementService {
  async checkIn(patientId: string, department: string, priority: QueuePriority = QueuePriority.NORMAL) {
    const tagNumber = await this.generateTagNumber(department);
    
    const queue = await Queue.create({
      patient_id: patientId,
      tag_number: tagNumber,
      priority,
      department,
      arrival_time: new Date()
    });

    const position = await this.getQueuePosition(queue.id);
    const estimatedWait = await this.estimateWaitTime(department);

    return { queue, position, estimatedWait };
  }

  async getQueue(department?: string) {
    const where: any = { attended: false };
    if (department) where.department = department;

    return await Queue.findAll({
      where,
      include: [{ model: Patient, attributes: ['id', 'first_name', 'last_name', 'mrn'] }],
      order: [
        [sequelize.literal(`CASE 
          WHEN priority = 'emergency' THEN 1
          WHEN priority = 'delivery' THEN 2
          WHEN priority = 'urgent' THEN 3
          ELSE 4 END`), 'ASC'],
        ['arrival_time', 'ASC']
      ]
    });
  }

  async callNext(department: string, roomNumber?: string) {
    const queue = await this.getQueue(department);
    if (!queue.length) return null;

    const next = queue[0];
    next.attended = true;
    next.attended_time = new Date();
    if (roomNumber) next.room_number = roomNumber;
    await next.save();

    return next;
  }

  async updatePriority(queueId: string, priority: QueuePriority) {
    const queue = await Queue.findByPk(queueId);
    if (!queue || queue.attended) throw new Error('Queue entry not found or already attended');
    
    queue.priority = priority;
    await queue.save();
    return queue;
  }

  async getAnalytics(department?: string, startDate?: Date, endDate?: Date) {
    const where: any = { attended: true };
    if (department) where.department = department;
    if (startDate || endDate) {
      where.attended_time = {};
      if (startDate) where.attended_time[Op.gte] = startDate;
      if (endDate) where.attended_time[Op.lte] = endDate;
    }

    const records = await Queue.findAll({ where });
    
    const avgWaitTime = records.reduce((sum, r) => {
      const wait = r.attended_time!.getTime() - r.arrival_time.getTime();
      return sum + wait;
    }, 0) / (records.length || 1);

    const priorityCounts = records.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatients: records.length,
      avgWaitTimeMinutes: Math.round(avgWaitTime / 60000),
      priorityCounts,
      throughputPerHour: records.length / ((endDate?.getTime()! - startDate?.getTime()!) / 3600000 || 1)
    };
  }

  private async generateTagNumber(department: string): Promise<string> {
    const prefix = department.substring(0, 1).toUpperCase();
    const count = await Queue.count({
      where: {
        department,
        arrival_time: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }
      }
    });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  private async getQueuePosition(queueId: string): Promise<number> {
    const queue = await Queue.findByPk(queueId);
    if (!queue) return 0;

    const ahead = await Queue.count({
      where: {
        department: queue.department,
        attended: false,
        [Op.or]: [
          sequelize.literal(`CASE 
            WHEN priority = 'emergency' THEN 1
            WHEN priority = 'delivery' THEN 2
            WHEN priority = 'urgent' THEN 3
            ELSE 4 END < CASE 
            WHEN '${queue.priority}' = 'emergency' THEN 1
            WHEN '${queue.priority}' = 'delivery' THEN 2
            WHEN '${queue.priority}' = 'urgent' THEN 3
            ELSE 4 END`),
          {
            priority: queue.priority,
            arrival_time: { [Op.lt]: queue.arrival_time }
          }
        ]
      }
    });

    return ahead + 1;
  }

  private async estimateWaitTime(department: string): Promise<number> {
    const recentAttended = await Queue.findAll({
      where: {
        department,
        attended: true,
        attended_time: { [Op.gte]: new Date(Date.now() - 3600000) }
      },
      limit: 10
    });

    if (!recentAttended.length) return 15;

    const avgTime = recentAttended.reduce((sum, r) => {
      return sum + (r.attended_time!.getTime() - r.arrival_time.getTime());
    }, 0) / recentAttended.length;

    const waiting = await Queue.count({ where: { department, attended: false } });
    return Math.round((avgTime * waiting) / 60000);
  }
}
