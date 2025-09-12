import { Router } from 'express';
import { PrintController } from './print.controller';

const router = Router();
const controller = new PrintController();

/**
 * @route   GET /print/test
 * @desc    Generate test print data with static content
 * @access  Private
 */
router.get('/test', controller.test);

/**
 * @route   GET /print/sale/:transaction_id
 * @desc    Generate transaction print data with dynamic content
 * @access  Private
 */
router.get('/sale/:transaction_id', controller.salePrint);

export default router;
