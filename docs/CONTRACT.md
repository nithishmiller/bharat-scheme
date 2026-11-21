# Bharat Scheme — build contract (owner: god). Read fully before writing code.

## Product
Family welfare assistant. Journey: family profile (wizard) → rule-based eligibility → ranked schemes with
transparent "Why this matches" checklist (✓ met / ✗ not met / ? need info) → scheme detail (benefits, documents,
how to apply, official link, last verified date, source label) → save to tracker → reminders/notifications.
Signature moment: "Family Eligibility Map" — results grouped by family member (who in the family benefits from
which scheme), each with the rule-by-rule checklist. The AI only EXPLAINS verified data; eligibility = rules engine.

## Repo layout & ownership (strict — write only in your folder)
- server/                → backend worker (Express API, auth, DB, engine, AI proxy, notifications)
- server/data/schemes.json → data worker ONLY (backend may create a 3-scheme stub ONLY if file missing)
- client/                → frontend worker (React + Vite)
- docs/CONTRACT.md       → god only
- README.md (root)       → backend worker writes setup steps for server+client

## Runtime facts (this machine)
- Node 24. No MySQL installed. No OpenAI key saved.
- So: DB layer has two drivers behind one repository interface: `mysql` (mysql2, used when MYSQL_URL set) and
  `local` (JSON file at server/.localdb.json, default). Ship server/db/schema.sql (MySQL DDL) + seed script.
- AI: OpenAI via backend when OPENAI_API_KEY set (model env OPENAI_MODEL, default "gpt-4o-mini"). Otherwise a
  deterministic explainer that composes plain-language text from the scheme's verified fields; response has
  `mode: "openai" | "offline"` and the UI labels it.
- Notifications: in-app notifications stored in DB (always). Firebase Cloud Messaging adapter only when
  FIREBASE_* env set; otherwise no-op. Never fake.
- Ports: server 4000, client 5173 (Vite proxy /api → 4000).

## Scheme JSON shape (server/data/schemes.json is an array of these)
{
  "id": "pm-kisan",                       // kebab slug
  "name": { "en": "...", "ta": "..." },
  "ministry": "Ministry of Agriculture & Farmers Welfare",
  "level": "central" | "state",
  "state": null | "Tamil Nadu",           // for state schemes
  "category": "education|farmer|women|children|senior|health|housing|employment|disability|financial",
  "summary": { "en": "...", "ta": "..." },   // one sentence, plain language
  "benefits": { "en": ["..."], "ta": ["..."] },
  "documents": ["Aadhaar card", "..."],      // English
  "howToApply": { "en": ["step 1", "..."], "ta": ["..."] },
  "officialUrl": "https://pmkisan.gov.in/",  // MUST be a real official URL you are confident exists
  "sourceUrl": "https://www.myscheme.gov.in/schemes/pm-kisan", // real page or null
  "lastVerified": "2026-11-21",
  "dataStatus": "demo-curated",              // always this; we have no live API
  "deadline": null | "2027-01-31",           // only if real & known; else null
  "rules": [ Rule ]
}
Rule = { "id": "r1", "field": <ProfileField>, "op": "eq|neq|lte|gte|lt|gt|in|true|false",
         "value": any, "label": { "en": "Annual family income up to ₹2,50,000", "ta": "..." } }
`scope` of a scheme: "person" (rules on one member) — all rules evaluate against a member merged with household fields.

## Profile fields (member object; household fields copied onto each member during evaluation)
Household: state, district, annualIncome (number ₹), familySize (number), area ("rural"|"urban"),
           category ("general"|"obc"|"sc"|"st"|"ews"), bplCard (bool), ownsHouse (bool), rationCard (bool)
Member:    id, name, relation ("self|spouse|child|parent|sibling|other"), age (number), gender ("male|female|other"),
           occupation ("farmer|student|salaried|self-employed|unemployed|homemaker|daily-wage|retired"),
           education ("none|primary|secondary|higher-secondary|graduate|postgraduate"),
           isStudent (bool), studyLevel ("school|pre-matric|post-matric|ug|pg"|null),
           landHoldingAcres (number|null), isWidow (bool), hasDisability (bool|null — null unless consented),
           disabilityPercent (number|null), consentGiven (bool), sensitiveConsent (bool)
Unknown field (null/undefined) → rule result "unknown" (never "met").

## Engine output (per member × scheme)
{ schemeId, memberId, status: "eligible" | "likely" | "not-eligible",
  score: 0-100, checks: [{ ruleId, label, result: "met"|"unmet"|"unknown" }] }
eligible = all met; likely = no unmet but ≥1 unknown; not-eligible = ≥1 unmet. Members with consentGiven=false
are skipped (and reported as `skipped`). hasDisability rules are only evaluated if sensitiveConsent true.

## API (all JSON, prefix /api; JWT Bearer except auth + public scheme reads)
POST /api/auth/register {name,email,password} → {token,user}
POST /api/auth/login {email,password} → {token,user}         demo user: demo@bharatscheme.in / demo1234 (seeded, with a family)
GET  /api/me → {user}
GET  /api/family → {household, members[]}
PUT  /api/family/household {…household}
POST /api/family/members {…member} → member ; PUT /api/family/members/:id ; DELETE /api/family/members/:id
GET  /api/schemes?q=&category=&level=&state= → {schemes[], dataStatus:"demo-curated"}
GET  /api/schemes/:id → scheme
GET  /api/categories → [{id, label:{en,ta}, count}]
POST /api/recommendations → {generatedAt, results:[{member, matches:[EngineOutput+scheme summary]}], skipped:[]}
      (body optional: {household, members} for guest mode; else uses saved family)
POST /api/ai/explain {schemeId, memberId?, lang:"en"|"ta"} → {mode, text}
POST /api/ai/ask {question, schemeId?, lang} → {mode, text, citedSchemeIds[]}   // answers ONLY from dataset
GET  /api/tracker → items[] ; POST /api/tracker {schemeId, memberId} ; PATCH /api/tracker/:id {status, notes, documentsDone[]}
      status: interested|started|submitted|verification|approved|rejected ; item has history[{status,at}], reminderAt
GET  /api/notifications ; POST /api/notifications/:id/read
Admin (user.role==="admin"; seeded admin@bharatscheme.in / admin1234):
GET/POST/PUT/DELETE /api/admin/schemes[/:id] ; GET /api/admin/analytics → {totalRuns, topSchemes[], byCategory[], byState[]}
Errors: {error:{code,message}} with proper HTTP status.

## Design direction (frontend)
Civic, trustworthy, editorial — like a well-made public-service document, not a SaaS dashboard.
- Palette: ink navy #0B2545 (text/primary), paper #FBFAF7 (bg), white surfaces, rule lines #E4E1D8,
  India-green #1E7B4F for "eligible/met", amber #B7791F for "need info", brick #A63D40 for "unmet".
  Saffron #E07A1F used sparingly (one accent, e.g. focus/active tab). No gradients, no glass, no glow, no blobs.
- Type: "Source Serif 4" for headings/scheme names, "Inter" or "IBM Plex Sans" for UI, "Noto Sans Tamil" for ta.
- Radius 6px max; 1px rules instead of heavy shadows; dense, aligned tables/lists over card grids.
- Every scheme surface shows a provenance strip: [DEMO-CURATED DATA] · Source: myscheme.gov.in · Verified 21 Nov 2026.
- AI text always in a bordered "Plain-language explanation — informational only" box with mode badge.
- Language toggle EN / தமிழ் in header, persisted. Fully responsive.
