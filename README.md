# Bharat Scheme

Family welfare assistant: enter a family profile, get rule-based eligibility for government schemes grouped by family member, with a rule-by-rule "why this matches" checklist, a tracker and reminders.

> **Data status:** scheme data is **demo-curated** (`server/data/schemes.json`), not live. Always confirm on the official link before applying. Eligibility comes from the rules engine; AI only explains the curated dataset. No government website or API was opened or verified while building it.

## Quick start (no database, no API keys)

Needs Node 20+ (built on Node 24). Open two terminals.

```bash
# Terminal 1: API on http://localhost:4000
cd server
npm install
npm run dev          # or: npm start

# Terminal 2: web app on http://localhost:5173 (Vite proxies /api to :4000)
cd client
npm install
npm run dev
```

## Deploy to Render

Deploy the entire app (API + React SPA) as a single free Render Web Service:

1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** and select **Blueprint**.
3. Connect your repository. Render automatically reads [`render.yaml`](render.yaml).
4. Click **Apply**.

Render will:
- Run `buildCommand: npm run build` (installs client & server deps and compiles Vite client to `client/dist`).
- Run `startCommand: npm start` (`node server/src/index.js`), which listens on `process.env.PORT` and serves `/api/*` endpoints alongside static assets with SPA fallback (`index.html`).
- Automatically generate a secure `JWT_SECRET`.
- Monitor health via `/api/health`.

> **Note on storage:** Render free instances use an ephemeral filesystem. The local JSON database (`server/.localdb.json`) re-seeds on every fresh start/restart with demo accounts. For persistent production data, set the `MYSQL_URL` environment variable.

Demo logins (seeded automatically on first start):

| Role | Email | Password |
|---|---|---|
| Demo family (Tamil Nadu farming household, 5 members) | `demo@bharatscheme.in` | `demo1234` |
| Admin | `admin@bharatscheme.in` | `admin1234` |

Check the API: `curl localhost:4000/api/schemes` and `curl localhost:4000/api/health`.

## Tests

```bash
cd server && npm test      # rules-engine unit tests + API tests (node:test)
```

## Environment variables (server)

All optional. Set them in the shell before `npm run dev`.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `JWT_SECRET` | insecure dev value (warned at start) | **Set this outside local demos** |
| `MYSQL_URL` | unset | Switches the data layer from the local JSON file to MySQL, e.g. `mysql://user:pass@localhost:3306/bharat_scheme` |
| `LOCAL_DB_PATH` | `server/.localdb.json` | Local driver file (`:memory:` for tests) |
| `SCHEMES_PATH` | `server/data/schemes.json` | Scheme dataset file |
| `OPENAI_API_KEY` | unset | Enables OpenAI for `/api/ai/*`; otherwise the offline explainer is used (responses carry `mode: "openai" \| "offline"`) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used when a key is set |
| `CORS_ORIGIN` | `*` | Allowed browser origin |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | unset | Push adapter; a no-op unless all three are set **and** `npm i firebase-admin` was run. In-app notifications always work. |

## Optional: MySQL

1. Create a database and load the schema:
   ```bash
   mysql -u <user> -p -e "CREATE DATABASE bharat_scheme CHARACTER SET utf8mb4"
   mysql -u <user> -p bharat_scheme < server/db/schema.sql
   ```
2. Start with the URL set (the seed runs automatically at start; or run it explicitly):
   ```bash
   cd server
   MYSQL_URL='mysql://user:pass@localhost:3306/bharat_scheme' npm run seed
   MYSQL_URL='mysql://user:pass@localhost:3306/bharat_scheme' npm run dev
   ```
The MySQL driver follows `server/db/schema.sql` but has **not been run against a live MySQL here** (none installed); the local driver is what the tests and demo use.

## How it fits together

- `server/src/engine.js`: pure rules engine (`eligible` / `likely` / `not-eligible`, per member x scheme; members without consent are skipped; disability fields are ignored without sensitive-data consent).
- `server/src/repo/`: one repository interface, `local` (default) and `mysql` drivers.
- `server/src/ai.js`: `/api/ai/explain` and `/api/ai/ask` answer only from dataset fields and return `citedSchemeIds`.
- `server/src/notifications.js`: new matching schemes, deadlines within 30 days, tracked schemes with documents not yet done.
- `server/src/integrations/README.md`: API Setu, myScheme and DigiLocker are documented, **disabled** integration points only.
- Scheme list edits by an admin (`/api/admin/schemes`) are kept across restarts; other schemes follow `schemes.json` on each start.

API reference: `docs/CONTRACT.md`. Additions beyond it: `GET /api/health`, `POST /api/me/device-token`, `?includeNotEligible=1` on `/api/recommendations`; `GET /api/schemes?state=` returns that state's schemes plus central ones.
