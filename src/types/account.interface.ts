export interface IAccount {
  accountId: number;
  personId: number;
  balance: number;
  dailyWithdrawalLimit: number;
  activeFlag: boolean;
  accountType: number;
  createDate: Date;
}
