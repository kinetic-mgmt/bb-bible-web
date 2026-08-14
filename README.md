# Sarah's BB Bible — Web

A web companion for Sarah's BB Bible, on the same Supabase backend as the mobile
app (one account, one source of truth). React + Vite, auto-deployed to GitHub
Pages via Actions, served at **app.sarahtalks.tv**.

## What it does (v1)
- Log in with the same account as the app
- Browse shows, cast/rosters, published recaps, and active polls/predictions
- Sarah's Talkers rank

Live video and mobile in-app purchases are intentionally left out. Web purchases
run through **Square** (separate from Apple/Google IAP), which grants access into
the same Supabase account.

## Deploy
Push to `main` → GitHub Actions builds and deploys to Pages. `public/CNAME`
points it at `app.sarahtalks.tv`.

## Local
```
npm install
npm run dev
```
