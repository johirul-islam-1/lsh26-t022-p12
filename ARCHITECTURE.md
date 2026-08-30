# Architecture — Ledgerly P12 Competition Build

## System shape

```text
Next.js App Router
│
├── Client ledger UI
│   ├── salary editor
│   ├── manual expense editor
│   ├── receipt review editor
│   ├── active-month navigation
│   ├── category / largest-expense analytics
│   ├── deterministic forecast + insights
│   └── savings pockets + DPS illustration
│
├── Browser localStorage
│   └── salary, expenses, pockets, DPS rate, ledger date
│
└── /api/receipt (Node.js runtime)
    ├── validates file existence/type/size
    ├── Google Gen AI multimodal extraction
    ├── retries transient 408/429/5xx failures
    ├── model fallback for temporary provider load
    ├── structured response
    └── Zod validation
```

## Domain calculations

### Monthly dashboard

Expenses are filtered by `YYYY-MM`. Totals are accumulated in paisa-oriented integer form before formatting back to BDT.

### Forecast

For an in-progress month:

```text
projected spend = spent so far / elapsed days × days in month
expected remaining spend = max(projected spend - spent so far, 0)
projected balance = salary - projected spend
```

Completed months use actual spend; future/empty months do not invent spending.

### Written insights

Insights are deterministic and are generated from actual category totals, previous-month amounts and largest transactions. They always include real BDT amounts rather than generic language.

### Forecast-aware savings

```text
forecast savings budget = max(projected month-end balance, 0)
funding ratio = min(1, forecast savings budget / total planned pocket contributions)
effective pocket contribution = planned contribution × funding ratio
months to target = ceil(target / effective contribution)
```

This lets goal dates move later when the spending forecast cannot safely support the full savings plan.

### DPS

For each month:

```text
balance += deposit
interest = round_half_up(balance × annual_rate / 12 / 100, to paisa)
balance += interest
```

Interest compounds because each later month starts from the interest-inclusive balance.

## Reliability choices

- Server-side API key isolation.
- File allow-list and 8 MB receipt limit.
- Structured response + Zod validation.
- Retry/fallback for transient AI outages.
- Manual expense entry remains available when OCR is unavailable.
- Local data persistence survives refresh.
- Build 0 and Build 1 stable Git tags preserve rollback points.

## Deliberate non-features

Authentication, a database, account sync and enterprise infrastructure were intentionally omitted because they are not required by P12 and would add event-time deployment risk without improving the four required MVP flows.
