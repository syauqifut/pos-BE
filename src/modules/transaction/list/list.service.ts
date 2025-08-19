import { ListRepository } from './list.repository';
import { TransactionListQueryRequest } from './validators/list.schema';

export interface TransactionListItem {
  transactionNo: string;
  type: 'sale' | 'purchase' | 'adjustment';
  time: string;
  totalItems: number;
  user: string;
  products: Array<{
    productName: string;
    qty: number;
    unit: string;
  }>;
}

// TransactionListQuery interface moved to schema file

export interface TransactionListResponse {
  data: TransactionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ListService {
  private listRepository: ListRepository;

  constructor() {
    this.listRepository = new ListRepository();
  }

  /**
   * Get transactions with filtering, sorting, search, and pagination
   */
  async getTransactions(query: TransactionListQueryRequest): Promise<TransactionListResponse> {
    const transactions = await this.listRepository.getTransactions(query);
    return transactions;
  }
}
