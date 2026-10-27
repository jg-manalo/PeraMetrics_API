import type { Transaction } from '../types/transaction.js';
import type { TransactionReportResource } from '../types/resources.js';
import { Decimal } from 'decimal.js';

export const reportResource = (report: {
  incomeRawData: Transaction[];
  expenseRawData: Transaction[];
}): TransactionReportResource => {
  const totalIncome = report.incomeRawData.reduce(
    (sum, txn) => sum.plus(txn.amount),
    new Decimal(0)
  );

  const totalExpenses = report.expenseRawData.reduce(
    (sum, txn) => sum.plus(txn.amount),
    new Decimal(0)
  );

  const savings = totalIncome.minus(totalExpenses);

  const rawReportsIncome = report.incomeRawData.map(txn => ({
    uid: txn.uid,
    date: txn.date,
    name: txn.name,
    amount: new Decimal(txn.amount),
  }));

  const rawReportsExpense = report.expenseRawData.map(txn => ({
    uid: txn.uid,
    date: txn.date,
    name: txn.name,
    amount: new Decimal(txn.amount),
  }));

  const totalsByDateIncome = rawReportsIncome.reduce((map, txn) => {
    const current = map.get(txn.date) ?? new Decimal(0);
    map.set(txn.date, current.plus(txn.amount));
    return map;
  }, new Map());

  const totalsByDateExpense = rawReportsExpense.reduce((map, txn) => {
    const current = map.get(txn.date) ?? new Decimal(0);
    map.set(txn.date, current.plus(txn.amount));
    return map;
  }, new Map());
  return {
    savings: savings.toFixed(2),
    transactions: {
      income: Object.fromEntries(totalsByDateIncome),
      expense: Object.fromEntries(totalsByDateExpense),
    },
  };
};
