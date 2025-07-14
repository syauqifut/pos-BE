import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const productController = new ProductController();

/**
 * @route   GET /setup/product
 * @desc    Get all products with search, filter, sort, and pagination
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