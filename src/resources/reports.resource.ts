import type { Transaction } from '../types/transaction.js';
import type { TransactionReportResource } from '../types/resources.js';

export type TransactionReportLazyLoad = Transaction & {
  source: { name: string } | null;
  transferTo?: { name: string } | null;
};

export const reportResource = (
  report: TransactionReportLazyLoad[]
): TransactionReportResource => {
  const totalIncome = report
    .filter(txn => txn.category === 'INCOME')
    .reduce((sum, txn) => sum + parseFloat(txn.amount), 0)
    .toFixed(2);

  const totalExpenses = report
    .filter(txn => txn.category === 'EXPENSE')
    .reduce((sum, txn) => sum + parseFloat(txn.amount), 0)
    .toFixed(2);

  const savings = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(
    2
  );

  return {
    totalIncome: totalIncome,
    totalExpenses: totalExpenses,
    savings: savings,
    transactions: report.map(txn => ({
      date: txn.date,
      name: txn.name,
      amount: txn.amount.toString(),
      category: txn.category,
      origin: txn.source?.name,
      destination: txn.transferTo?.name ?? null,
    })),
  };
};
