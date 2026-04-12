# Project Guidelines

## Code Style
- Use SCSS for styling and keep shared tokens in `src/styles/globals.scss`.
- Prefer nesting and BEM-like naming in component styles.
- Avoid inline styles and hardcoded theme values in React components.

## Architecture
- Frontend lives in `src/` (user journey pages, admin dashboard pages, shared client helpers).
- Backend lives in `server/` with route -> controller -> model/service separation.
- Keep seat reservation and hold behavior centralized in `server/services/seatHoldService.js`.
- Keep pricing logic centralized in `server/utils/checkoutPricing.js`.

## Build and Test
- `npm install`
- `npm start` (frontend dev server)
- `npm run server` (backend server)
- `npm run server:dev` (backend watch mode)
- `npm run server:seed-flights` (seed demo flight data)
- `npm run server:test-auth` (quick auth smoke script)
- `npm test` (frontend tests)
- `npm run build` (production bundle)

## Conventions
- Follow backend-first delivery: stabilize API and booking logic before UI polish.
- Prioritize seat-lock correctness; do not introduce behavior that can allow double booking.
- Use `buildApiUrl` from `src/shared/api.js` for frontend API calls so runtime/env resolution stays consistent.
- Keep SQL parameterized and continue trimming/lowercasing user emails where applicable.

## Environment and Pitfalls
- Backend startup expects database env vars and `JWT_SECRET`; startup fails fast on invalid config.
- Payments are currently configured via Dodo Payments env vars used in `server/controllers/paymentController.js`.
- Admin session falls back to demo credentials unless `ADMIN_DASHBOARD_USERNAME` and `ADMIN_DASHBOARD_PASSWORD` are set.
- Production/static deployments should set API origin via `public/runtime-config.js` (or `build/runtime-config.js`).

## Project Docs
- Product and scope: `docs/masterplan.md`
- Build sequence and delivery priorities: `docs/implementation-plan.md`
- Route map and role permissions: `docs/app-flow-pages-and-roles.md`
- UI/brand system guidance: `docs/design-guidelines.md`
- Additional team notes: `docs/AGENTS.md`
