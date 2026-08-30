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
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getDemoLedger } from "@/lib/demo";
import { getDashboardFixture, money } from "@/lib/finance";
import { CATEGORIES, type LedgerState, type ReceiptDraft } from "@/lib/types";

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
  const [activeMonth, setActiveMonth] = useState(() => monthFromDate(initialLedger.today));
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
          <span>Salary + manual + receipt expense capture enabled.</span>
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
              <button className="text-button" type="button" disabled>View all <ChevronRight size={16} /></button>
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
          <div className="panel-heading"><div><p className="eyebrow">NEXT BUILD</p><h2>Forecast & insights</h2></div><Sparkles size={20} /></div>
          <div className="empty-feature compact-empty">
            <div className="empty-icon"><Sparkles size={22} /></div>
            <div>
              <h3>Deterministic forecast engine plugs in here</h3>
              <p>Next we calculate month-end spend, projected balance and 3+ amount-specific insights from real ledger data.</p>
            </div>
          </div>
        </section>

        <section className="panel" id="pockets">
          <div className="panel-heading">
            <div><p className="eyebrow">GOALS</p><h2>Savings pockets</h2></div>
            <button className="button secondary small" type="button" disabled><Plus size={16} /> New pocket</button>
          </div>
          <div className="pocket-grid">
            {ledger.pockets.map((pocket) => (
              <div className="pocket" key={pocket.id}>
                <div className="pocket-icon"><Target size={19} /></div>
                <div><strong>{pocket.name}</strong><p>{pocket.item}</p></div>
                <dl><div><dt>Target</dt><dd>{money(pocket.targetBdt)}</dd></div><div><dt>Monthly</dt><dd>{money(pocket.monthlyContributionBdt)}</dd></div></dl>
              </div>
            ))}
          </div>
        </section>
      </section>

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
