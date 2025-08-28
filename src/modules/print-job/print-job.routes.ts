import { Router } from 'express';
import { PrintJobController } from './print-job.controller';

const router = Router();
const controller = new PrintJobController();

/**
 * @route   GET /print-job
 * @desc    Get all pending print jobs
 * @access  Private
 */
router.get('/', controller.getPendingJobs);

/**
 * @route   PATCH /print-job/:id/printed
 * @desc    Mark a print job as printed
 * @access  Private
 */
router.patch('/:id/printed', controller.markPrinted);

/**
 * @route   POST /print-job
 * @desc    Create a new print job
 * @access  Private
 */
router.post('/', controller.createPrintJob);

/**
 * @route   POST /print-job/test
 * @desc    Create a test print job for printer testing
 * @access  Private
 */
router.post('/test', controller.createTestPrintJob);

export default router;
