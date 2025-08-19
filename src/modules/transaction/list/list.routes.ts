import { Router } from 'express';
import { ListController } from './list.controller';

const router = Router();
const listController = new ListController();

/**
 * GET /transaction/list
 * Get transactions with filtering, sorting, search, and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - search: Search by transaction number or user name
 * - type: Filter by type (all, sale, purchase, adjustment)
 * - sortBy: Sort by field (time, transactionNo, type, user)
 * - sortOrder: Sort order (asc, desc)
 */
router.get('/', listController.getTransactions);

export default router;
