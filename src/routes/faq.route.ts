import { Router } from 'express';
import { FAQController } from '../controllers/faq.controller';
import authenticate from '../middlewares/authentication';
import { tenantMiddleware } from '../middlewares/tenant.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/public', FAQController.getAll);
router.get('/public/search', FAQController.search);
router.get('/public/categories', FAQController.getCategories);
router.get('/public/:id', FAQController.getById);

// Protected routes (authentication required)
router.use(authenticate);
router.use(tenantMiddleware);

router.get('/', FAQController.getAll);
router.get('/search', FAQController.search);
router.get('/categories', FAQController.getCategories);
router.post('/', FAQController.create);
router.get('/:id', FAQController.getById);
router.put('/:id', FAQController.update);
router.delete('/:id', FAQController.delete);

export default router;