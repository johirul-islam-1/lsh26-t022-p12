# Ledgerly — P12 Personal Ledger Manager

**Team ID:** LSH26-T022
**Problem ID:** P12 — Personal Ledger Manager
**Live URL:** https://lsh26-t022-p12.vercel.app
**Repository:** https://github.com/johirul-islam-1/lsh26-t022-p12

Ledgerly is a monthly personal-finance workspace for salary earners. It combines manual expense capture, AI-assisted receipt extraction, month-by-month analytics, deterministic spending forecasts, and forecast-aware savings-pocket planning with DPS projections.

## Required MVP proof

### 1. Salary + expense capture + editable receipt extraction

- Edit monthly salary from the dashboard.
- Add expenses manually with amount, date, merchant and category.
- Upload JPG, PNG or WebP receipts up to 8 MB.
- The server sends the image to Gemini and extracts amount, date, merchant and category.
- Extracted values are shown in an editable review form before save.
- Receipt scanning retries transient failures and can fall back between configured Gemini Flash models.
- Saved data persists in browser `localStorage`.

**Judge path:** `Overview → Add expense` or `Overview → Scan receipt`.

### 2. Monthly dashboard

For the selected month Ledgerly shows:

- total spending versus salary;
- available money;
- category breakdown;
- largest expenses;
- previous-month comparison;
- previous/next month navigation;
- explicit empty states when a month has no transactions.

**Judge path:** use the month arrows above the dashboard and compare a populated month with an empty month.

### 3. Forecast + written insights

Forecasting is deterministic and derived from the ledger:

`projected month spend = spent so far / elapsed days × days in month`

Ledgerly shows:

- projected full-month spending;
- expected remaining spending;
- expected money left or shortfall;
- daily spending pace;
- three written insights containing real category/transaction names and BDT amounts.

Completed months use their actual final spend instead of extrapolation.

**Judge path:** `Overview → Forecast & insights`.

### 4. Savings pockets + DPS illustration

A savings pocket stores:

- pocket name;
- item/details;
- target amount;
- planned monthly contribution.

The app compares total planned contributions with the forecasted month-end money available. If the plan is too aggressive, each pocket receives a forecast-adjusted affordable contribution. From that amount Ledgerly computes an expected completion month.

The DPS illustration uses the stated annual rate. For each month:

1. add that month's deposit;
2. calculate monthly interest from the current balance;
3. round interest half-up to the paisa;
4. add the interest back to the balance so future months compound on it.

The UI shows DPS maturity value, total deposits and interest earned over the same completion horizon. The rate is editable.

**Judge path:** `Overview → Savings pockets → New pocket` and `Edit rate`.

## Approach statement

We prioritized a complete, judge-verifiable 4/4 functional MVP first, then hardened the fragile receipt dependency and made every finance output deterministic and explainable. The app deliberately uses local browser persistence instead of adding authentication/database complexity that P12 does not require.

## What is mocked / seeded

- The initial ledger is seeded from hackathon-provided public fixture data so the dashboard has an immediately demonstrable state.
- Salary edits, manual expenses, receipt extraction, month analytics, forecasts, savings-pocket calculations and DPS projections are real interactive logic.
- No receipt OCR result is hard-coded.

## Architecture

```text
Browser / Next.js client
├── localStorage ledger persistence
├── manual salary + expense workflows
├── monthly dashboard engine
├── deterministic forecast engine
└── savings / DPS engine
        │
        └── exact paisa-oriented money calculations

Receipt image
└── POST /api/receipt
    ├── file type / size validation
    ├── Google Gen AI SDK
    ├── transient retry + model fallback
    ├── structured JSON response
    ├── Zod validation
    └── editable browser review before save
```

No authentication or database was added because P12 does not require identity or multi-user collaboration. This keeps the four-hour submission small, deterministic and deployable. Ledger data remains in the current browser.

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Google Gen AI SDK
- Zod
- Lucide React
- Vercel

## Local setup

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local
```

Set:

```env
GEMINI_API_KEY=your_private_key
GEMINI_MODEL=gemini-3.7-flash
```

Never commit `.env.local`.

Run:

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`.

Health check:

```bash
curl http://localhost:3000/api/receipt
```

A configured environment returns JSON containing `"geminiConfigured": true`.

## Production

Production is deployed on Vercel:

https://lsh26-t022-p12.vercel.app

Required production environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## Important product / technical decisions

- **Deterministic forecast instead of generative finance advice:** outputs remain reproducible and directly traceable to ledger values.
- **Editable OCR review:** AI extraction is treated as a draft, never unquestioned ground truth.
- **Provider resilience:** transient Gemini failures are retried and eligible for model fallback instead of breaking the rest of the ledger.
- **Monthly separation:** expenses remain attached to their transaction month; month navigation prevents cross-month totals from being mixed.
- **Local-first persistence:** avoids adding an unnecessary auth/database dependency during the event.
- **Paisa-aware calculations:** decimal BDT amounts are preserved through dashboard and DPS calculations.
- **Forecast-aware pockets:** goal timing slows down when the current spending forecast leaves insufficient room for planned contributions.

## Validation and failure states

The UI handles:

- missing/invalid manual expense fields;
- invalid salary, pocket and DPS-rate values;
- unsupported or oversized receipt images;
- receipt AI/provider failures with retry-friendly messaging;
- empty months;
- months without previous-month spending;
- savings plans with insufficient forecasted budget;
- refresh persistence.

## Known limitations

- Ledger data is stored per browser/device in `localStorage`; there is no account sync.
- Receipt extraction depends on an external Gemini service and may be temporarily unavailable.
- Receipt OCR can be imperfect, which is why extracted fields must be reviewed before saving.
- Forecasting is a transparent pace projection, not financial advice.
- DPS output is an illustration based on the stated rate and compounding rule, not a bank quote.
- The app currently presents BDT-focused copy and formatting.

## Evaluation notes

The repository includes `evaluation-manifest.json` as a concise judge/evaluator map of the live URL, health endpoint and four required proof flows.

The hackathon-provided P12 public cases informed deterministic calculation and DPS behavior. The solution does not depend on hidden data or hard-coded evaluator outputs.

## Team contributions

- **FH-TOUHID:** P12 implementation, integration, testing and deployment.
- **Johirul Islam:** repository ownership / team coordination.

If the registered team has additional members, add their exact contribution here before repository freeze.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

## Licence information

See [`LICENSES.md`](./LICENSES.md).
