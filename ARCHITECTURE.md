# Architecture — Build 0

```text
Browser
  ├─ Dashboard shell + public fixture
  ├─ Expense workflow (Build 1)
  ├─ Forecast engine (Build 1)
  └─ Savings/DPS engine (Build 1)
        |
        └─ localStorage persistence (Build 1)

Receipt image
  -> Next.js /api/receipt
  -> Gemini multimodal structured extraction (Build 1)
  -> Zod validation
  -> editable review
  -> save to ledger
```

Build 0 intentionally proves the project topology, dependencies, responsive shell, public fixture parsing and deployable server route before full business logic is added.
