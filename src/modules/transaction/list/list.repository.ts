import pool from '../../../db';
import { TransactionListItem, TransactionListResponse } from './list.service';
import { TransactionListQueryRequest } from './validators/list.schema';

export class ListRepository {
  /**
   * Get transactions with filtering, sorting, search, and pagination
   */
  async getTransactions(query: TransactionListQueryRequest): Promise<TransactionListResponse> {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = 'all',
      sortBy = 'time',
      sortOrder = 'desc'
    } = query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (t.no ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (type !== 'all') {
      whereClause += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY ';
    switch (sortBy) {
      case 'transactionNo':
        orderByClause += `t.no ${sortOrder.toUpperCase()}`;
        break;
      case 'type':
        orderByClause += `t.type ${sortOrder.toUpperCase()}`;
        break;
      case 'user':
        orderByClause += `u.name ${sortOrder.toUpperCase()}`;
        break;
      case 'time':
      default:
        orderByClause += `t.created_at ${sortOrder.toUpperCase()}`;
        break;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated transactions
    const transactionsQuery = `
      SELECT 
        t.id,
        t.no as transaction_no,
        t.type,
        t.created_at as time,
        u.name as user_name,
        COUNT(ti.id) as total_items
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
      ${whereClause}
      GROUP BY t.id, t.no, t.type, t.created_at, u.name
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await pool.query(transactionsQuery, params);
    const transactions = result.rows;

    // For each transaction, get the product details
    const transactionsWithProducts: TransactionListItem[] = [];

    for (const transaction of transactions) {
      const productsQuery = `
        SELECT 
          p.name as product_name,
          ti.qty,
          u.name as unit_name
        FROM transaction_items ti
        LEFT JOIN products p ON ti.product_id = p.id
        LEFT JOIN units u ON ti.unit_id = u.id
        WHERE ti.transaction_id = $1
        ORDER BY ti.id
      `;

      const productsResult = await pool.query(productsQuery, [transaction.id]);
      const products = productsResult.rows.map(row => ({
        productName: row.product_name,
        qty: parseFloat(row.qty),
        unit: row.unit_name
      }));

      transactionsWithProducts.push({
        id: transaction.id,
        transactionNo: transaction.transaction_no,
        type: transaction.type,
        time: transaction.time,
        totalItems: parseInt(transaction.total_items),
        user: transaction.user_name,
        products
      });
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data: transactionsWithProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }
}
