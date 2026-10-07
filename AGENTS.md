# AGENTS.md

## Cursor Cloud specific instructions

ThinkViva is a single Node.js/Express app (no monorepo, no Docker, no build step). It serves a static marketing site from `public/` plus a REST API under `/api/*`, backed by MongoDB via Mongoose.

### Running the app (development)
- `npm run dev` starts the server with `node --watch` (hot reload) on `http://localhost:3000`. Standard scripts live in `package.json`.
- Key routes: `/` (landing + booking), `/apply` (tutor application), `/admin` (admin dashboard), `/api/curriculum` (static curriculum JSON).

### Database (important, non-obvious)
- MongoDB is REQUIRED. In local/dev mode the server calls `process.exit(1)` on a failed DB connection, so it will not stay up without a reachable `MONGODB_URI`.
- `MONGODB_URI` comes from the committed `.env` and points at a shared MongoDB Atlas cluster (this is the real/production data store). Treat writes as affecting live data — use clearly-marked test values and clean up test records afterward. There is no lead-delete API endpoint; clean up via a one-off mongoose script using the same `MONGODB_URI`.
- The `VERCEL` env var switches DB connection to lazy per-request (production/serverless mode). Do NOT set it for local dev.

### Admin access
- Admin API/dashboard is gated by the `x-admin-token` header or `?token=` query param, compared against `ADMIN_TOKEN` (from `.env`, currently `change-this-before-going-live`; falls back to `admin123` if unset).

### Lint / test / build
- There is no lint config, no automated test suite, and no local build step. Verify changes by running the app and exercising the relevant flow (e.g. the booking form → `POST /api/leads`).
- `node test-email.js` is a manual SMTP smoke test and requires SMTP env vars.

### Optional integrations (skipped gracefully if unset)
- Email (Nodemailer/SMTP): needs `SMTP_USER`/`SMTP_PASS` (+ optional `SMTP_HOST`, `SMTP_PORT`, `FROM_EMAIL`).
- Admin CV screening (`POST /api/admin/screen-cv`): needs `GROQ_API_KEY`.
