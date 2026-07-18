import express, { Request, Response } from 'express';
import mpiController from './mpi.controller';
import authentication from '@middlewares/authentication';
import { tenantMiddleware } from '@middlewares/tenant.middleware';
import { checkPermission } from '@middlewares/permission.middleware';
import { PERMISSIONS } from '@config/rbac.config';
import { validate, validateQuery, validateParams, mpiValidation, genericValidation } from '@utils/validator';

// Global Person (MPI) endpoints, mounted at /api/persons. Cross-tenant identity
// lookup is intentionally admin-tier and returns identity/demographics only —
// never another tenant's clinical data (that path is consent-gated, Phase 2).
const mpiRouter = express.Router();
const auth = [authentication, tenantMiddleware];
const wrap = (fn: (req: Request, res: Response) => Promise<Response>) => (req: Request, res: Response) => fn(req, res);

// Direct-to-consumer self-enrollment: authenticated but NO tenant required —
// creates a platform-tenant Patient + verified Person for a hospital-less user.
mpiRouter.post('/self-enroll', authentication, validate(mpiValidation.selfEnroll), wrap(mpiController.selfEnroll));

mpiRouter.get('/search', ...auth, checkPermission(PERMISSIONS.PATIENT_VIEW), validateQuery(mpiValidation.personSearch), wrap(mpiController.search));
mpiRouter.get('/:id', ...auth, checkPermission(PERMISSIONS.PATIENT_VIEW), validateParams(genericValidation.id), wrap(mpiController.get));

export default mpiRouter;
