# post-grad-finance

A guided **Financial Reset** for life after school — and a private little tracker
to keep your accounts in check.

You just finished school. Maybe you're starting a job, maybe on OPT, maybe figuring
out taxes, a 401(k), credit, and an emergency fund all at once. This app does two
things:

1. **Action Plan** — a step-by-step checklist that *tells you what to do*, in three
   phases: your first 30 days, your first 90 days, and ongoing habits. 14 concrete
   steps, each with why it matters and what to actually do.
2. **Tracker** — a lightweight place to record accounts, net worth, savings goals,
   and bills, with an Overview that surfaces your next moves.

## Privacy — read this

This is a **static site with no server**. Everything you type stays in your own
browser (`localStorage`); nothing is ever uploaded or sent anywhere.

The public repository ships with **sample/placeholder data only**. Your real
numbers live only on your device. Do not commit your real data — exported backup
files are git-ignored.

> This app is educational, not financial, tax, or immigration advice. Verify
> specifics with your HR department, a qualified tax professional, your school's
> DSO, and official sources (USCIS, IRS, SSNIT, GetFund).

## Run it locally

It must be served over HTTP (the service worker and module loading do not work
from `file://`):

```sh
# from the project folder
python -m http.server 8000
# then open http://localhost:8000
```

or `npx serve`.

## Deploy

Hosted on GitHub Pages from the `main` branch (root). Push to `main` and the live
site updates. After changing any app file, bump `CACHE_NAME` in `sw.js` so visitors
get the new version.

## Tech

Vanilla HTML / CSS / JavaScript. No build step, no dependencies, no tracking.
Installable as a PWA and works offline.
