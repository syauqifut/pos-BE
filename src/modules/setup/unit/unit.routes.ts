import { Router } from 'express';
import { UnitController } from './unit.controller';

const router = Router();
const unitController = new UnitController();

/**
 * @route   GET /setup/unit
 * @desc    Get all units
 * @query   search - Search by unit name
 * @query   sort_by - Sort by: name, id (default: name)
 * @query   sort_order - Sort order: ASC, DESC (default: ASC)
 * @access  Public
 */
router.get('/', unitController.findAll);

/**
 * @route   GET /setup/unit/:id
 * @desc    Get unit by ID
 * @access  Public
 */
router.get('/:id', unitController.findById);

/**
 * @route   POST /setup/unit
 * @desc    Create new unit
 * @access  Public
 */
router.post('/', unitController.create);

/**
 * @route   PUT /setup/unit/:id
 * @desc    Update unit
 * @access  Public
 */
router.put('/:id', unitController.update);

/**
 * @route   DELETE /setup/unit/:id
 * @desc    Delete unit
 * @access  Public
 */
router.delete('/:id', unitController.delete);

export default router; 