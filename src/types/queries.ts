import type { ParsedQs } from 'qs';
import type { Transaction } from './transaction.js';

export type DataQuery = ParsedQs & {
  orderBy: string;
  direction: 'asc' | 'desc';
  entity: string | '';
  page: number;
};

export type TransactionQuery = DataQuery & {
  category?: Transaction['category'];
  from?: string;
  to?: string;
};
