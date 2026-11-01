import {
  pgTable,
  uuid,
  text,
  serial,
  decimal,
  timestamp,
  pgEnum,
  date,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { moneySources } from './moneysources.js';

export const durationEnum = pgEnum('duration', [
  'ANNUAL',
  'BIENNIAL',
  'MONTHLY',
  'QUARTERLY',
  'WEEKLY',
]);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().notNull().unique(),
  name: text('name').notNull(),
  user: uuid('user')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  startDate: date('startDate').notNull(),
  amount: decimal('amount', { precision: 18, scale: 2 }).default('0').notNull(),
  duration: durationEnum('duration').notNull(),
  moneySource: uuid('moneySource').references(() => moneySources.uid, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
