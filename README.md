# ThinkViva

ThinkViva is an online tutoring platform that connects Nigerian diaspora families (UK, Canada, US, Australia, UAE, and more) with vetted Nigerian tutors for 1-on-1 online tutoring, from Kindergarten through Grade 9 (JS3).

The application is a monolithic Express server that serves a static marketing site plus a REST API, backed by MongoDB. It is deployed to Vercel as a serverless function.

## Features

- **Marketing site** — landing page, about, pricing, FAQ, terms, privacy, and blog posts (static HTML in `public/`).
- **Parent booking / lead capture** — booking form posts to `POST /api/leads` and stores leads in MongoDB (with optional confirmation emails).
- **Tutor application** — a multi-step form at `/apply` posts to `POST /api/tutors`, with optional CV upload.
- **Admin dashboard** — token-gated dashboard at `/admin` for managing leads, tutors, sessions, email logs, and feedback, plus optional AI-powered CV screening.
- **Curriculum API** — serves the Nigerian curriculum data from `data/curriculum.json` at `/api/curriculum`.

## Tech stack

- **Runtime:** Node.js
- **Backend:** Express 4
- **Database:** MongoDB via Mongoose 8
- **Frontend:** static HTML, CSS, and vanilla JavaScript
- **Email:** Nodemailer (SMTP)
- **AI:** Groq SDK (CV screening)
- **Hosting:** Vercel (`@vercel/node`)

## Getting started

### Prerequisites

- Node.js 18+ (developed against Node 22)
- A MongoDB instance (local `mongod` or MongoDB Atlas)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file from the template and fill in real values
cp .env.example .env

# 3. Start the development server (hot reload via node --watch)
npm run dev
```

The app runs at `http://localhost:3000`.

To run without hot reload (production-style):

```bash
npm start
```

### Key routes

| Route | Description |
| --- | --- |
| `/` | Landing page + booking form |
| `/apply` | Tutor application |
| `/admin` | Admin dashboard (requires `ADMIN_TOKEN`) |
| `/api/curriculum` | Curriculum JSON API |

## Environment variables

See [`.env.example`](./.env.example) for the full list with placeholders. Highlights:

- `MONGODB_URI` **(required)** — MongoDB connection string. In local/dev mode the server exits if it cannot connect.
- `ADMIN_TOKEN` **(required)** — gates all `/api/admin/*` routes and the `/admin` dashboard. There is no default; if it is unset, admin requests return `500`.
- `PORT` — server port (defaults to `3000`).
- Email (`SMTP_*`, `FROM_EMAIL`, `ADMIN_EMAIL`, `BOOKINGS_EMAIL`), `GROQ_API_KEY`, `RESEND_API_KEY`, and `GOOGLE_REVIEW_URL` are optional; related features are skipped gracefully when unset.

## Security

- **Never commit `.env`.** It is listed in `.gitignore`; use `.env.example` as the template for the values you need.
- If real credentials were ever committed to this repository's history (for example a MongoDB Atlas URI or an `ADMIN_TOKEN`), **rotate them immediately** — rotate the MongoDB Atlas database password and set a new strong `ADMIN_TOKEN`. Git history retains previously committed secrets even after they are removed from the working tree.
- Use a strong, unique `ADMIN_TOKEN` in every environment.

## Deployment

The project deploys to Vercel using `vercel.json` (`@vercel/node`). On Vercel the `VERCEL` environment variable switches the database connection to a lazy, per-request model; do not set it for local development.
