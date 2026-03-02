import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import * as schemas from '../database/schema';

export type TSchema = typeof schemas;
export type TDb = NodePgDatabase<TSchema>;

export type TPersonSelect = InferSelectModel<typeof schemas.persons>;
export type TPersonInsert = InferInsertModel<typeof schemas.persons>;

export type TAccountSelect = InferSelectModel<typeof schemas.accounts>;
export type TAccountInsert = InferInsertModel<typeof schemas.accounts>;

export type TTransactionSelect = InferSelectModel<typeof schemas.transactions>;
export type TTransactionInsert = InferInsertModel<typeof schemas.transactions>;
