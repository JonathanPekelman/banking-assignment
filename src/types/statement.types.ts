import { TAccountSelect, TTransactionSelect } from './database';

export interface IAccountStatement {
  account: TAccountSelect;
  openingBalance: string;
  closingBalance: string;
  transactions: TTransactionSelect[];
}
