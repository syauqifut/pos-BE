import { Router } from 'express';
import { StockController } from './stock.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const stockController = new StockController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /inventory/stock
 * @desc Get all stock information with search, filter, sort, and pagination
 * @access Private (requires authentication)
 * @query search - Search by product name, SKU, barcode, category, or manufacturer
 * @query category_id - Filter by category ID
 * @query manufacture_id - Filter by manufacturer ID
 * @query sort_by - Sort by: name, category, manufacture, stock
 * @query sort_order - Sort order: ASC or DESC
 * @query page - Page number for pagination
 * @query limit - Number of items per page
 */
router.get('/', stockController.findAll);

/**
 * @route GET /inventory/stock/:productId
 * @desc Get stock transaction history for a specific product
 * @access Private (requires authentication)
 * @param productId - Product ID
 * @query page - Page number for pagination
 * @query limit - Number of items per page
 */
router.get('/:productId', stockController.getStockHistory);

export default router; 