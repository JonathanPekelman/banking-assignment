import { sql } from 'drizzle-orm';

import {
  pgTable,
  serial,
  text,
  date,
  integer,
  numeric,
  boolean,
  check,
  timestamp,
} from 'drizzle-orm/pg-core';

const monetaryColumn = (columnName: string) =>
  numeric(columnName, {
    precision: 15,
    scale: 4,
  });

export const persons = pgTable('persons', {
  personId: serial('person_id').primaryKey(),
  name: text('name').notNull(),
  document: text('document').notNull().unique(),
  birthDate: date('birth_date').notNull(),
});

export const accounts = pgTable(
  'accounts',
  {
    accountId: serial('account_id').primaryKey(),
    personId: integer('person_id')
      .notNull()
      .references(() => persons.personId),
    balance: monetaryColumn('balance').notNull(),
    dailyWithdrawalLimit: monetaryColumn('daily_withdrawal_limit').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    accountType: integer('account_type').notNull(),
  },
  (table) => [
    check(
      'account_type_range_check',
      sql`${table.accountType} BETWEEN 1 AND 5`,
    ),
  ],
);

export const transactions = pgTable('transactions', {
  transactionId: serial('transaction_id').primaryKey(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.accountId),
  value: monetaryColumn('value').notNull(),
  transactionDate: timestamp('transaction_date').notNull().defaultNow(),
});
