export type Subscription = {
  id?: number;
  uid?: string;
  name: string;
  amount: string;
  user: string;
  moneySource: string | null;
  duration: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'BIENNIAL';
  startDate: string;
  createdAt?: Date;
  updatedAt?: Date;
};
