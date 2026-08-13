import {
  pgTable,
  uuid,
  text,
  serial,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: uuid('uid').defaultRandom().notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});
