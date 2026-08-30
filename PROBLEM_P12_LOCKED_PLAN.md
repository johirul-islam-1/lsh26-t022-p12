# P12 LOCKED PLAN — Personal Ledger Manager

Status: **LOCKED for Build 0**

## Product concept

**Ledgerly** — a receipt-first monthly money cockpit for salaried users. The user can capture an expense from a receipt, verify/correct the extraction, understand month-to-date spending and forecasted month-end balance, then connect that forecast to concrete savings pockets and a transparent DPS comparison.

## Four official MVP bullets

### MVP 1 — Salary + expenses + receipt extraction
Acceptance:
- user can set monthly salary;
- user can add an expense manually;
- user can upload a bill/receipt image;
- app extracts **amount, date, shop name** (plus category as a convenience);
- extracted values are shown before save;
- every extracted value is editable;
- save persists the corrected values.

Judge proof:
1. upload receipt;
2. extracted preview appears;
3. edit one field visibly;
4. save;
5. expense appears in transaction list/dashboard.

### MVP 2 — Monthly dashboard
Acceptance:
- total spent against salary;
- category breakdown;
- largest expenses;
- change compared with previous month;
- all values update after adding/editing an expense.

Judge proof:
- dashboard summary cards + category view + largest transactions + month comparison.

### MVP 3 — Forecast + amount-specific insights
Acceptance:
- forecast expected spending for rest of month;
- forecast expected money left or short at month-end;
- display at least 3 insights, each naming a category and BDT amount;
- insights are generated from actual ledger numbers, not generic AI advice.

Locked deterministic forecast:
- `elapsedDays = day(today)`
- `daysInMonth = calendar days in current month`
- `currentSpent = sum(current-month expenses through today)`
- `dailyRunRate = currentSpent / elapsedDays`
- `expectedRest = dailyRunRate * (daysInMonth - elapsedDays)`
- `forecastTotal = currentSpent + expectedRest`
- `forecastBalance = salary - forecastTotal`

Why: transparent, testable, no AI dependency, easy for judges to verify. Build 2 may add a secondary category-aware forecast, but this baseline remains visible and documented.

Locked insight engine:
- largest current-month category with amount;
- largest category increase/decrease vs last month with both amounts;
- highest projected category at month-end with projected amount;
- optional 4th insight when projected spend exceeds salary or a category dominates spend.

### MVP 4 — Savings pockets + forecast-aware completion + DPS
Acceptance:
- create pocket with name, target amount, item details, monthly contribution;
- show expected completion date;
- completion reflects forecast affordability;
- state DPS annual rate visibly;
- show DPS maturity value over the same horizon.

Forecast-aware contribution rule:
- `projectedFreeCash = max(0, salary - forecastTotal)`
- `plannedPocketContributions = sum(monthly contributions)`
- `affordabilityFactor = min(1, projectedFreeCash / plannedPocketContributions)`
- each pocket's `effectiveMonthlyContribution = plannedContribution * affordabilityFactor`
- if factor is 0, completion is shown as **Not currently fundable**;
- otherwise `monthsToGoal = ceil(target / effectiveMonthlyContribution)`.

DPS rule (must match provided public cases):
- annual rate is explicitly displayed;
- monthly loop: **deposit first**, then calculate monthly interest;
- interest = `balance × annualRate / 12 / 100`;
- interest rounds **half-up to paisa** each month;
- interest is added to balance and compounds in later months;
- implement using integer paisa/BigInt to avoid floating-point drift.

## Public case contract

Input fixture schema from `P12_personal_ledger_public.json`:
- `today` ISO date;
- `salary_bdt` decimal string;
- `expenses[]` with id/date/category/shop/amount_bdt;
- `pockets[]` with name/item/target/monthly_contribution;
- `dps_annual_rate_percent` decimal string.

Build 0 bundles `PUB-01` as the truthful fixture journey.

## Data model

```ts
LedgerState {
  today: string
  salaryBdt: number
  expenses: Expense[]
  pockets: SavingsPocket[]
  dpsAnnualRatePercent: number
}
```

Browser persistence in Build 1: localStorage. No auth/database because identity is not required by the problem and adding it increases deployment risk. Data export/import can be a Build 2 differentiator if time remains.

## Pages / components

Single responsive app shell:
- Overview/dashboard
- Expense list
- Add expense modal
- Receipt upload + extraction review modal
- Forecast & insights section
- Savings pockets grid + create/edit modal

No multi-page navigation is required for MVP.

## Receipt extraction architecture

Client image -> `/api/receipt` Next.js Route Handler -> Gemini multimodal -> structured JSON -> Zod validation -> editable review form -> local save.

Primary provider: Gemini `gemini-3.7-flash`.
Failure UX:
- preserve uploaded image preview;
- explain OCR failure in plain language;
- keep manual fields available so no user input is lost;
- never auto-save uncertain extraction.

## Tech lock

- Node.js 20+
- Next.js 16.3 App Router
- React 19.2
- TypeScript
- plain CSS (no design-system dependency)
- `@google/genai` for receipt image understanding
- `zod` for provider/output validation
- `lucide-react` for icons
- Vercel deployment
- localStorage for ledger state

## UX lock

- product style: restrained, high-contrast, LofiStack-inspired editorial/product feel;
- one obvious primary action: **Scan receipt**;
- secondary action: **Add expense**;
- immediate acknowledgement and staged scan state: Reading receipt -> Checking fields -> Ready to review;
- no fake exact percentages;
- BDT formatting throughout;
- responsive down to 320px;
- never expose raw provider errors directly to users.

## Build order

1. Build 0 shell + public fixture + API route resolution + local/prod deployment.
2. Build 1 finance engine + state store + manual expense + receipt OCR + editable review.
3. Build 1 dashboard calculations + forecast + insights + pockets + exact DPS.
4. Production verification 4/4.
5. Build 2 error/loading/empty states, mobile polish, demo data control, docs, adversarial QA.

## DO NOT ADD before 4/4

- bank sync;
- auth;
- Supabase;
- AI-written financial advice;
- multiple AI providers;
- complex chart libraries;
- animations;
- notifications;
- currency conversion.

## Demo path

1. Set/confirm salary.
2. Scan receipt, correct a field, save.
3. Dashboard visibly updates.
4. Show forecast and 3 concrete category/amount insights.
5. Create pocket, show forecast-aware completion date and DPS maturity at stated rate.

