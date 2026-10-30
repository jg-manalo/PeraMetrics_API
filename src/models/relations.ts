import { users } from '../models/users.js';
import { moneySources } from '../models/moneysources.js';
import { transactions } from '../models/transactions.js';
import { subscriptions } from '../models/subscriptions.js';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations(
  { users, moneySources, transactions, subscriptions },
  r => ({
    users: {
      moneySources: r.many.moneySources({
        from: r.users.uid,
        to: r.moneySources.user,
      }),
      transactions: r.many.transactions({
        from: r.users.uid,
        to: r.transactions.user,
      }),
    },
    moneySources: {
      holder: r.one.users({
        from: r.moneySources.user,
        to: r.users.uid,
      }),
      transactions: r.many.transactions({
        from: r.moneySources.uid,
        to: r.transactions.moneySource,
      }),
    },
    transactions: {
      holder: r.one.users({
        from: r.transactions.user,
        to: r.users.uid,
      }),
      source: r.one.moneySources({
        from: r.transactions.moneySource,
        to: r.moneySources.uid,
      }),
      transferTo: r.one.moneySources({
        from: r.transactions.transferDestination,
        to: r.moneySources.uid,
      }),
    },
    subscriptions: {
      subscriber: r.one.users({
        from: r.subscriptions.user,
        to: r.users.uid,
      }),
      paymentMethod: r.one.moneySources({
        from: r.subscriptions.moneySource,
        to: r.moneySources.uid,
      }),
    },
  })
);
