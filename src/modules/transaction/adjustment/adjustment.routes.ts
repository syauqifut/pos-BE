import { Router } from 'express';
import { AdjustmentController } from './adjustment.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const adjustmentController = new AdjustmentController();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/transaction/adjustment
 * Create new stock adjustment transaction
 */
router.post('/', adjustmentController.create);

/**
 * GET /api/transaction/adjustment/:id
 * Get adjustment transaction by ID
 */
router.get('/:id', adjustmentController.findById);

/**
 * PUT /api/transaction/adjustment/:id
 * Update existing adjustment transaction
 */
router.put('/:id', adjustmentController.update);

export default router; 