import type {Transaction} from './transaction';

export interface QueryFilters {
    page?: number;
    orderBy? : 'asc' | 'desc';
    category?: Transaction['category'];
    from?: string;
    to?: string;
}
