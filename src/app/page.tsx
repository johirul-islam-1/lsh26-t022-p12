"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getDemoLedger } from "@/lib/demo";
import { getDashboardFixture, getForecastFixture, getSavingsPocketPlan, money } from "@/lib/finance";
import { CATEGORIES, type Expense, type LedgerState, type ReceiptDraft } from "@/lib/types";

const initialLedger = getDemoLedger();
const STORAGE_KEY = "ledgerly-state-v1";

const emptyReceiptDraft: ReceiptDraft = {
  amountBdt: null,
  date: null,
  shop: null,
  category: "Other",
  confidence: null,
};

type ScanStatus = "idle" | "reading" | "review" | "error";

type ManualExpenseDraft = {
  amountBdt: number | null;
  date: string;
  shop: string;
  category: string;
};

type PocketDraft = {
  name: string;
  item: string;
  targetBdt: number | null;
  monthlyContributionBdt: number | null;
};

const emptyPocketDraft: PocketDraft = {
  name: "",
  item: "",
  targetBdt: null,
  monthlyContributionBdt: null,
};

function makeManualDraft(date: string): ManualExpenseDraft {
  return {
    amountBdt: null,
    date,
    shop: "",
    category: "Other",
  };
}

function monthFromDate(date: string) {
  return date.slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function shortExpenseDate(date: string) {
  const [year, monthNumber, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, day)));
}

