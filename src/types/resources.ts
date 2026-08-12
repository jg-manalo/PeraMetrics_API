import type {User} from './user.js';
import type { MoneySource } from './moneysource.js';
import { Transaction } from './transaction.js';

export type UserResource = Omit<User, 'password' | 'id'> & {
    moneySources?: MoneySource[];
    transactions?: Transaction[];
    transactionsMade?: number;
    expenses?: number,
    income?: number,
    transfers?: number
};

export type TransactionReportResource = {
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    transactions: Partial<Transaction>[];
}
