# Flybo Baby Tracker

Flybo Baby Tracker is a mobile-first React app for quickly logging baby care events: feeds, wee, and poop. It is designed around large tap targets, shared Baby IDs, automatic timestamps, daily summaries, age-based care checks, and seven-day trend charts.

## Dashboard Preview

![Flybo Baby Tracker dashboard summary](image/image%201.png)

![Flybo Baby Tracker care check dashboard](image/image%202%20.png)

## What is included

- Baby profile setup with optional name and date of birth
- Baby ID sharing so two parents can open and update the same records
- Local baby switcher for parents tracking multiple children on one device
- Date of birth based age display, shown as weeks, months/weeks, or years/months
- One-tap Feed, Wee, and Poop logging
- Feed modal for breastfeeding duration, expressed milk volume, formula volume, or foods eaten
- ml/oz switching with stored unit preference
- Daily summary cards for intake, breastfeeding minutes, wee, poop, feed sessions, and total entries
- Breastfeeding estimate included in milk totals using 30 minutes as about 60-90 ml
- Age-based care check comparing today with feeding, wee, and poop guidance
- Seven-day charts for bottle intake, breastfeeding, and nappies
- Recent activity history with delete controls
- Neon/Postgres API with local browser storage fallback
- Neon-ready Postgres schema in `database/schema.sql`

## How Sharing Works

When a parent creates a baby profile, the backend creates a 6-digit Baby ID. Another parent can enter that Baby ID to open the same baby profile, view the same stats, and add new feed, wee, or poop records.

Parents tracking more than one child can create another baby profile with the `New baby` button. Any Baby ID opened on the same device is saved locally in the baby switcher for quick switching.

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

Run `npm run dev:api` and `npm run dev` in separate terminal windows during development.

## Build

```bash
npm run build
npm start
```

## Backend path

Railway should set `DATABASE_URL` as an environment variable. The production start command is `npm start`, which serves the built Vite app and the `/api` routes from the same Node process.
