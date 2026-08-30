"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
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
const emptyDraft: ReceiptDraft = {
  amountBdt: null,
  date: null,
  shop: null,
  category: "Other",
  confidence: null,
};

type ScanStatus = "idle" | "reading" | "review" | "error";

export default function Home() {
  const [ledger, setLedger] = useState<LedgerState>(initialLedger);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanError, setScanError] = useState("");
  const [draft, setDraft] = useState<ReceiptDraft>(emptyDraft);
  const [fileName, setFileName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const timer = window.setTimeout(() => {
    try {
      setLedger(JSON.parse(saved) as LedgerState);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, 0);

  return () => window.clearTimeout(timer);
}, []);

  const dashboard = useMemo(() => getDashboardFixture(ledger), [ledger]);
  const positiveChange = dashboard.changePercent >= 0;

  function persistLedger(next: LedgerState) {
    setLedger(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function openPicker() {
    setSavedMessage("");
    fileInputRef.current?.click();
  }

  async function scanReceipt(file: File) {
    setFileName(file.name);
    setDraft(emptyDraft);
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

    const next: LedgerState = {
      ...ledger,
      expenses: [
        ...ledger.expenses,
        {
          id: `E-${Date.now()}`,
          date,
          shop,
          category,
          amountBdt: amount,
        },
      ],
    };

    persistLedger(next);
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
          <span>Receipt extraction + review + local save enabled.</span>
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
            <button className="button secondary" type="button" disabled title="Manual expense form is next in Build 1">
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
          <div><strong>Receipt scan:</strong> upload a JPG, PNG or WebP, verify the extracted fields, then save.</div>
          <span>Gemini runs server-side; your API key is never sent to the browser.</span>
        </div>

        <section className="hero-grid" aria-label="Monthly summary">
          <article className="metric metric-featured">
            <div className="metric-head"><span>Spent this month</span><CircleDollarSign size={18} /></div>
            <strong>{money(dashboard.spent)}</strong>
            <div className="progress"><span style={{ width: `${Math.min(dashboard.percent, 100)}%` }} /></div>
            <p>{dashboard.percent.toFixed(1)}% of {money(dashboard.salary)} salary</p>
          </article>

          <article className="metric">
            <div className="metric-head"><span>Available now</span><Landmark size={18} /></div>
            <strong>{money(dashboard.remaining)}</strong>
            <p>Salary minus recorded monthly spending</p>
          </article>

          <article className="metric">
            <div className="metric-head"><span>vs last month</span>{positiveChange ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</div>
            <strong>{Math.abs(dashboard.changePercent).toFixed(1)}%</strong>
            <p>{positiveChange ? "higher" : "lower"} than last month&apos;s full total</p>
          </article>
        </section>

        <section className="two-column">
          <article className="panel" id="expenses">
            <div className="panel-heading">
              <div><p className="eyebrow">BREAKDOWN</p><h2>Where the money went</h2></div>
              <button className="text-button" type="button" disabled>View all <ChevronRight size={16} /></button>
            </div>
            <div className="category-list">
              {dashboard.categories.slice(0, 6).map((category) => (
                <div className="category-row" key={category.name}>
                  <div className="category-copy"><span>{category.name}</span><small>{money(category.amount)}</small></div>
                  <div className="bar"><span style={{ width: `${Math.max(6, (category.amount / Math.max(dashboard.categories[0]?.amount ?? 1, 1)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="forecast">
            <div className="panel-heading"><div><p className="eyebrow">NEXT BUILD</p><h2>Forecast & insights</h2></div><Sparkles size={20} /></div>
            <div className="empty-feature">
              <div className="empty-icon"><Sparkles size={22} /></div>
              <h3>Deterministic forecast engine plugs in here</h3>
              <p>Next we calculate month-end spend, projected balance and 3+ amount-specific insights from real ledger data.</p>
            </div>
          </article>
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
