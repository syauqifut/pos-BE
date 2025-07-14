import { Router } from 'express';
import { CategoryController } from './category.controller';

const router = Router();
const categoryController = new CategoryController();

/**
 * @route   GET /setup/category
 * @desc    Get all categories
 * @access  Public
 */
router.get('/', categoryController.findAll);

/**
 * @route   GET /setup/category/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', categoryController.findById);

/**
 * @route   POST /setup/category
 * @desc    Create new category
 * @access  Public
 */
router.post('/', categoryController.create);

/**
 * @route   PUT /setup/category/:id
 * @desc    Update category
 * @access  Public
 */
router.put('/:id', categoryController.update);

/**
 * @route   DELETE /setup/category/:id
 * @desc    Delete category
 * @access  Public
 */
router.delete('/:id', categoryController.delete);

export default router; 