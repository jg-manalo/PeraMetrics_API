import type { Transaction } from '../types/transaction.js';
import type { TransactionReportResource } from '../types/resources.js';
import { Decimal } from 'decimal.js';

export const reportResource = (
  report: Transaction[]
): TransactionReportResource => {
  const totalIncome = report
    .filter(txn => txn.category === 'INCOME')
    .reduce((sum, txn) => sum.plus(txn.amount), new Decimal(0));

  const totalExpenses = report
    .filter(txn => txn.category === 'EXPENSE')
    .reduce((sum, txn) => sum.plus(txn.amount), new Decimal(0));

  const savings = totalIncome.minus(totalExpenses);

  return {
    savings: savings.toFixed(2),
    transactions: report.map(txn => ({
      uid: txn.uid,
      date: txn.date,
      name: txn.name,
      amount: new Decimal(txn.amount).toFixed(2),
    })),
  };
};
