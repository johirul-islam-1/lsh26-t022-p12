"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Plus,
  ReceiptText,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { getDemoLedger } from "@/lib/demo";
import { getDashboardFixture, money } from "@/lib/finance";

const ledger = getDemoLedger();
const dashboard = getDashboardFixture(ledger);

export default function Home() {
  const positiveChange = dashboard.changePercent >= 0;

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
          <strong>Build 0</strong>
          <span>Foundation preview using public case PUB-01.</span>
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
            <button className="button secondary" type="button" disabled title="Enabled in Build 1">
              <Plus size={17} /> Add expense
            </button>
            <button className="button primary" type="button" disabled title="Enabled in Build 1">
              <Camera size={17} /> Scan receipt
            </button>
          </div>
        </header>

        <div className="foundation-banner" role="status">
          <div><strong>Foundation gate:</strong> UI, public fixture parsing, SDK import and production route are wired.</div>
          <span>Receipt OCR intentionally disabled until Build 1.</span>
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
            <p>Salary minus recorded April spending</p>
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
                  <div className="bar"><span style={{ width: `${Math.max(6, (category.amount / dashboard.categories[0].amount) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel" id="forecast">
            <div className="panel-heading"><div><p className="eyebrow">NEXT BUILD</p><h2>Forecast & insights</h2></div><Sparkles size={20} /></div>
            <div className="empty-feature">
              <div className="empty-icon"><Sparkles size={22} /></div>
              <h3>Deterministic forecast engine plugs in here</h3>
              <p>Build 1 will calculate month-end spend, projected balance and 3+ amount-specific insights from real ledger data.</p>
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
    </main>
  );
}
