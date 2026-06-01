import { Request, Response } from 'express';
import { AmbulanceService } from '@modules/ambulance/ambulance.service';

import { ResponseUtil } from '@utils/response.util';

const ambulanceService = new AmbulanceService();

export const requestAmbulance = async (req: Request, res: Response) => {
  try {
    const request = await ambulanceService.requestAmbulance(req.body);
    return ResponseUtil.success(res, request, 'Ambulance requested successfully', 201);
  } catch (error: any) {
    return ResponseUtil.error(res, error.message, 400);
  }
};

export const dispatchAmbulance = async (req: Request, res: Response) => {
  try {
    const { requestId, ambulanceId } = req.body;
    const result = await ambulanceService.dispatchAmbulance(requestId, ambulanceId);
    return ResponseUtil.success(res, result, 'Ambulance dispatched successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message, 400);
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, location } = req.body;
    const request = await ambulanceService.updateStatus(requestId, status, location);
    return ResponseUtil.success(res, request, 'Status updated successfully');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message, 400);
  }
};

export const getActiveRequests = async (req: Request, res: Response) => {
  try {
    const requests = await ambulanceService.getActiveRequests();
    return ResponseUtil.success(res, requests, 'Active requests retrieved');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message, 400);
  }
};

export const getAvailableAmbulances = async (req: Request, res: Response) => {
  try {
    const ambulances = await ambulanceService.getAvailableAmbulances();
    return ResponseUtil.success(res, ambulances, 'Available ambulances retrieved');
  } catch (error: any) {
    return ResponseUtil.error(res, error.message, 400);
  }
};
