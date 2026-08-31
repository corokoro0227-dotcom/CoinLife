# No Conviction, No Coin

(codename in this repo: `conviction/`)

A crypto news site built around one restriction: at signup you pick exactly one coin (Bitcoin or an established, non-meme altcoin) and exactly one stance (bullish-leaning or bearish/risk-leaning coverage). Neither can be changed afterward. From then on, your dashboard only shows real news matching that coin and that direction — nothing else, no site-authored analysis or predictions.

Independent from CoinLife (`../web`, `../program`) — its own app, own database, own accounts.

## Why

Crypto information is noisy by design, and it's easy to have your own carefully-made decision worn down by whatever opinion you see next. This app doesn't try to give you "balanced" information — it deliberately narrows what you see to protect your own judgment from being swayed by outside noise after you've already decided. See `/about` (in the running app) for the exact, fully mechanical rules used to pick and label articles.

## Stack

- Next.js (App Router) + Prisma + SQLite (swap `DATABASE_URL` for Postgres in production)
- Email-only auth (magic link via [Resend](https://resend.com)), no passwords — a lightweight session cookie, not NextAuth
- News: public RSS feeds from established English-language crypto outlets (see `lib/feeds.ts`)
- Market data: CoinGecko public API, no key required
- Optional Japanese display: machine-translates the same English sources on the fly via DeepL (`DEEPL_API_KEY`) — no separate Japanese sources
- Email digest: `/api/cron/notify`, intended to run every few hours via Vercel Cron (`vercel.json`)

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Without `RESEND_API_KEY` set, magic-link emails are logged to the console instead of sent — enough to develop and test the full signup/login flow locally.

## The commitment device, honestly

The lock only holds as long as the account does — there's no password reset, but a Postgres row is still just a Postgres row. This app doesn't claim to be un-hackable self-control; it's a friction device, not a vault. If you find yourself wanting to sign up again with a different address to get around your own choice, that urge is exactly the thing this app is trying to help with.
