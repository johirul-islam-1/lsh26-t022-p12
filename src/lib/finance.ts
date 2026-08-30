import type { Expense, LedgerState } from "./types";

function monthKey(date: string) {
  return date.slice(0, 7);
}

function toPaisa(value: number) {
  return Math.round((value + Number.EPSILON) * 100);
}

function fromPaisa(value: number) {
  return value / 100;
}

function sumExpenses(items: Expense[]) {
  return fromPaisa(items.reduce((total, item) => total + toPaisa(item.amountBdt), 0));
}

function roundMoney(value: number) {
  return fromPaisa(toPaisa(value));
}

function previousMonthOf(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const previousDate = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
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
  const previousMonth = previousMonthOf(thisMonth);

  const current = state.expenses.filter((expense) => monthKey(expense.date) === thisMonth);
  const previous = state.expenses.filter((expense) => monthKey(expense.date) === previousMonth);

  const spent = sumExpenses(current);
  const previousSpent = sumExpenses(previous);

  const categoryMap = new Map<string, number>();
  for (const expense of current) {
    categoryMap.set(
      expense.category,
      (categoryMap.get(expense.category) ?? 0) + toPaisa(expense.amountBdt),
    );
  }

  const categories = [...categoryMap.entries()]
    .map(([name, amountPaisa]) => ({ name, amount: fromPaisa(amountPaisa) }))
    .sort((a, b) => b.amount - a.amount);

  const largest = [...current].sort((a, b) => b.amountBdt - a.amountBdt).slice(0, 4);

  return {
    spent,
    previousSpent,
    salary: state.salaryBdt,
    remaining: roundMoney(state.salaryBdt - spent),
    percent: state.salaryBdt > 0 ? (spent / state.salaryBdt) * 100 : 0,
    changePercent: previousSpent > 0 ? ((spent - previousSpent) / previousSpent) * 100 : 0,
    changeAmount: roundMoney(spent - previousSpent),
    month: thisMonth,
    previousMonth,
    categories,
    largest,
  };
}

export function getForecastFixture(state: LedgerState, selectedMonth?: string) {
  const month = selectedMonth ?? monthKey(state.today);
  const latestMonth = monthKey(state.today);
  const dashboard = getDashboardFixture(state, month);
  const totalDays = daysInMonth(month);

  const isCompletedMonth = month < latestMonth;
  const elapsedDays = isCompletedMonth
    ? totalDays
    : month === latestMonth
      ? Math.max(1, Math.min(dayOfMonth(state.today), totalDays))
      : 0;

  const projectedSpend = isCompletedMonth || elapsedDays === totalDays
    ? dashboard.spent
    : elapsedDays > 0
      ? roundMoney((dashboard.spent / elapsedDays) * totalDays)
      : 0;

  const expectedRemainingSpend = roundMoney(Math.max(projectedSpend - dashboard.spent, 0));
  const projectedBalance = roundMoney(state.salaryBdt - projectedSpend);
  const dailyPace = elapsedDays > 0 ? roundMoney(dashboard.spent / elapsedDays) : 0;

  const previousCategoryMap = new Map<string, number>();
  for (const expense of state.expenses.filter((item) => monthKey(item.date) === dashboard.previousMonth)) {
    previousCategoryMap.set(
      expense.category,
      (previousCategoryMap.get(expense.category) ?? 0) + toPaisa(expense.amountBdt),
    );
  }

  const insights: string[] = [];

  for (const category of dashboard.categories.slice(0, 3)) {
    const previousAmount = fromPaisa(previousCategoryMap.get(category.name) ?? 0);

    if (previousAmount > 0) {
      const difference = roundMoney(category.amount - previousAmount);
      const direction = difference >= 0 ? "higher" : "lower";
      insights.push(
        `${category.name} is ${money(category.amount)} this month, ${money(Math.abs(difference))} ${direction} than the previous month.`,
      );
    } else {
      insights.push(`${category.name} has reached ${money(category.amount)} this month.`);
    }
  }

  const topCategory = dashboard.categories[0];
  const largestExpense = dashboard.largest[0];

  if (insights.length < 3 && topCategory) {
    const projectedCategory = isCompletedMonth || elapsedDays === totalDays
      ? topCategory.amount
      : elapsedDays > 0
        ? roundMoney((topCategory.amount / elapsedDays) * totalDays)
        : topCategory.amount;

    insights.push(
      `${topCategory.name} is pacing toward ${money(projectedCategory)} by month end from ${money(topCategory.amount)} recorded so far.`,
    );
  }

  if (insights.length < 3 && largestExpense) {
    insights.push(
      `The largest ${largestExpense.category} transaction is ${money(largestExpense.amountBdt)} at ${largestExpense.shop}.`,
    );
  }

  while (insights.length < 3 && topCategory) {
    insights.push(
      `${topCategory.name} represents ${money(topCategory.amount)} of the ${money(dashboard.spent)} recorded this month.`,
    );
  }

  return {
    month,
    totalDays,
    elapsedDays,
    isCompletedMonth,
    spentSoFar: dashboard.spent,
    projectedSpend,
    expectedRemainingSpend,
    projectedBalance,
    dailyPace,
    insights: insights.slice(0, 3),
  };
}


