# Ledgerly — P12 Personal Ledger Manager

Build 0 foundation for the LofiStack hackathon P12 solution.

## What Build 0 proves

- Next.js/React/TypeScript project topology;
- responsive judge-facing product shell;
- parsing of official public case `PUB-01`;
- Google GenAI SDK resolves in the server route;
- `/api/receipt` is deployable;
- no secret is required to build the foundation.

Receipt extraction and real editing are **intentionally not claimed in Build 0**. They are enabled only in Build 1 after local + production foundation verification.

## Run

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`.

Health-check the API route:

```bash
curl http://localhost:3000/api/receipt
```

Expected JSON includes `"build":"b0-skeleton"`.

## Environment

Copy `.env.example` to `.env.local` only when enabling Build 1 OCR:

```bash
cp .env.example .env.local
```

Never commit `.env.local`.

## Deployment

Import the repository into Vercel or run:

```bash
npx vercel
```

For Build 0, `GEMINI_API_KEY` may be unset. After deployment verify:

- `/` loads in a fresh browser;
- `/api/receipt` returns HTTP 200 on GET;
- mobile width does not overflow;
- public fixture cards render.

## Current limitations

Build 0 uses a public fixture and disabled mutation controls. This is deliberate and must not be presented as completed P12 functionality.

See `PROBLEM_P12_LOCKED_PLAN.md` for Build 1 acceptance criteria and calculations.
