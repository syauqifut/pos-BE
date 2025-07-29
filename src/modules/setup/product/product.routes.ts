import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const productController = new ProductController();

/**
 * @route   GET /setup/product
 * @desc    Get all products with search, filter, sort, and pagination
 * @query   search - Search by product name, SKU, barcode, category, or manufacturer
 * @query   category_id - Filter by category ID
 * @query   manufacturer_id - Filter by manufacturer ID
 * @query   sort_by - Sort by: name, id, created_at (default: name)
 * @query   sort_order - Sort order: ASC, DESC (default: ASC)
 * @query   page - Page number for pagination
 * @query   limit - Number of items per page
 * @access  Public
 */
router.get('/', productController.findAll);

/**
 * @route   GET /setup/product/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', productController.findById);

/**
 * @route   POST /setup/product
 * @desc    Create new product
 * @access  Private (requires authentication)
 */
router.post('/', authenticateToken, productController.create);

/**
 * @route   PUT /setup/product/:id
 * @desc    Update product
 * @access  Private (requires authentication)
 */
router.put('/:id', authenticateToken, productController.update);

/**
 * @route   DELETE /setup/product/:id
 * @desc    Soft delete product
 * @access  Private (requires authentication)
 */
router.delete('/:id', authenticateToken, productController.delete);

export default router; 