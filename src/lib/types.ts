export const CATEGORIES = [
  "Rent",
  "Groceries",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Education",
  "Entertainment",
  "Mobile",
  "Clothing",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Expense = {
  id: string;
  date: string;
  category: string;
  shop: string;
  amountBdt: number;
};

export type SavingsPocket = {
  id: string;
  name: string;
  item: string;
  targetBdt: number;
  monthlyContributionBdt: number;
};

export type LedgerState = {
  today: string;
  salaryBdt: number;
  expenses: Expense[];
  pockets: SavingsPocket[];
  dpsAnnualRatePercent: number;
};

export type ReceiptDraft = {
  amountBdt: number | null;
  date: string | null;
  shop: string | null;
  category: string | null;
  confidence: number | null;
};
