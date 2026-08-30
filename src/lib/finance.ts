import type { Expense, LedgerState } from "./types";

function monthKey(date: string) {
  return date.slice(0, 7);
}

export function money(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getDashboardFixture(state: LedgerState, selectedMonth?: string) {
  const thisMonth = selectedMonth ?? monthKey(state.today);
  const [year, month] = thisMonth.split("-").map(Number);
  const previousDate = new Date(Date.UTC(year, month - 2, 1));
  const previousMonth = `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, "0")}`;

  const current = state.expenses.filter((expense) => monthKey(expense.date) === thisMonth);
  const previous = state.expenses.filter((expense) => monthKey(expense.date) === previousMonth);

  const sum = (items: Expense[]) => items.reduce((total, item) => total + item.amountBdt, 0);
  const spent = sum(current);
  const previousSpent = sum(previous);

  const categoryMap = new Map<string, number>();
  for (const expense of current) {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amountBdt);
  }

  const categories = [...categoryMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const largest = [...current].sort((a, b) => b.amountBdt - a.amountBdt).slice(0, 4);

  return {
    spent,
    previousSpent,
    salary: state.salaryBdt,
    remaining: state.salaryBdt - spent,
    percent: state.salaryBdt > 0 ? (spent / state.salaryBdt) * 100 : 0,
    changePercent: previousSpent > 0 ? ((spent - previousSpent) / previousSpent) * 100 : 0,
    changeAmount: spent - previousSpent,
    month: thisMonth,
    previousMonth,
    categories,
    largest,
  };
}
