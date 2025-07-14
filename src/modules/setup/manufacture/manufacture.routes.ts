import { Router } from 'express';
import { ManufactureController } from './manufacture.controller';

const router = Router();
const manufactureController = new ManufactureController();

/**
 * @route   GET /setup/manufacture
 * @desc    Get all manufactures
 * @access  Public
 */
router.get('/', manufactureController.findAll);

/**
 * @route   GET /setup/manufacture/:id
 * @desc    Get manufacture by ID
 * @access  Public
 */
router.get('/:id', manufactureController.findById);

/**
 * @route   POST /setup/manufacture
 * @desc    Create new manufacture
 * @access  Public
 */
router.post('/', manufactureController.create);

/**
 * @route   PUT /setup/manufacture/:id
 * @desc    Update manufacture
 * @access  Public
 */
router.put('/:id', manufactureController.update);

/**
 * @route   DELETE /setup/manufacture/:id
 * @desc    Delete manufacture
 * @access  Public
 */
router.delete('/:id', manufactureController.delete);

export default router; 