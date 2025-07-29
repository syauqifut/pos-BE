import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();
const userController = new UserController();

/**
 * @route   GET /setup/user
 * @desc    Get all active users
 * @query   search - Search by user name or username
 * @query   sort_by - Sort by: name, username, id (default: name)
 * @query   sort_order - Sort order: ASC, DESC (default: ASC)
 * @access  Public
 */
router.get('/', userController.findAllActive);

/**
 * @route   GET /setup/user/inactive
 * @desc    Get all inactive users
 * @access  Public
 */
router.get('/inactive', userController.findAllInactive);

/**
 * @route   GET /setup/user/:id
 * @desc    Get active user by ID
 * @access  Public
 */
router.get('/:id', userController.findActiveById);

/**
 * @route   POST /setup/user
 * @desc    Create new user
 * @access  Public
 */
router.post('/', userController.create);

/**
 * @route   PUT /setup/user/:id
 * @desc    Update user
 * @access  Public
 */
router.put('/:id', userController.update);

/**
 * @route   DELETE /setup/user/:id
 * @desc    Soft delete user (deactivate)
 * @access  Public
 */
router.delete('/:id', userController.softDelete);

/**
 * @route   PATCH /setup/user/:id/toggle
 * @desc    Toggle user activation status
 * @access  Public
 */
router.patch('/:id/toggle', userController.toggleActivation);

export default router; 