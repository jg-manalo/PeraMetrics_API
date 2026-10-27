import type { User } from './user.js';
import type { MoneySource } from './moneysource.js';
import { Transaction } from './transaction.js';

export type UserResource = Omit<User, 'password' | 'id'> & {
  moneySources?: MoneySource[];
  transactions?: Transaction[];
  transactionsMade?: number;
  expenses?: number;
  income?: number;
  transfers?: number;
  netBalance?: number;
  recentTransactions?: Transaction[];
};

export type TransactionReportResource = {
  savings: string;
  transactions: {
    income: Record<string, string>;
    expense: Record<string, string>;
  };
};

export type TransactionResource = {
  uid: string;
  date: string;
  name: string;
  amount: string;
  category: Transaction['category'];
  source?: string | null;
  transferTo?: string | null;
};
