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
 * @route   PUT /inventory/conversion/:id
 * @desc    Update an existing conversion
 * @access  Private
 */
router.put('/:id', authenticateToken, conversionController.update);

/**
 * @route   GET /inventory/conversion/detail/:productId
 * @desc    Get detailed conversion information for a product
 * @access  Private
 */
router.get('/detail/:productId', authenticateToken, conversionController.getProductConversionDetail);

/**
 * @route   GET /inventory/conversion/:id
 * @desc    Get conversion by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, conversionController.findById);

export default router; 