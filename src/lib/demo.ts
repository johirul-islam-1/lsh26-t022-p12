import rawCase from "@/fixtures/public-case-01.json";
import type { LedgerState } from "./types";

export function getDemoLedger(): LedgerState {
  return {
    today: rawCase.today,
    salaryBdt: Number(rawCase.salary_bdt),
    expenses: rawCase.expenses.map((expense) => ({
      id: expense.id,
      date: expense.date,
      category: expense.category,
      shop: expense.shop,
      amountBdt: Number(expense.amount_bdt),
    })),
    pockets: rawCase.pockets.map((pocket) => ({
      id: pocket.id,
      name: pocket.name,
      item: pocket.item,
      targetBdt: Number(pocket.target_bdt),
      monthlyContributionBdt: Number(pocket.monthly_contribution_bdt),
    })),
    dpsAnnualRatePercent: Number(rawCase.dps_annual_rate_percent),
  };
}
