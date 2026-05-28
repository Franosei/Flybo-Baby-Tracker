# Flybo Baby Tracker

Flybo Baby Tracker is a mobile-first React app for quickly logging baby care events: feeds, wee, and poop. It is designed around large tap targets, automatic timestamps, daily summaries, and seven-day trend charts.

## What is included

- Baby profile setup with optional name and date of birth
- Baby ID sharing so two parents can open and update the same records
- Date of birth based age display, shown as weeks, months/weeks, or years/months
- One-tap Feed, Wee, and Poop logging
- Feed modal for breastfeeding duration, expressed milk volume, or formula volume
- ml/oz switching with stored unit preference
- Daily summary cards for intake, breastfeeding minutes, wee, poop, feed sessions, and total entries
- Age-based care check comparing today with feeding, wee, and poop guidance
- Seven-day charts for bottle intake, breastfeeding, and nappies
- Recent activity history with delete controls
- Neon/Postgres API with local browser storage fallback
- Neon-ready Postgres schema in `database/schema.sql`

## Environment

Create `.env` from `.env.example` and set:

```bash
DATABASE_URL=postgresql://...
PORT=4174
```

## Run locally

```bash
npm install
npm run db:push
npm run dev:api
npm run dev
```

The Vite dev server is configured for `http://127.0.0.1:4173` and proxies API calls to `http://127.0.0.1:4174`.

When a parent saves a new baby profile, the API creates a 6-digit Baby ID. A second parent can enter that Baby ID in the profile panel to load the same baby profile, stats, and activity history.

## Build

```bash
npm run build
npm start
```

## Backend path

Railway should set `DATABASE_URL` as an environment variable. The production start command is `npm start`, which serves the built Vite app and the `/api` routes from the same Node process.
