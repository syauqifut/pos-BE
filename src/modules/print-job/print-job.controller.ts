import { Request, Response, NextFunction } from 'express';
import { PrintJobService } from './print-job.service';
import { HttpException } from '../../exceptions/HttpException';

export class PrintJobController {
  private printJobService: PrintJobService;

  constructor() {
    this.printJobService = new PrintJobService();
  }

  /**
   * Handle GET /print-job
   */
  getPendingJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const jobs = await this.printJobService.getPendingJobs();
      
      res.status(200).json({
        success: true,
        message: 'Pending print jobs retrieved successfully',
        data: jobs,
        count: jobs.length
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle PATCH /print-job/:id/printed
   */
  markPrinted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        throw new HttpException(400, 'Invalid print job ID. Must be a positive integer.');
      }

      await this.printJobService.markPrinted(Number(id));
      
      res.status(200).json({
        success: true,
        message: 'Print job marked as printed successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /print-job
   */
  createPrintJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { html } = req.body;
      
      if (!html || typeof html !== 'string') {
        throw new HttpException(400, 'HTML content is required and must be a string');
      }

      if (html.trim().length === 0) {
        throw new HttpException(400, 'HTML content cannot be empty');
      }

      const job = await this.printJobService.createPrintJob(html);
      
      res.status(201).json({
        success: true,
        message: 'Print job created successfully',
        data: job
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle POST /print-job/test
   */
  createTestPrintJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await this.printJobService.createTestPrintJob();
      
      res.status(201).json({
        success: true,
        message: 'Test print job created successfully',
        data: job
      });
    } catch (error) {
      next(error);
    }
  };
}
