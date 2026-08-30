# Third-Party Material and AI Disclosure

This file follows the LofiStack Hackathon 2026 Submission Kit v2.2 disclosure requirement.

## Frameworks, libraries and material dependencies

| Name | Version or source URL | Licence | Used for |
| --- | --- | --- | --- |
| Next.js | 16.3.0 | MIT | Application framework, routing, server receipt endpoint |
| React | 19.2.8 | MIT | Interactive client UI |
| React DOM | 19.2.8 | MIT | Browser rendering |
| `@google/genai` | 2.19.0 | Apache-2.0 | Gemini receipt-image extraction |
| Zod | 4.5.4 | MIT | Runtime validation/parsing |
| Lucide React | 1.37.0 | ISC | Interface icons |
| TypeScript | 5.9.x | Apache-2.0 | Type checking and compilation |
| ESLint | 9.x | MIT | Static analysis/linting |
| `eslint-config-next` | 16.3.0 | MIT | Next.js lint configuration |
| LofiStack P12 public fixture | Organizer-provided event material | Organizer-provided hackathon material | Local public-case regression validation; not required by production runtime |

## Starters, templates, UI kits, fonts and assets

- No third-party UI template was copied into the final interface.
- No third-party UI kit was used for the product layout.
- No external image asset is required for the core UI.
- The stylesheet uses an `Inter`/system fallback font stack but no font file is bundled or redistributed by this repository.
- Generic Next.js/package boilerplate is declared through the repository history and `EVENT.md` as applicable.

## AI tools

### OpenAI ChatGPT

**Used for:** implementation planning, code drafting/review, debugging assistance, test-harness assistance, architecture and documentation drafting.

**Verification:** the team reviewed and integrated the output, ran TypeScript type checking, ESLint, production builds, manual local/production smoke tests, and regression-tested the deterministic P12 finance engine against all 25 published public cases.

### Google Gemini

**Used for:** runtime receipt-image understanding through the server-side `@google/genai` integration.

**Verification:** receipt responses are requested as structured JSON, validated server-side, categories are normalized, extracted values are shown in an editable review step before save, and the receipt workflow was manually tested in the deployed application.

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the registered team during the event work for this submission. The team remains responsible for understanding, testing and defending all submitted code and behaviour.
