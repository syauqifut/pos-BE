import { HttpException } from '../../exceptions/HttpException';
import { PrintJobRepository, PrintJob, CreatePrintJobData } from './print-job.repository';
import { htmlToEscpos } from './utils/escpos';
import { generateTestPrintTemplate } from './templates/test-print.template';

export interface CreatePrintJobRequest {
  html: string;
}

export class PrintJobService {
  /**
   * Get all pending print jobs
   */
  async getPendingJobs(): Promise<PrintJob[]> {
    try {
      return await PrintJobRepository.getPendingJobs();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error fetching pending print jobs:', error);
      throw new HttpException(500, 'Internal server error while fetching print jobs');
    }
  }

  /**
   * Mark a print job as printed
   */
  async markPrinted(id: number): Promise<void> {
    try {
      if (!id || id <= 0) {
        throw new HttpException(400, 'Invalid print job ID');
      }

      // Check if print job exists
      const job = await PrintJobRepository.findById(id);
      
      if (!job) {
        throw new HttpException(404, 'Print job not found');
      }

      if (job.status === 'printed') {
        throw new HttpException(400, 'Print job is already marked as printed');
      }

      await PrintJobRepository.updatePrinted(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error marking print job as printed:', error);
      throw new HttpException(500, 'Internal server error while updating print job status');
    }
  }

  /**
   * Create a new print job
   */
  async createPrintJob(html: string): Promise<PrintJob> {
    try {
      // Validate HTML content
      if (!html || typeof html !== 'string') {
        throw new HttpException(400, 'HTML content is required and must be a string');
      }

      if (html.trim().length === 0) {
        throw new HttpException(400, 'HTML content cannot be empty');
      }

      if (html.length > 10000) { // Limit HTML size to prevent abuse
        throw new HttpException(400, 'HTML content is too long (maximum 10,000 characters)');
      }

      // Convert HTML to ESC/POS base64
      const escposBase64 = await htmlToEscpos(html);

      // Create print job data
      const createData: CreatePrintJobData = {
        escpos: escposBase64,
        status: 'pending'
      };

      // Insert job into database
      const createdId = await PrintJobRepository.insertPrintJob(createData);
      
      // Return the created job
      const createdJob = await PrintJobRepository.findById(createdId);
      if (!createdJob) {
        throw new HttpException(500, 'Failed to retrieve created print job');
      }

      return createdJob;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating print job:', error);
      throw new HttpException(500, 'Internal server error while creating print job');
    }
  }

  /**
   * Create a test print job for printer testing
   */
  async createTestPrintJob(): Promise<PrintJob> {
    try {
      // Generate test HTML content
      const testHtml = generateTestPrintTemplate();

      // Convert HTML to ESC/POS base64
      const escposBase64 = await htmlToEscpos(testHtml);

      // Create print job data
      const createData: CreatePrintJobData = {
        escpos: escposBase64,
        status: 'pending'
      };

      // Insert job into database
      const createdId = await PrintJobRepository.insertPrintJob(createData);
      
      // Return the created job
      const createdJob = await PrintJobRepository.findById(createdId);
      if (!createdJob) {
        throw new HttpException(500, 'Failed to retrieve created test print job');
      }

      return createdJob;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating test print job:', error);
      throw new HttpException(500, 'Internal server error while creating test print job');
    }
  }
}
