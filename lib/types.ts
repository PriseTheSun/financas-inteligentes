export type TransactionStatus = 'paid' | 'pending' | 'overdue';
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  type: TransactionType;
  status: TransactionStatus;
  tags: string[];
  owner?: string; // Who the debt belongs to
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  balance: number;
}
