import {pgTable, uuid, text, serial, decimal, timestamp} from "drizzle-orm/pg-core";
import {users} from './users.js'

export const moneySources = pgTable("money_sources", {
    id: serial('id').primaryKey(),
    uid: uuid('uid').defaultRandom().notNull().unique(),
    name: text('name').notNull(),
    user: uuid('user').notNull().references(() => users.uid, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 18, scale: 2 }).default('0').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow()
});