# Integration points (all DISABLED)

Bharat Scheme runs on a demo-curated dataset (`server/data/schemes.json`). No live government API is called.
The integrations below are **documented, not implemented**. No endpoint URLs or credentials are included on purpose:
each needs a registration/approval process with its provider, and you must use the URLs and keys they issue.

| Integration | Intended use | Status |
|---|---|---|
| **API Setu** (Government of India API gateway) | Verify identity/certificate documents with the user's consent | Disabled. Needs organisation onboarding and issued credentials. |
| **myScheme** | Refresh scheme metadata (eligibility, benefits, links) instead of the hand-curated file | Disabled. No public API contract is assumed; today `sourceUrl` only links to the public scheme page. |
| **DigiLocker** | Fetch consented documents (Aadhaar, income certificate, ration card) to pre-fill the tracker | Disabled. Needs requester registration and OAuth credentials. |

## How one would be added later
1. Add a module here, e.g. `src/integrations/<name>.js`, exporting `{ enabled, ... }`; `enabled` must be `false` unless every required env var is present.
2. Read its settings from env (never commit keys) and keep every call behind explicit user consent.
3. Keep eligibility decisions in `src/engine.js`; integrations may only supply data (scheme records or documents), never verdicts.
4. Update `lastVerified` and `dataStatus` so the UI stops labelling that data "demo-curated" only when it is truly live-sourced.
