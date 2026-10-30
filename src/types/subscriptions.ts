export type Subscription = {
  id?: number;
  uid?: string;
  name: string;
  amount: string;
  user: string;
  moneySource: string | null;
  duration: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'BIENNIAL';
  startDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
