export interface QueryFilters {
    page?: number;
    orderBy? : 'asc' | 'desc';
    category?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
}
