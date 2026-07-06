import { Request, Response } from 'express';
import { clinicalNoteService } from '@modules/clinical/clinical-note.service';

import { ResponseUtil } from '@utils/response.util';
import { PaginationQuery } from '@appTypes/common.types';
import { NoteType } from '@modules/clinical/clinical-note.model';

const clinicalNoteController = {
  createNote: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
      const createdBy = (req as any).user?.userId;

      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      if (!createdBy) return ResponseUtil.unauthorized(res);

      const note = await clinicalNoteService.createNote({
        ...req.body,
        created_by: createdBy,
        tenant_id: tenantId
      });

      return ResponseUtil.success(res, note, 'Clinical note created successfully', 201);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('required') || error.message.includes('SOAP note requires'))) {
        return ResponseUtil.validationError(res, [error.message]);
      }
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to create clinical note', 500, [msg]);
    }
  },

  getPatientNotes: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { patientId } = req.params;
      const { page = '1', limit = '10', note_type } = req.query;

      const paginationQuery: PaginationQuery = { page: page as string, limit: limit as string };

      const result = await clinicalNoteService.getPatientNotes(
        patientId,
        paginationQuery,
        note_type as NoteType | undefined
      );

      return ResponseUtil.paginated(res, result.notes, result.count, result.page, result.limit, 'Clinical notes retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid patient')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve clinical notes', 500, [msg]);
    }
  },

  getNoteById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const note = await clinicalNoteService.getNoteById(id);
      return ResponseUtil.success(res, note, 'Clinical note retrieved successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Clinical note not found') return ResponseUtil.notFound(res, 'Clinical note not found');
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to retrieve clinical note', 500, [msg]);
    }
  },

  updateNote: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      const note = await clinicalNoteService.updateNote(id, req.body, userId);
      return ResponseUtil.success(res, note, 'Clinical note updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Clinical note not found') return ResponseUtil.notFound(res, 'Clinical note not found');
      if (error instanceof Error && error.message.includes('cannot be edited')) return ResponseUtil.forbidden(res, error.message);
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to update clinical note', 500, [msg]);
    }
  },

  lockNote: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.userId;
      if (!userId) return ResponseUtil.unauthorized(res);

      const note = await clinicalNoteService.lockNote(id, userId);
      return ResponseUtil.success(res, note, 'Clinical note locked successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Clinical note not found') return ResponseUtil.notFound(res, 'Clinical note not found');
      if (error instanceof Error && error.message.includes('already locked')) return ResponseUtil.conflict(res, error.message);
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to lock clinical note', 500, [msg]);
    }
  },

  deleteNote: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      await clinicalNoteService.deleteNote(id);
      return ResponseUtil.success(res, null, 'Clinical note deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Clinical note not found') return ResponseUtil.notFound(res, 'Clinical note not found');
      if (error instanceof Error && error.message.includes('locked')) return ResponseUtil.forbidden(res, error.message);
      if (error instanceof Error && error.message.includes('Invalid')) return ResponseUtil.validationError(res, [error.message]);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return ResponseUtil.error(res, 'Failed to delete clinical note', 500, [msg]);
    }
  }
};

export default clinicalNoteController;
