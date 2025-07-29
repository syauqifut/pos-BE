import { Router } from 'express';
import { ManufacturerController } from './manufacturer.controller';

const router = Router();
const manufacturerController = new ManufacturerController();

/**
 * @route   GET /setup/manufacturer
 * @desc    Get all manufacturers
 * @query   search - Search by manufacturer name
 * @query   sort_by - Sort by: name, id (default: name)
 * @query   sort_order - Sort order: ASC, DESC (default: ASC)
 * @access  Public
 */
router.get('/', manufacturerController.findAll);

/**
 * @route   GET /setup/manufacturer/:id
 * @desc    Get manufacturer by ID
 * @access  Public
 */
router.get('/:id', manufacturerController.findById);

/**
 * @route   POST /setup/manufacturer
 * @desc    Create new manufacturer
 * @access  Public
 */
router.post('/', manufacturerController.create);

/**
 * @route   PUT /setup/manufacturer/:id
 * @desc    Update manufacturer
 * @access  Public
 */
router.put('/:id', manufacturerController.update);

/**
 * @route   DELETE /setup/manufacturer/:id
 * @desc    Delete manufacturer
 * @access  Public
 */
router.delete('/:id', manufacturerController.delete);

export default router; 