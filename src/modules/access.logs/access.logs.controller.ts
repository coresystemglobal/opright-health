import { Request, Response } from 'express';
import { AccessLog } from '../models/AccessLog';

export const logEntry = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const log = new AccessLog({ userId });
  await log.save();
  res.status(200).json({ message: 'Entry logged' });
};

export const logExit = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const log = await AccessLog.findOne({ userId }).sort({ entryTime: -1 });
  if (log) {
    log.exitTime = new Date();
    await log.save();
    res.status(200).json({ message: 'Exit logged' });
  } else {
    res.status(404).json({ message: 'No entry found for this user' });
  }
};
