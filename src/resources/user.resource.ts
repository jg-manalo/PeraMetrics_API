import { Decimal } from 'decimal.js';
import type { UserResource } from '../types/resources.js';

export const userResource = (
  user: UserResource | undefined
): UserResource | undefined => {
  if (!user) {
    return undefined;
  }

  const totals = {
    expenses: new Decimal(0),
    income: new Decimal(0),
    transfers: new Decimal(0),
    netBalance: () =>
      user.moneySources?.reduce(
        (acc, source) => acc.plus(new Decimal(source.amount || 0)),
        new Decimal(0)
      ) || new Decimal(0),
  };

  if (user.transactions) {
    for (const transaction of user.transactions) {
      const amount = new Decimal(transaction.amount || 0);

      switch (transaction.category) {
        case 'EXPENSE':
          totals.expenses = totals.expenses.plus(amount);
          break;
        case 'INCOME':
          totals.income = totals.income.plus(amount);
          break;
        case 'TRANSFER':
          totals.transfers = totals.transfers.plus(amount);
          break;
      }
    }
  }

  return {
    uid: user.uid,
    name: user.name,
    email: user.email,
    transactionsMade: user.transactions?.length || 0,
    expenses: totals.expenses.toNumber(),
    income: totals.income.toNumber(),
    transfers: totals.transfers.toNumber(),
    recentTransactions:
      user.transactions
        ?.slice(-5)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ) || [],
    netBalance: totals.netBalance().toNumber(),
  };
};
