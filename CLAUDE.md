# post-grad-finance — conventions

Static personal-finance web app: a post-graduation **Action Plan** plus a lightweight
**Tracker**. Vanilla HTML/CSS/JS, `localStorage`, PWA, deployed to GitHub Pages.

## Architecture

- No build step, no framework, no dependencies. Plain `<script>` tags loaded in
  dependency order in `index.html`.
- Small focused JS modules in `js/`. Load order:
  `utils → storage → plan-data → sample → ui-plan → ui-tracker → ui-overview → app`.
- `app.js` owns init, tab switching, theme, the login gate, and event delegation.
- Each tab has one `ui-*.js` module exposing a `render<Tab>Tab()` function.

## Data

- All persistence via `localStorage`, keys prefixed `pgf_`.
- `pgf_plan` stores only the user's per-step overlay `{status, note, updatedAt}`.
  The 14 steps' canonical content lives in `js/plan-data.js` as `PLAN_STEPS` — so
  step wording can change with no data migration.
- `pgf_accounts`, `pgf_goals`, `pgf_bills` are arrays; `pgf_settings` is an object.
- IDs via `crypto.randomUUID()`. Money via `roundMoney()`. Dates ISO `YYYY-MM-DD`.
- All storage access goes through `storage.js` and is wrapped in try/catch.

## Security & privacy

- Public repo: **never commit real financial data**. Ship sample data only.
- Escape every user-supplied string with `escapeHTML()` before inserting into HTML.
- CSP `default-src 'self'` — no external requests, scripts, or frames.

## Conventions

- All asset paths are **relative** (`./...`) so they work under the
  `/post-grad-finance/` GitHub Pages subpath. Never root-absolute (`/...`).
- After changing any app-shell file, bump `CACHE_NAME` in `sw.js`.
- Accessibility: ARIA tabs, visible focus rings, 44px targets, `prefers-reduced-motion`,
  never rely on color alone.
- Commit after each meaningful unit of work.

## Design

"The First Chapter" — warm editorial almanac. Cream paper, terracotta accent, sage
for growth. `Fraunces` for headings, `Inter` for body/numbers. See `css/styles.css`
token block.
