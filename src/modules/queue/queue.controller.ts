import { Request, Response } from 'express';
import { QueueManagementService } from '@modules/queue/queue-management.service';

import { QueuePriority } from '@modules/queue/queue.model';


const queueService = new QueueManagementService();

export const checkIn = async (req: Request, res: Response) => {
  try {
    const { patientId, department, priority } = req.body;
    const result = await queueService.checkIn(patientId, department, priority || QueuePriority.NORMAL);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getQueue = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    const queue = await queueService.getQueue(department as string);
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const callNext = async (req: Request, res: Response) => {
  try {
    const { department, roomNumber } = req.body;
    const next = await queueService.callNext(department, roomNumber);
    res.json({ success: true, data: next });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePriority = async (req: Request, res: Response) => {
  try {
    const { queueId } = req.params;
    const { priority } = req.body;
    const queue = await queueService.updatePriority(queueId, priority);
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { department, startDate, endDate } = req.query;
    const analytics = await queueService.getAnalytics(
      department as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
