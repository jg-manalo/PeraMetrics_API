import type { Transaction } from '../types/transaction.js';
import type { TransactionResource } from '../types/resources.js';

type TransactionLazyLoader = Transaction & {
  source?: { name: string };
  transferTo?: { name: string };
};

export const transactionResource = (
  transaction: TransactionLazyLoader[],
): TransactionResource[] => {
  return transaction.map((txn) => ({
    uid: txn.uid,
    date: txn.date,
    name: txn.name,
    amount: txn.amount,
    category: txn.category,
    source: txn.source?.name ?? null,
    transferTo: txn.transferTo?.name ?? null,
  }));
};
