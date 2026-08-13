import type { MoneySource } from './moneysource.js';

export type Transaction = {
  id: number;
  uid: string;
  name: string;
  amount: string;
  date: string;
  category?: 'INCOME' | 'EXPENSE' | 'TRANSFER' | null;
  moneySource: string | null;
  transferDestination?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type MoneyInOutPayload = {
  transaction: Partial<Transaction> | undefined;
  updatedMoneySource: Partial<MoneySource> | undefined;
};

export type TransactionTransferPayload = Pick<
  MoneyInOutPayload,
  'updatedMoneySource'
> & {
  transaction: Partial<Transaction> | undefined;
  updatedDestinationMoneySource: Partial<MoneySource> | undefined;
};
