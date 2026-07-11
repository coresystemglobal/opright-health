import express, { Request, Response } from 'express';
import clinicalNoteController from './clinical-note.controller';
import authentication from '@middlewares/authentication';
import { validate, validateParams, validateQuery, clinicalNoteValidation, genericValidation } from '@utils/validator';

const clinicalNoteRouter = express.Router();

clinicalNoteRouter.post('/',
  authentication,
  validate(clinicalNoteValidation.create),
  async (req: Request, res: Response) => {
    await clinicalNoteController.createNote(req, res);
  }
);

clinicalNoteRouter.get('/patient/:patientId',
  authentication,
  validateQuery(clinicalNoteValidation.search),
  async (req: Request, res: Response) => {
    await clinicalNoteController.getPatientNotes(req, res);
  }
);

clinicalNoteRouter.get('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await clinicalNoteController.getNoteById(req, res);
  }
);

clinicalNoteRouter.put('/:id',
  authentication,
  validateParams(genericValidation.id),
  validate(clinicalNoteValidation.update),
  async (req: Request, res: Response) => {
    await clinicalNoteController.updateNote(req, res);
  }
);

// Lock (sign) a note — makes it immutable
clinicalNoteRouter.patch('/:id/lock',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await clinicalNoteController.lockNote(req, res);
  }
);

clinicalNoteRouter.delete('/:id',
  authentication,
  validateParams(genericValidation.id),
  async (req: Request, res: Response) => {
    await clinicalNoteController.deleteNote(req, res);
  }
);

export default clinicalNoteRouter;
