# No Conviction, No Coin

(codename in this repo: `conviction/`)

A crypto news site built around one restriction: at signup you pick exactly one coin (Bitcoin or an established, non-meme altcoin) and exactly one stance (bullish-leaning or bearish/risk-leaning coverage). Neither can be changed afterward. From then on, your dashboard only shows real news matching that coin and that direction — nothing else, no site-authored analysis or predictions.

Independent from CoinLife (`../web`, `../program`) — its own app, own database, own accounts.

## Why

Crypto information is noisy by design, and it's easy to have your own carefully-made decision worn down by whatever opinion you see next. This app doesn't try to give you "balanced" information — it deliberately narrows what you see to protect your own judgment from being swayed by outside noise after you've already decided. See `/about` (in the running app) for the exact, fully mechanical rules used to pick and label articles.

## Stack

- Next.js (App Router) + Prisma + Postgres
- Email-only auth (magic link via [Resend](https://resend.com)), no passwords — a lightweight session cookie, not NextAuth
- News: public RSS feeds from established English-language crypto outlets (see `lib/feeds.ts`)
- Market data: CoinGecko public API, no key required
- Optional Japanese display: machine-translates the same English sources on the fly via DeepL (`DEEPL_API_KEY`) — no separate Japanese sources
- Email digest: `/api/cron/notify`, runs once a day via Vercel Cron (`vercel.json`) — Vercel's free Hobby plan only allows daily cron schedules; a more frequent one requires the paid Pro plan

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma migrate dev
npm run dev
```

Without a real Postgres, run one locally (`docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16` or a native install) and point `DATABASE_URL` at it. Without `RESEND_API_KEY` set, magic-link emails are logged to the console instead of sent — enough to develop and test the full signup/login flow locally.

## Deploying on free tiers only

This app is designed to run at $0/month up to a few hundred users. What you need, all free:

1. **Vercel** — import this repo, set the project root to `conviction/`. Hobby plan is fine.
2. **Postgres** — [Neon](https://neon.tech) (or Supabase, or Vercel's own Postgres add-on) free tier. Copy the connection string into `DATABASE_URL` in the Vercel project's env vars.
3. **Resend** — free tier (3,000 emails/month). Set `RESEND_API_KEY`. Important: until you verify your own sending domain (also free, just a few DNS records), the default `onboarding@resend.dev` sender can only deliver to the email address on your Resend account — real users won't receive mail until a domain is verified.
4. **`CRON_SECRET`** — generate any random string (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) and set it as an env var; Vercel Cron sends it automatically as a Bearer token.
5. `DEEPL_API_KEY` is optional — leave it unset to launch English-only; the Japanese toggle degrades gracefully to English without it.

Migrations apply themselves — `npm run build` runs `prisma migrate deploy` before `next build`, so every Vercel deploy brings the production schema up to date automatically. Nothing to run by hand.

No paid plan is required until either the daily cron isn't frequent enough (Vercel Pro, $20/mo) or usage outgrows the free Postgres/Resend tiers.

## The commitment device, honestly

The lock only holds as long as the account does — there's no password reset, but a Postgres row is still just a Postgres row. This app doesn't claim to be un-hackable self-control; it's a friction device, not a vault. If you find yourself wanting to sign up again with a different address to get around your own choice, that urge is exactly the thing this app is trying to help with.
