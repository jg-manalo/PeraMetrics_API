import {pgTable, uuid, text, integer, decimal, pgEnum, timestamp, date} from "drizzle-orm/pg-core";
import {users} from './users'
import {moneySources} from './moneysources'
export const categoryEnum = pgEnum('transaction_category', ['INCOME', 'EXPENSE', 'TRANSFER']);

export const transactions = pgTable("transactions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uid: uuid('uid').defaultRandom().notNull().unique(),
    date: date('date').notNull(),
    name: text('name').notNull(),
    user: uuid('user').notNull().references(() => users.uid, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
    moneySource: uuid('moneySource').notNull().references(() => moneySources.uid, { onDelete: 'cascade' }),
    transferDestination: uuid('transferDestination').references(() => moneySources.uid, { onDelete: 'cascade' }),
    category: categoryEnum(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow()
});