export default function Home() {
  const [ledger, setLedger] = useState<LedgerState>(initialLedger);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanError, setScanError] = useState("");
  const [draft, setDraft] = useState<ReceiptDraft>(emptyReceiptDraft);
  const [fileName, setFileName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualDraft, setManualDraft] = useState<ManualExpenseDraft>(() => makeManualDraft(initialLedger.today));
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [salaryInput, setSalaryInput] = useState(String(initialLedger.salaryBdt));
  const [salaryError, setSalaryError] = useState("");
  const [pocketOpen, setPocketOpen] = useState(false);
  const [pocketDraft, setPocketDraft] = useState<PocketDraft>(emptyPocketDraft);
  const [pocketError, setPocketError] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const [rateInput, setRateInput] = useState(String(initialLedger.dpsAnnualRatePercent));
  const [rateError, setRateError] = useState("");
  const [activeMonth, setActiveMonth] = useState(() => monthFromDate(initialLedger.today));
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseDraft, setEditExpenseDraft] = useState<ManualExpenseDraft>(() => makeManualDraft(initialLedger.today));
  const [editExpenseError, setEditExpenseError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const timer = window.setTimeout(() => {
      try {
        const restored = JSON.parse(saved) as LedgerState;
        setLedger(restored);
        setActiveMonth(monthFromDate(restored.today));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const dashboard = useMemo(() => getDashboardFixture(ledger, activeMonth), [ledger, activeMonth]);
  const forecast = useMemo(() => getForecastFixture(ledger, activeMonth), [ledger, activeMonth]);
  const savingsPlan = useMemo(() => getSavingsPocketPlan(ledger), [ledger]);
  const activeMonthExpenses = useMemo(
    () => ledger.expenses
      .filter((expense) => monthFromDate(expense.date) === activeMonth)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [ledger.expenses, activeMonth],
  );
  const positiveChange = dashboard.changePercent >= 0;
  const hasPreviousMonthSpending = dashboard.previousSpent > 0;
  const activeMonthLabel = monthLabel(activeMonth);
  const previousMonthLabel = monthLabel(dashboard.previousMonth);
  const latestMonth = monthFromDate(ledger.today);

  function persistLedger(next: LedgerState) {
    setLedger(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function appendExpense(expense: {
    amountBdt: number;
    date: string;
    shop: string;
    category: string;
  }) {
    const nextToday = expense.date > ledger.today ? expense.date : ledger.today;

    const next: LedgerState = {
      ...ledger,
      today: nextToday,
      expenses: [
        ...ledger.expenses,
        {
          id: `E-${Date.now()}`,
          ...expense,
        },
      ],
    };

    persistLedger(next);
    setActiveMonth(monthFromDate(expense.date));
  }

  function openExpensesHistory() {
    setSavedMessage("");
    setEditingExpenseId(null);
    setEditExpenseError("");
    setPendingDeleteId(null);
    setExpensesOpen(true);
  }

  function startEditingExpense(expense: Expense) {
    setPendingDeleteId(null);
    setEditExpenseError("");
    setEditExpenseDraft({
      amountBdt: expense.amountBdt,
      date: expense.date,
      shop: expense.shop,
      category: expense.category,
    });
    setEditingExpenseId(expense.id);
  }

  function saveEditedExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingExpenseId) return;

    const amount = Number(editExpenseDraft.amountBdt);
    const date = editExpenseDraft.date.trim();
    const shop = editExpenseDraft.shop.trim();
    const category = editExpenseDraft.category.trim() || "Other";

    if (!Number.isFinite(amount) || amount <= 0) {
      setEditExpenseError("Enter an expense amount greater than zero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setEditExpenseError("Choose a valid expense date.");
      return;
    }

    if (!shop) {
      setEditExpenseError("Enter a shop, merchant or expense name.");
      return;
    }

    const nextToday = date > ledger.today ? date : ledger.today;
    const next: LedgerState = {
      ...ledger,
      today: nextToday,
      expenses: ledger.expenses.map((expense) =>
        expense.id === editingExpenseId
          ? { ...expense, amountBdt: amount, date, shop, category }
          : expense,
      ),
    };

    persistLedger(next);
    setActiveMonth(monthFromDate(date));
    setEditingExpenseId(null);
    setEditExpenseError("");
    setPendingDeleteId(null);
    setSavedMessage(`Updated ${money(amount)} from ${shop}.`);
  }

  function deleteExpense(expenseId: string) {
    const expense = ledger.expenses.find((item) => item.id === expenseId);
    if (!expense) return;

    persistLedger({
      ...ledger,
      expenses: ledger.expenses.filter((item) => item.id !== expenseId),
    });

    setPendingDeleteId(null);
    setEditingExpenseId(null);
    setEditExpenseError("");
    setSavedMessage(`Deleted ${money(expense.amountBdt)} from ${expense.shop}.`);
  }

  function openManualExpense() {
    setSavedMessage("");
    setManualError("");
    setManualDraft(makeManualDraft(ledger.today));
    setManualOpen(true);
  }

  function saveManualExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(manualDraft.amountBdt);
    const date = manualDraft.date.trim();
    const shop = manualDraft.shop.trim();
    const category = manualDraft.category.trim() || "Other";

    if (!Number.isFinite(amount) || amount <= 0) {
      setManualError("Enter an expense amount greater than zero.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setManualError("Choose a valid expense date.");
      return;
    }

    if (!shop) {
      setManualError("Enter a shop, merchant or expense name.");
      return;
    }

    appendExpense({ amountBdt: amount, date, shop, category });
    setManualOpen(false);
    setManualError("");
    setSavedMessage(`Saved ${money(amount)} from ${shop}.`);
  }

  function openSalaryEditor() {
    setSavedMessage("");
    setSalaryError("");
    setSalaryInput(String(ledger.salaryBdt));
    setSalaryOpen(true);
  }

  function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const salary = Number(salaryInput);

    if (!Number.isFinite(salary) || salary <= 0) {
      setSalaryError("Enter a monthly salary greater than zero.");
      return;
    }

    persistLedger({
      ...ledger,
      salaryBdt: salary,
    });

    setSalaryOpen(false);
    setSalaryError("");
    setSavedMessage(`Monthly salary updated to ${money(salary)}.`);
  }

  function openPocketEditor() {
    setSavedMessage("");
    setPocketError("");
    setPocketDraft(emptyPocketDraft);
    setPocketOpen(true);
  }

  function savePocket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = pocketDraft.name.trim();
    const item = pocketDraft.item.trim();
    const target = Number(pocketDraft.targetBdt);
    const monthly = Number(pocketDraft.monthlyContributionBdt);

    if (!name || !item) {
      setPocketError("Add a pocket name and item details.");
      return;
    }

    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(monthly) || monthly <= 0) {
      setPocketError("Target and monthly contribution must be greater than zero.");
      return;
    }

    persistLedger({
      ...ledger,
      pockets: [
        ...ledger.pockets,
        {
          id: `SP-${Date.now()}`,
          name,
          item,
          targetBdt: target,
          monthlyContributionBdt: monthly,
        },
      ],
    });

    setPocketOpen(false);
    setPocketError("");
    setSavedMessage(`Created ${name} pocket with a ${money(target)} target.`);
  }

  function openRateEditor() {
    setSavedMessage("");
    setRateError("");
    setRateInput(String(ledger.dpsAnnualRatePercent));
    setRateOpen(true);
  }

  function saveDpsRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rate = Number(rateInput);

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setRateError("Enter an annual DPS rate between 0% and 100%.");
      return;
    }

    persistLedger({ ...ledger, dpsAnnualRatePercent: rate });
    setRateOpen(false);
    setRateError("");
    setSavedMessage(`DPS illustration rate updated to ${rate.toFixed(2)}% per year.`);
  }

  function openPicker() {
    setSavedMessage("");
    fileInputRef.current?.click();
  }

  async function scanReceipt(file: File) {
    setFileName(file.name);
    setDraft(emptyReceiptDraft);
    setScanError("");
    setScanStatus("reading");
    setScanOpen(true);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const response = await fetch("/api/receipt", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; receipt?: ReceiptDraft }
        | null;

      if (!response.ok || !body?.receipt) {
        throw new Error(body?.message || "Receipt scanning failed.");
      }

      setDraft(body.receipt);
      setScanStatus("review");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Receipt scanning failed.");
      setScanStatus("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function saveReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(draft.amountBdt);
    const date = draft.date?.trim() ?? "";
    const shop = draft.shop?.trim() ?? "";
    const category = draft.category?.trim() || "Other";

    if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !shop) {
      setScanError("Check the amount, date and shop name before saving.");
      return;
    }

    appendExpense({ amountBdt: amount, date, shop, category });
    setScanOpen(false);
    setScanStatus("idle");
    setScanError("");
    setSavedMessage(`Saved ${money(amount)} from ${shop}.`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>Ledgerly</span></div>
        <nav className="nav-list" aria-label="Primary navigation">
          <a className="nav-item active" href="#overview"><WalletCards size={18} />Overview</a>
          <a className="nav-item" href="#expenses"><ReceiptText size={18} />Expenses</a>
          <a className="nav-item" href="#pockets"><Target size={18} />Savings pockets</a>
          <a className="nav-item" href="#forecast"><Sparkles size={18} />Forecast</a>
        </nav>
        <div className="sidebar-note">
          <strong>Build 1</strong>
          <span>All four MVP flows enabled: expenses, dashboard, forecast and savings planning.</span>
        </div>
      </aside>

      <section className="content" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL LEDGER</p>
            <h1>Know where your salary is going.</h1>
            <p className="subtle">A receipt-first monthly view with forecasts and goal planning.</p>
          </div>
          <div className="actions">
            <button className="button secondary" type="button" onClick={openManualExpense}>
              <Plus size={17} /> Add expense
            </button>
            <button className="button primary" type="button" onClick={openPicker}>
              <Camera size={17} /> Scan receipt
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              aria-label="Choose receipt image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void scanReceipt(file);
              }}
            />
          </div>
        </header>

        {savedMessage ? <div className="success-banner" role="status">{savedMessage}</div> : null}

        <div className="foundation-banner" role="status">
          <div><strong>Expense capture:</strong> add an expense manually or scan a receipt and verify the extracted fields.</div>
          <span>Everything saves locally in this browser; Gemini credentials stay server-side.</span>
        </div>

        <div className="month-toolbar" aria-label="Dashboard month">
          <div>
            <p className="eyebrow">VIEWING MONTH</p>
            <strong>{activeMonthLabel}</strong>
          </div>
          <div className="month-nav">
            <button
              className="icon-button"
              type="button"
              aria-label="View previous month"
              onClick={() => setActiveMonth((current) => shiftMonth(current, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="View next month"
              disabled={activeMonth >= latestMonth}
              onClick={() => setActiveMonth((current) => shiftMonth(current, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <section className="hero-grid" aria-label={`Monthly summary for ${activeMonthLabel}`}>
          <article className="metric metric-featured">
            <div className="metric-head"><span>Spent this month</span><CircleDollarSign size={18} /></div>
            <strong>{money(dashboard.spent)}</strong>
            <div className="progress"><span style={{ width: `${Math.min(dashboard.percent, 100)}%` }} /></div>
            <p>{dashboard.percent.toFixed(1)}% of {money(dashboard.salary)} salary</p>
          </article>

          <article className="metric">
            <div className="metric-head"><span>Available now</span><Landmark size={18} /></div>
            <strong>{money(dashboard.remaining)}</strong>
            <div className="metric-footer-row">
              <p>Salary minus recorded monthly spending</p>
              <button className="metric-action" type="button" onClick={openSalaryEditor}>Edit salary</button>
            </div>
          </article>

          <article className="metric">
            <div className="metric-head"><span>vs {previousMonthLabel}</span>{positiveChange ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</div>
            <strong>{hasPreviousMonthSpending ? `${Math.abs(dashboard.changePercent).toFixed(1)}%` : "—"}</strong>
            <p>
              {hasPreviousMonthSpending
                ? `${money(Math.abs(dashboard.changeAmount))} ${positiveChange ? "higher" : "lower"} than ${previousMonthLabel}`
                : `No spending recorded in ${previousMonthLabel}`}
            </p>
          </article>
        </section>

        <section className="two-column">
          <article className="panel" id="expenses">
            <div className="panel-heading">
              <div><p className="eyebrow">BREAKDOWN</p><h2>Where the money went</h2></div>
              <button className="text-button" type="button" onClick={openExpensesHistory}>View all <ChevronRight size={16} /></button>
            </div>
            <div className="category-list">
              {dashboard.categories.length ? dashboard.categories.slice(0, 6).map((category) => (
                <div className="category-row" key={category.name}>
                  <div className="category-copy"><span>{category.name}</span><small>{money(category.amount)}</small></div>
                  <div className="bar"><span style={{ width: `${Math.max(6, (category.amount / Math.max(dashboard.categories[0]?.amount ?? 1, 1)) * 100)}%` }} /></div>
                </div>
              )) : <p className="subtle">No expenses recorded for this month yet.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><p className="eyebrow">TOP SPEND</p><h2>Largest expenses</h2></div>
              <ReceiptText size={20} />
            </div>
            <div className="largest-list">
              {dashboard.largest.length ? dashboard.largest.map((expense, index) => (
                <div className="largest-expense" key={expense.id}>
                  <div className="largest-rank" aria-hidden="true">{index + 1}</div>
                  <div className="largest-copy">
                    <strong>{expense.shop}</strong>
                    <span>{expense.category} · {shortExpenseDate(expense.date)}</span>
                  </div>
                  <strong className="largest-amount">{money(expense.amountBdt)}</strong>
                </div>
              )) : <p className="subtle">No expenses recorded for {activeMonthLabel} yet.</p>}
            </div>
          </article>
        </section>

        <section className="panel forecast-panel" id="forecast">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{forecast.isCompletedMonth ? "MONTH REVIEW" : "PACE FORECAST"}</p>
              <h2>Forecast & insights</h2>
            </div>
            <Sparkles size={20} />
          </div>

          <div className="forecast-grid" aria-label={`Forecast for ${activeMonthLabel}`}>
            <div className="forecast-metric">
              <span>{forecast.isCompletedMonth ? "Final month spend" : "Projected month spend"}</span>
              <strong>{money(forecast.projectedSpend)}</strong>
              <small>{forecast.isCompletedMonth ? "Completed month — actual total" : `${money(forecast.dailyPace)} average per elapsed day`}</small>
            </div>

            <div className="forecast-metric">
              <span>Expected remaining spend</span>
              <strong>{money(forecast.expectedRemainingSpend)}</strong>
              <small>{forecast.isCompletedMonth ? "No days remaining in this month" : `${forecast.totalDays - forecast.elapsedDays} day${forecast.totalDays - forecast.elapsedDays === 1 ? "" : "s"} remaining`}</small>
            </div>

            <div className={`forecast-metric ${forecast.projectedBalance < 0 ? "forecast-danger" : "forecast-positive"}`}>
              <span>{forecast.projectedBalance < 0 ? "Expected shortfall" : "Expected money left"}</span>
              <strong>{money(Math.abs(forecast.projectedBalance))}</strong>
              <small>Salary {money(ledger.salaryBdt)} minus projected spending</small>
            </div>
          </div>

          <div className="forecast-context">
            <span>{forecast.isCompletedMonth ? `${activeMonthLabel} is complete.` : `Using ${forecast.elapsedDays} of ${forecast.totalDays} elapsed days.`}</span>
            <strong>{money(forecast.spentSoFar)} recorded</strong>
          </div>

          <div className="insight-section">
            <div className="insight-heading">
              <div>
                <p className="eyebrow">NUMBER-BACKED NOTES</p>
                <h3>What stands out</h3>
              </div>
              <span>{forecast.insights.length ? `${forecast.insights.length} insights` : "Waiting for expenses"}</span>
            </div>

            {forecast.insights.length ? (
              <div className="insight-grid">
                {forecast.insights.map((insight, index) => (
                  <div className="insight-card" key={`${activeMonth}-${index}`}>
                    <span className="insight-number">0{index + 1}</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="forecast-empty">
                <Sparkles size={19} />
                <p>Add an expense in {activeMonthLabel} to generate category-specific insights.</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel savings-panel" id="pockets">
          <div className="panel-heading savings-heading">
            <div>
              <p className="eyebrow">GOALS</p>
              <h2>Savings pockets</h2>
              <p className="subtle savings-subtitle">Completion dates use the current spending forecast, so goal plans slow down automatically when the month is tight.</p>
            </div>
            <button className="button secondary small" type="button" onClick={openPocketEditor}><Plus size={16} /> New pocket</button>
          </div>

          <div className="savings-summary">
            <div>
              <span>Forecast savings budget</span>
              <strong>{money(savingsPlan.forecastSavingsBudget)} / month</strong>
              <small>Projected salary left after this month&apos;s spending pace</small>
            </div>
            <div>
              <span>Planned pocket contributions</span>
              <strong>{money(savingsPlan.plannedMonthly)} / month</strong>
              <small>{savingsPlan.fundingRatio >= 1 ? "All planned contributions fit the forecast." : `${(savingsPlan.fundingRatio * 100).toFixed(1)}% of planned contributions are affordable.`}</small>
            </div>
            <div>
              <span>DPS illustration</span>
              <strong>{savingsPlan.dpsAnnualRatePercent.toFixed(2)}% p.a.</strong>
              <button className="metric-action rate-action" type="button" onClick={openRateEditor}>Edit rate</button>
            </div>
          </div>

          {savingsPlan.pockets.length ? (
            <div className="pocket-grid projection-grid">
              {savingsPlan.pockets.map((pocket) => (
                <article className="pocket pocket-projection" key={pocket.id}>
                  <div className="pocket-title-row">
                    <div className="pocket-icon"><Target size={19} /></div>
                    <div><strong>{pocket.name}</strong><p>{pocket.item}</p></div>
                  </div>

                  <dl>
                    <div><dt>Target</dt><dd>{money(pocket.targetBdt)}</dd></div>
                    <div><dt>Planned</dt><dd>{money(pocket.monthlyContributionBdt)} / mo</dd></div>
                  </dl>

                  {pocket.monthsToGoal ? (
                    <>
                      <div className={`goal-status ${pocket.fundingRatio < 1 ? "goal-adjusted" : ""}`}>
                        <span>{pocket.fundingRatio < 1 ? "Forecast-adjusted contribution" : "Affordable contribution"}</span>
                        <strong>{money(pocket.effectiveMonthlyContribution)} / month</strong>
                        <small>{pocket.fundingRatio < 1 ? `Reduced from ${money(pocket.monthlyContributionBdt)} to keep all pockets within the forecast.` : "Your current forecast can support the full planned amount."}</small>
                      </div>

                      <div className="goal-date-row">
                        <div>
                          <span>Expected completion</span>
                          <strong>{pocket.completionDate ? monthLabel(pocket.completionDate.slice(0, 7)) : "—"}</strong>
                          <small>{pocket.monthsToGoal} month{pocket.monthsToGoal === 1 ? "" : "s"} at the forecast-adjusted contribution</small>
                        </div>
                      </div>

                      <div className="dps-result">
                        <div>
                          <span>DPS value over the same time</span>
                          <strong>{money(pocket.dps.balance)}</strong>
                        </div>
                        <small>{money(pocket.dps.deposited)} deposited + {money(pocket.dps.interest)} interest at {savingsPlan.dpsAnnualRatePercent.toFixed(2)}% p.a.</small>
                      </div>
                    </>
                  ) : (
                    <div className="goal-status goal-paused">
                      <span>Goal paused by forecast</span>
                      <strong>No affordable monthly contribution</strong>
                      <small>The current pace projects no money left after monthly spending. Reduce spending or increase salary to get a completion date.</small>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="forecast-empty">
              <Target size={19} />
              <p>Create a savings pocket to get a forecast-aware completion date and DPS comparison.</p>
            </div>
          )}

          <p className="dps-note">DPS is an illustration, not a bank quote. Each month the deposit is added first, then monthly interest is calculated from the stated annual rate, rounded half-up to the paisa, and compounded into the balance.</p>
        </section>
      </section>

      {expensesOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal expense-history-modal" role="dialog" aria-modal="true" aria-labelledby="expense-history-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">EXPENSE HISTORY</p>
                <h2 id="expense-history-title">All expenses — {activeMonthLabel}</h2>
                <p className="modal-file">{activeMonthExpenses.length} transaction{activeMonthExpenses.length === 1 ? "" : "s"} · {money(dashboard.spent)} recorded</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close expense history"
                onClick={() => {
                  setExpensesOpen(false);
                  setEditingExpenseId(null);
                  setPendingDeleteId(null);
                  setEditExpenseError("");
                }}
              >
                <X size={19} />
              </button>
            </div>

            {editingExpenseId ? (
              <form className="receipt-form expense-edit-form" onSubmit={saveEditedExpense}>
                <div className="expense-edit-banner">
                  <div>
                    <strong>Edit saved expense</strong>
                    <span>Saving immediately recalculates the dashboard, forecast and savings plan.</span>
                  </div>
                </div>

                <label>
                  Amount (BDT)
                  <input
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={editExpenseDraft.amountBdt ?? ""}
                    onChange={(event) => setEditExpenseDraft((current) => ({
                      ...current,
                      amountBdt: event.target.value === "" ? null : Number(event.target.value),
                    }))}
                    autoFocus
                    required
                  />
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={editExpenseDraft.date}
                    onChange={(event) => setEditExpenseDraft((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  Shop / expense name
                  <input
                    type="text"
                    value={editExpenseDraft.shop}
                    onChange={(event) => setEditExpenseDraft((current) => ({ ...current, shop: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  Category
                  <select
                    value={editExpenseDraft.category}
                    onChange={(event) => setEditExpenseDraft((current) => ({ ...current, category: event.target.value }))}
                  >
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>

                {editExpenseError ? <p className="field-error" role="alert">{editExpenseError}</p> : null}

                <div className="modal-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      setEditingExpenseId(null);
                      setEditExpenseError("");
                    }}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">Save changes</button>
                </div>
              </form>
            ) : activeMonthExpenses.length ? (
              <div className="expense-history-list">
                {activeMonthExpenses.map((expense) => (
                  <article className="expense-history-row" key={expense.id}>
                    <div className="expense-history-date">
                      <strong>{shortExpenseDate(expense.date)}</strong>
                      <span>{expense.category}</span>
                    </div>
                    <div className="expense-history-copy">
                      <strong>{expense.shop}</strong>
                      <span>{expense.date}</span>
                    </div>
                    <strong className="expense-history-amount">{money(expense.amountBdt)}</strong>
                    <div className="expense-history-actions">
                      {pendingDeleteId === expense.id ? (
                        <div className="delete-confirm" role="group" aria-label={`Confirm deleting ${expense.shop}`}>
                          <span>Delete?</span>
                          <button className="history-action" type="button" onClick={() => setPendingDeleteId(null)}>Cancel</button>
                          <button className="history-action danger" type="button" onClick={() => deleteExpense(expense.id)}>Confirm</button>
                        </div>
                      ) : (
                        <>
                          <button className="history-action" type="button" onClick={() => startEditingExpense(expense)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="history-action danger" type="button" onClick={() => setPendingDeleteId(expense.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="expense-history-empty">
                <ReceiptText size={22} />
                <div>
                  <strong>No expenses in {activeMonthLabel}</strong>
                  <p>Add an expense or scan a receipt to start this month&apos;s ledger.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {manualOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="manual-expense-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">NEW EXPENSE</p>
                <h2 id="manual-expense-title">Add an expense</h2>
                <p className="modal-file">Record a purchase without a receipt.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close manual expense form" onClick={() => setManualOpen(false)}>
                <X size={19} />
              </button>
            </div>

            <form className="receipt-form" onSubmit={saveManualExpense}>
              <label>
                Amount (BDT)
                <input
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={manualDraft.amountBdt ?? ""}
                  onChange={(event) => setManualDraft((current) => ({
                    ...current,
                    amountBdt: event.target.value === "" ? null : Number(event.target.value),
                  }))}
                  autoFocus
                  required
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={manualDraft.date}
                  onChange={(event) => setManualDraft((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>

              <label>
                Shop / expense name
                <input
                  type="text"
                  value={manualDraft.shop}
                  onChange={(event) => setManualDraft((current) => ({ ...current, shop: event.target.value }))}
                  placeholder="e.g. Bus fare"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={manualDraft.category}
                  onChange={(event) => setManualDraft((current) => ({ ...current, category: event.target.value }))}
                >
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>

              {manualError ? <p className="field-error" role="alert">{manualError}</p> : null}

              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setManualOpen(false)}>Cancel</button>
                <button className="button primary" type="submit">Save expense</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {salaryOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal salary-modal" role="dialog" aria-modal="true" aria-labelledby="salary-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">MONTHLY INCOME</p>
                <h2 id="salary-title">Set monthly salary</h2>
                <p className="modal-file">Dashboard percentages and available balance update immediately.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close salary editor" onClick={() => setSalaryOpen(false)}>
                <X size={19} />
              </button>
            </div>

            <form className="receipt-form salary-form" onSubmit={saveSalary}>
              <label className="form-wide">
                Monthly salary (BDT)
                <input
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={salaryInput}
                  onChange={(event) => setSalaryInput(event.target.value)}
                  autoFocus
                  required
                />
              </label>

              {salaryError ? <p className="field-error" role="alert">{salaryError}</p> : null}

              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setSalaryOpen(false)}>Cancel</button>
                <button className="button primary" type="submit">Save salary</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {pocketOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="pocket-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">NEW SAVINGS GOAL</p>
                <h2 id="pocket-title">Create a savings pocket</h2>
                <p className="modal-file">We will estimate its completion date from your current forecast.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close pocket form" onClick={() => setPocketOpen(false)}><X size={19} /></button>
            </div>

            <form className="receipt-form" onSubmit={savePocket}>
              <label>
                Pocket name
                <input type="text" value={pocketDraft.name} onChange={(event) => setPocketDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Camera" autoFocus required />
              </label>
              <label>
                Item details
                <input type="text" value={pocketDraft.item} onChange={(event) => setPocketDraft((current) => ({ ...current, item: event.target.value }))} placeholder="e.g. Sony ZV-E10" required />
              </label>
              <label>
                Target (BDT)
                <input inputMode="decimal" min="0.01" step="0.01" type="number" value={pocketDraft.targetBdt ?? ""} onChange={(event) => setPocketDraft((current) => ({ ...current, targetBdt: event.target.value === "" ? null : Number(event.target.value) }))} required />
              </label>
              <label>
                Planned monthly contribution
                <input inputMode="decimal" min="0.01" step="0.01" type="number" value={pocketDraft.monthlyContributionBdt ?? ""} onChange={(event) => setPocketDraft((current) => ({ ...current, monthlyContributionBdt: event.target.value === "" ? null : Number(event.target.value) }))} required />
              </label>

              {pocketError ? <p className="field-error" role="alert">{pocketError}</p> : null}

              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setPocketOpen(false)}>Cancel</button>
                <button className="button primary" type="submit">Create pocket</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {rateOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal salary-modal" role="dialog" aria-modal="true" aria-labelledby="dps-rate-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">DPS ASSUMPTION</p>
                <h2 id="dps-rate-title">Set annual DPS rate</h2>
                <p className="modal-file">This stated rate is used only for the savings comparison shown on each pocket.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close DPS rate editor" onClick={() => setRateOpen(false)}><X size={19} /></button>
            </div>

            <form className="receipt-form salary-form" onSubmit={saveDpsRate}>
              <label className="form-wide">
                Annual rate (%)
                <input inputMode="decimal" min="0" max="100" step="0.01" type="number" value={rateInput} onChange={(event) => setRateInput(event.target.value)} autoFocus required />
              </label>
              {rateError ? <p className="field-error" role="alert">{rateError}</p> : null}
              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setRateOpen(false)}>Cancel</button>
                <button className="button primary" type="submit">Save rate</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {scanOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">RECEIPT CHECK</p>
                <h2 id="receipt-title">{scanStatus === "reading" ? "Reading your receipt…" : "Check what we read"}</h2>
                {fileName ? <p className="modal-file">{fileName}</p> : null}
              </div>
              <button className="icon-button" type="button" aria-label="Close receipt scanner" onClick={() => setScanOpen(false)}>
                <X size={19} />
              </button>
            </div>

            {scanStatus === "reading" ? (
              <div className="scan-progress" role="status" aria-live="polite">
                <LoaderCircle className="spin" size={26} />
                <div><strong>Extracting amount, date and shop</strong><p>This usually takes a few seconds.</p></div>
              </div>
            ) : null}

            {scanStatus === "error" ? (
              <div className="scan-error" role="alert">
                <strong>Couldn&apos;t scan this receipt.</strong>
                <p>{scanError}</p>
                <button className="button secondary" type="button" onClick={openPicker}>Choose another image</button>
              </div>
            ) : null}

            {scanStatus === "review" ? (
              <form className="receipt-form" onSubmit={saveReceipt}>
                <div className="confidence-row">
                  <span>Extraction confidence</span>
                  <strong>{draft.confidence == null ? "—" : `${Math.round(draft.confidence * 100)}%`}</strong>
                </div>

                <label>
                  Amount (BDT)
                  <input
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={draft.amountBdt ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, amountBdt: event.target.value === "" ? null : Number(event.target.value) }))}
                    required
                  />
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={draft.date ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>

                <label>
                  Shop / merchant
                  <input
                    type="text"
                    value={draft.shop ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, shop: event.target.value }))}
                    placeholder="e.g. Meena Bazar"
                    required
                  />
                </label>

                <label>
                  Category
                  <select value={draft.category ?? "Other"} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>

                {scanError ? <p className="field-error" role="alert">{scanError}</p> : null}

                <div className="modal-actions">
                  <button className="button secondary" type="button" onClick={openPicker}>Rescan</button>
                  <button className="button primary" type="submit">Save expense</button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
