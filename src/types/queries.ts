import type {Transaction} from './transaction';

export type TransactionQuery = {
    page?: number;
    orderBy? : 'asc' | 'desc';
    category?: Transaction['category'];
    from?: string;
    to?: string;
}