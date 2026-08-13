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
    totalIncome: string;
    totalExpenses: string;
    savings: string;
    transactions: Partial<Transaction>[];
}

export type TransactionResource = {
  uid: string;
  date: string;
  name: string;
  amount: string;
  category: Transaction['category'];
  source?: string | null;
  transferTo?: string | null;
};
