import { Router } from 'express';
import { SaleController } from './sale.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const saleController = new SaleController();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/transaction/sale
 * Create new sale transaction
 */
router.post('/', saleController.create);

/**
 * GET /api/transaction/sale/:id
 * Get sale transaction by ID
 */
router.get('/:id', saleController.findById);

/**
 * PUT /api/transaction/sale/:id
 * Update existing sale transaction
 */
router.put('/:id', saleController.update);

export default router; 