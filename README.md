# cronjob

Cloud cron management for solo developers and small SaaS teams.

## Features

- Recurring jobs with cron expressions
- Queue-backed execution with BullMQ
- PostgreSQL-backed job definitions and execution logs
- Failure notifications via email and webhook
- Dashboard views for jobs and logs
- Stripe Payment Link paywall with cookie-based access

## Environment

Copy `.env.example` to `.env` and configure:

- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL`
- `REDIS_URL`

## Run locally

```bash
npm install
npm run dev
```

Run a worker in a second terminal:

```bash
npm run worker
```

## Routes

- `/` landing page
- `/paywall` payment claim page
- `/dashboard` protected app
- `/api/health` health check
- `/api/jobs` CRUD jobs API
- `/api/jobs/:id/run` manual trigger
- `/api/webhooks/execute` external trigger endpoint
- `/api/stripe/webhook` Stripe webhook receiver
