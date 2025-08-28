import { Pool } from 'pg';
import db from '../../db';
import { HttpException } from '../../exceptions/HttpException';

export interface PrintJob {
  id: number;
  escpos: string;
  status: 'pending' | 'printed';
  created_at: Date;
  printed_at?: Date;
}

export interface CreatePrintJobData {
  escpos: string;
  status: 'pending' | 'printed';
}

export class PrintJobRepository {
  /**
   * Insert a new print job
   */
  static async insertPrintJob(data: CreatePrintJobData): Promise<number> {
    try {
      const result = await db.query(
        `INSERT INTO print_jobs (escpos, status) VALUES ($1, $2) RETURNING id`,
        [data.escpos, data.status]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error('Error inserting print job:', error);
      throw new HttpException(500, 'Internal server error while creating print job');
    }
  }

  /**
   * Get all pending print jobs
   */
  static async getPendingJobs(): Promise<PrintJob[]> {
    try {
      const result = await db.query(
        `SELECT id, escpos, status, created_at, printed_at 
         FROM print_jobs 
         WHERE status = 'pending' 
         ORDER BY created_at ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching pending print jobs:', error);
      throw new HttpException(500, 'Internal server error while fetching print jobs');
    }
  }

  /**
   * Find print job by ID
   */
  static async findById(id: number): Promise<PrintJob | null> {
    try {
      const result = await db.query(
        `SELECT id, escpos, status, created_at, printed_at 
         FROM print_jobs 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding print job by ID:', error);
      throw new HttpException(500, 'Internal server error while finding print job');
    }
  }

  /**
   * Mark a print job as printed
   */
  static async updatePrinted(id: number): Promise<void> {
    try {
      const result = await db.query(
        `UPDATE print_jobs 
         SET status = 'printed', printed_at = NOW() 
         WHERE id = $1`,
        [id]
      );
      
      if (result.rowCount === 0) {
        throw new HttpException(404, 'Print job not found');
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error updating print job status:', error);
      throw new HttpException(500, 'Internal server error while updating print job status');
    }
  }
}
