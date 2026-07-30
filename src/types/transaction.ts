export type Transaction = {
    id: number;
    uid: string;
    name: string;
    amount: string;
    date: string;
    category?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | null;
    moneySource: string;
    createdAt?: Date;
    updatedAt?: Date;
};