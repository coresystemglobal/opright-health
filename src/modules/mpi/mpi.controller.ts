import { Request, Response } from 'express';
import { personService } from '@modules/mpi/person.service';
import { ResponseUtil } from '@utils/response.util';

const tenantOf = (req: Request) => (req as any).tenant?.id || (req.headers['x-tenant-id'] as string);
const userOf = (req: Request) => (req as any).user?.userId;

function fail(res: Response, error: unknown, action: string): Response {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  if (msg.includes('not found')) return ResponseUtil.notFound(res, msg);
  if (msg.includes('required') || msg.includes('Invalid')) return ResponseUtil.validationError(res, [msg]);
  return ResponseUtil.error(res, `Failed to ${action}`, 500, [msg]);
}

const mpiController = {
  // POST /api/patients/:id/link-person
  linkPerson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const { person_id, person_draft } = req.body;
      const result = await personService.linkPatientToPerson(
        req.params.id, tenantId, { personId: person_id, personDraft: person_draft }, userOf(req)
      );
      return ResponseUtil.success(res, result, 'Patient linked to person identity successfully');
    } catch (e) { return fail(res, e, 'link person'); }
  },

  // DELETE /api/patients/:id/link-person
  unlinkPerson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return ResponseUtil.error(res, 'Tenant ID is required', 400);
      const patient = await personService.unlinkPatientFromPerson(req.params.id, tenantId, userOf(req));
      return ResponseUtil.success(res, patient, 'Patient unlinked from person identity successfully');
    } catch (e) { return fail(res, e, 'unlink person'); }
  },

  // GET /api/persons/search
  search: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { national_id, last_name, date_of_birth } = req.query as Record<string, string>;
      const persons = await personService.searchPersons({ national_id, last_name, date_of_birth });
      return ResponseUtil.success(res, persons, 'Persons retrieved successfully');
    } catch (e) { return fail(res, e, 'search persons'); }
  },

  // GET /api/persons/:id
  get: async (req: Request, res: Response): Promise<Response> => {
    try {
      return ResponseUtil.success(res, await personService.getPersonById(req.params.id), 'Person retrieved successfully');
    } catch (e) { return fail(res, e, 'retrieve person'); }
  }
};

export default mpiController;
