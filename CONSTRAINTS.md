# DemoForge — Constraints & Restrictions

All contributors (human and AI) must maintain these invariants.

---

## Design System

1. **Zero Cloudscape** — No `@cloudscape-design/*` imports anywhere. Entire UI uses the custom design system in `styles/shell.css`.
2. **Zero new colors/fonts/radii/shadows** — Only use tokens defined in `:root` of `shell.css`. No ad-hoc hex values.
3. **Fonts:** Inter (UI) + JetBrains Mono (code/badges/keys) only.
4. **Design reference is source of truth** — `design-reference/*.html` files define the visual spec. Any UI change must match these patterns.

## Architecture

5. **No new dependencies without justification** — The bundle went from 1.1MB → 344KB by removing Cloudscape. Don't bloat it back.
6. **No framework changes** — React + TypeScript + Vite + wouter + @tanstack/react-query. No Next.js, no Remix, no additional routers.
7. **Backend stays Express + esbuild** — No migration to other frameworks.
8. **Database: Drizzle ORM + Neon PostgreSQL** — Schema in `shared/schema.ts`. No raw SQL outside Drizzle.
9. **AI: AWS Bedrock only** — Model: `us.anthropic.claude-opus-4-6-v1`. No OpenAI, no direct Anthropic API.

## Deployment

10. **Bump `package.json` version before every backend deploy** — Same content = same Docker digest = ECS won't pull.
11. **Frontend env vars baked at build time** — `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID` must be set during `vite build`.
12. **Never push directly to production without build verification** — Always `npm run build` first.
13. **ECR repo:** `cloud-demo-generator-v3` — Don't create new repos.
14. **Amplify app:** `d1s77hhl4y34ji`, branch `main` — Don't create new apps.

## Security

15. **Auth required on all API routes** — `requireAuth` middleware on every endpoint except `/api/health`.
16. **Admin routes require `isAdmin` check** — Verified via Cognito group membership.
17. **No secrets in frontend code** — API keys, DB connection strings stay server-side only.
18. **Cognito JWT verification** — Backend validates tokens against the user pool. No custom auth.
19. **CORS: CloudFront handles it** — Don't add CORS headers manually.

## Functional

20. **Generator agent must return structured JSON** — Schema: `{message, components[], specSnapshot, phase}`. No freeform text responses.
21. **GenNode types are fixed** — 18 types defined in `components/genui/types.ts`. Don't add new types without updating the renderer in `generator.tsx`.
22. **skipDedup: true from Generator** — When the Generator submits a request, it bypasses the catalog dedup check. Form-based submissions still check.
23. **Session persistence via sessionStorage** — Generator conversation survives page navigation but clears on tab close. Don't upgrade to localStorage without explicit decision.
24. **Self-healing (Bug Tracker)** — Fixes require admin approval. Downtime fixes require explicit confirmation dialog. Never auto-apply.
25. **Dedup logic preserved** — `POST /api/demo-requests` checks catalog for existing matches (unless `skipDedup: true`).

## Content / UX

26. **Sidebar nav order is fixed** — Workspace (Welcome, Dashboard, Generator, My Requests) → Resources (User Guide, Presentation) → Management (Admin Dashboard).
27. **Auth page bypasses the shell** — No sidebar/topbar on `/auth`.
28. **Landing page redirects signed-in users** — `/` → `/home` if authenticated.
29. **`/demo-request` redirects to `/generator`** — Single entry point for new demos.
30. **My Requests shows database column + info banner** — Always explain the flow at the top.

## Git / Rollback

31. **Snapshot tag exists:** `snapshot-pre-redesign-20260507-161154` — Reverts to the last Cloudscape version (fully working).
32. **Push to GitLab (`origin`)** — Source of truth. GitHub is secondary.
33. **Don't force-push main** — Append only.
