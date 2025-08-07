import { Router } from 'express';
import { ConversionController } from './conversion.controller';
import { authenticateToken } from '../../../middlewares/auth.middleware';

const router = Router();
const conversionController = new ConversionController();

/**
 * @route   POST /inventory/conversion
 * @desc    Create a new conversion record
 * @access  Private
 */
router.post('/', authenticateToken, conversionController.create);

/**
 * @route   GET /inventory/conversion
 * @desc    Get all conversion records
 * @access  Private
 */
router.get('/', authenticateToken, conversionController.findAll);

/**
 * @route   PUT /inventory/conversion/:id
 * @desc    Update an existing conversion
 * @access  Private
 */
router.put('/:id', authenticateToken, conversionController.update);

/**
 * @route   GET /inventory/conversion/default/:productId
 * @desc    Get default conversion by product ID
 * @access  Private
 */
router.get('/default/:productId', authenticateToken, conversionController.getDefaultConversionByProductId);

/**
 * @route   GET /inventory/conversion/:id
 * @desc    Get conversion by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, conversionController.findById);

/**
 * @route   DELETE /inventory/conversion/:id
 * @desc    Delete a conversion
 * @access  Private
 */
router.delete('/:id', authenticateToken, conversionController.deleteById);

/**
 * @route   GET /inventory/conversion/detail/:productId
 * @desc    Get detailed conversion information for a product
 * @access  Private
 */
router.get('/detail/:productId', authenticateToken, conversionController.getProductConversionDetail);

/**
 * @route   GET /inventory/conversion/by-product/:productId/:type
 * @desc    Get conversions by product ID and type
 * @access  Private
 */
router.get('/product-list/:productId/:type', authenticateToken, conversionController.getConversionsByProductAndType);


export default router; 