function roundHalfUpInteger(numerator: number, denominator: number) {
  return Math.floor((numerator + denominator / 2) / denominator);
}

function addMonthsToMonthEnd(date: string, months: number) {
  const [year, monthNumber] = date.slice(0, 7).split("-").map(Number);
  const target = new Date(Date.UTC(year, monthNumber - 1 + Math.max(months - 1, 0) + 1, 0));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
}

export function calculateDpsReturn(monthlyDepositBdt: number, months: number, annualRatePercent: number) {
  const depositPaisa = Math.max(0, toPaisa(monthlyDepositBdt));
  const rateBasisPoints = Math.max(0, Math.round(annualRatePercent * 100));
  const monthlyRateDenominator = 120000;

  let balancePaisa = 0;
  let depositedPaisa = 0;

  for (let month = 0; month < Math.max(0, months); month += 1) {
    balancePaisa += depositPaisa;
    depositedPaisa += depositPaisa;

    const interestPaisa = roundHalfUpInteger(
      balancePaisa * rateBasisPoints,
      monthlyRateDenominator,
    );

    balancePaisa += interestPaisa;
  }

  const balance = balancePaisa / 100;
  const deposited = depositedPaisa / 100;

  return {
    balance: roundMoney(balance),
    deposited: roundMoney(deposited),
    interest: roundMoney(balance - deposited),
  };
}

export function getSavingsPocketPlan(state: LedgerState) {
  const currentMonth = monthKey(state.today);
  const forecast = getForecastFixture(state, currentMonth);
  const forecastSavingsBudget = roundMoney(Math.max(forecast.projectedBalance, 0));
  const plannedMonthly = sumExpenses(
    state.pockets.map((pocket) => ({
      id: pocket.id,
      date: state.today,
      category: "Savings",
      shop: pocket.name,
      amountBdt: pocket.monthlyContributionBdt,
    })),
  );

  const fundingRatio = plannedMonthly > 0
    ? Math.min(1, forecastSavingsBudget / plannedMonthly)
    : 0;

  const pockets = state.pockets.map((pocket) => {
    const effectiveMonthlyContribution = roundMoney(
      pocket.monthlyContributionBdt * fundingRatio,
    );
    const targetPaisa = toPaisa(pocket.targetBdt);
    const effectivePaisa = toPaisa(effectiveMonthlyContribution);
    const monthsToGoal = effectivePaisa > 0
      ? Math.max(1, Math.ceil(targetPaisa / effectivePaisa))
      : null;
    const completionDate = monthsToGoal
      ? addMonthsToMonthEnd(state.today, monthsToGoal)
      : null;
    const dps = monthsToGoal
      ? calculateDpsReturn(
          effectiveMonthlyContribution,
          monthsToGoal,
          state.dpsAnnualRatePercent,
        )
      : { balance: 0, deposited: 0, interest: 0 };

    return {
      ...pocket,
      effectiveMonthlyContribution,
      fundingRatio,
      monthsToGoal,
      completionDate,
      dps,
    };
  });

  return {
    currentMonth,
    forecastSavingsBudget,
    plannedMonthly: roundMoney(plannedMonthly),
    fundingRatio,
    dpsAnnualRatePercent: state.dpsAnnualRatePercent,
    pockets,
  };
}
