import { Router } from 'express';
import { PurchaseController } from './purchase.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const purchaseController = new PurchaseController();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/transaction/purchase
 * Create new purchase transaction
 */
router.post('/', purchaseController.create);

/**
 * GET /api/transaction/purchase/:id
 * Get purchase transaction by ID
 */
router.get('/:id', purchaseController.findById);

/**
 * PUT /api/transaction/purchase/:id
 * Update existing purchase transaction
 */
router.put('/:id', purchaseController.update);

export default router; 