import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  pgEnum,
  timestamp,
  date,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { moneySources } from './moneysources.js';
export const categoryEnum = pgEnum('transaction_category', [
  'INCOME',
  'EXPENSE',
  'TRANSFER',
]);

export const transactions = pgTable('transactions', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uid: uuid('uid').defaultRandom().notNull().unique(),
  date: date('date').notNull(),
  name: text('name').notNull(),
  user: uuid('user')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  moneySource: uuid('moneySource').references(() => moneySources.uid, {
    onDelete: 'set null',
  }),
  transferDestination: uuid('transferDestination').references(
    () => moneySources.uid,
    { onDelete: 'set null' }
  ),
  category: categoryEnum().notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
