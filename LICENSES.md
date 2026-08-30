# Third-party licences

This file records material third-party software and assets used by the P12 submission.

| Dependency | Version | Licence | Purpose |
|---|---:|---|---|
| Next.js | 16.3.0 | MIT | React framework, routing and server API |
| React | 19.2.8 | MIT | User interface |
| React DOM | 19.2.8 | MIT | Browser renderer |
| Google Gen AI SDK (`@google/genai`) | 2.19.0 | Apache-2.0 | Receipt image understanding |
| Zod | 4.5.4 | MIT | Runtime receipt-response validation |
| Lucide React | 1.37.0 | ISC | Interface icons |
| TypeScript | 5.9.x | Apache-2.0 | Compiler and type checking |
| ESLint | 9.x | MIT | Static linting |
| eslint-config-next | 16.3.0 | MIT | Next.js lint configuration |

## Assets, templates and data

- No third-party UI template was copied.
- No third-party image asset is bundled with the application.
- Product UI and CSS were authored for this submission.
- Hackathon-provided `P12_personal_ledger_public.json` data was used as official public evaluation/reference data.
- No proprietary receipt image is committed to the repository.

## External services

Google Gemini is accessed through the Google Gen AI SDK using a server-side API key. The API key is not committed to the repository.

## Notes

Package licences above refer to the direct project dependencies used by the submitted application. The repository's `package-lock.json` preserves the exact dependency graph used for installation.
