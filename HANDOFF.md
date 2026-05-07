# DemoForge — Handoff to Local Claude

## Quick Start

```bash
cd /workspace/cloud-demo-generator-v2
npm install
npm run dev  # starts on port 5000
```

Frontend: `http://localhost:5000`
Production: `https://main.d1s77hhl4y34ji.amplifyapp.com`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)                    │
│  Deployed: AWS Amplify (d1s77hhl4y34ji)                 │
│  Auth: Amazon Cognito (us-east-2_sndKJLxLR)             │
├─────────────────────────────────────────────────────────┤
│  Backend (Express + TypeScript + esbuild)                │
│  Deployed: ECS Fargate (demo-gen-cluster/demo-gen-service)│
│  Image: 633384844157.dkr.ecr.us-east-2.amazonaws.com/   │
│         cloud-demo-generator-v3:latest                   │
│  Database: PostgreSQL (Neon)                             │
│  AI: AWS Bedrock (us.anthropic.claude-opus-4-6-v1)      │
├─────────────────────────────────────────────────────────┤
│  CDN: CloudFront (d2g4zib7n3kevf.cloudfront.net)        │
│  → Routes /api/* to ECS, /* to Amplify                  │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
cloud-demo-generator-v2/
├── client/src/
│   ├── main.tsx              # Entry point (imports styles/shell.css)
│   ├── App.tsx               # Router with all routes
│   ├── styles/shell.css      # ALL CSS — design tokens, shell, components
│   ├── components/
│   │   ├── AppLayout.tsx     # Custom sidebar + topbar (wraps all pages)
│   │   └── genui/types.ts    # GenNode union type (18 component types)
│   ├── pages/
│   │   ├── landing.tsx       # / — redirects signed-in users to /home
│   │   ├── home.tsx          # /home — Dashboard + AI Demo Catalog
│   │   ├── generator.tsx     # /generator — GenUI conversational canvas
│   │   ├── my-requests.tsx   # /my-requests — User's request history
│   │   ├── admin.tsx         # /admin — 5-tab admin dashboard
│   │   ├── guide.tsx         # /guide — User guide + FAQ
│   │   ├── auth.tsx          # /auth — Sign-in (bypasses shell)
│   │   ├── presentation.tsx  # /presentation — Fullscreen deck
│   │   ├── demo-request.tsx  # /demo-request — redirects to /generator
│   │   └── not-found.tsx     # 404
│   ├── services/agent.ts     # sendAgentTurn, pollRequestStatus, submitDemoRequest
│   ├── hooks/useAuth.tsx     # Cognito auth context
│   ├── lib/
│   │   ├── auth.ts           # Cognito SDK calls
│   │   ├── config.ts         # API_BASE from env
│   │   └── queryClient.ts    # React Query + auth headers
│   └── ...
├── server/
│   ├── production.ts         # Entry: Express app
│   ├── agentRoutes.ts        # All API routes (demo-requests, admin, agent, generator)
│   ├── agent.ts              # Bedrock calls (clarifying questions, spec generation)
│   ├── templateGenerator.ts  # Full demo package generation (CloudFormation, code, modules)
│   ├── bugFixAgent.ts        # Self-healing bug detection + fix proposals
│   ├── auth.ts               # Cognito JWT verification middleware
│   ├── db.ts                 # Drizzle ORM + Neon connection
│   └── ...
├── shared/schema.ts          # Drizzle schema (demoRequests, repositories, agentActions, etc.)
├── design-reference/         # Original HTML mockups from Claude Design
├── Dockerfile                # Multi-stage: builder → node:18-alpine
├── package.json              # v3.3.0
└── vite.config.ts
```

---

## Design System

**Zero Cloudscape.** The entire UI uses a custom design system defined in `client/src/styles/shell.css`. The design was exported from Claude Design (see `design-reference/` for the original HTML files).

### Key Design Tokens
```css
--bg: #f4f6fb          /* app background */
--panel: #ffffff       /* card surfaces */
--border: #e5e9f0     /* borders */
--text: #0f172a       /* primary text */
--text-muted: #5b6678 /* secondary text */
--primary: #2563eb    /* blue */
--accent-from: #3b82f6 → --accent-to: #7c3aed  /* gradient */
```

### App Shell
- **Sidebar** (260px, dark gradient): DF brand, nav groups, active state with left accent bar
- **Topbar** (64px, white): breadcrumbs, search pill, avatar
- Auth page bypasses the shell entirely

### CSS Classes (most used)
- `.btn .btn-primary` / `.btn-outline` / `.btn-ghost` / `.btn-danger` / `.btn-success`
- `.badge-status.{ready|pending|failed|draft|review|building}`
- `.ext-chip.{b|g|p|o|c|r}` — gradient extension badges
- `.table-card` + `.tbl` — styled tables
- `.tiles` + `.tile` — summary stat tiles
- `.modal-backdrop` + `.modal` — modals
- `.info-banner` — blue info callout
- `.page-head` — page title + action button

---

## Key API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/generator/agent | User | GenUI agent (Bedrock Claude) |
| GET | /api/repositories | User | List catalog repos |
| GET | /api/repositories/:id/zip | User | Download ZIP |
| POST | /api/demo-requests | User | Submit request (skipDedup:true from Generator) |
| GET | /api/demo-requests | User | User's own requests |
| GET | /api/demo-requests/:id | User | Single request status |
| POST | /api/demo-requests/:id/answers | User | Submit clarifying answers |
| GET | /api/admin/demo-requests | Admin | All requests |
| POST | /api/admin/demo-requests/:id/approve | Admin | Approve spec |
| POST | /api/admin/demo-requests/:id/reject | Admin | Reject with notes |
| POST | /api/admin/demo-requests/:id/regenerate | Admin | Re-run generation |
| POST | /api/admin/bulk-approve | Admin | Bulk approve |
| GET | /api/admin/agent-actions | Admin | All agent actions |
| POST | /api/admin/agent-actions/:id/approve | Admin | Approve proposed fix |
| POST | /api/admin/run-bug-fix-agent | Admin | Trigger bug scan |
| GET | /api/feedback | Admin | All feedback |
| GET | /api/analytics/stats | Admin | Dashboard stats |

---

## Generator Agent Contract

`POST /api/generator/agent` expects:
```json
{
  "messages": [{"role": "user", "content": "..."}],
  "specSnapshot": null | SpecSnapshot
}
```

Returns:
```json
{
  "message": "markdown text",
  "components": [GenNode[]],
  "specSnapshot": { "database": "", "extensions": [], "useCase": "", "industry": "", "audience": "", "durationMin": null, "estCostHourly": "" },
  "phase": "gathering" | "generating" | "complete" | "error"
}
```

When `phase === "generating"`, the frontend calls `submitDemoRequest()` which creates a request and triggers the full generation pipeline.

---

## Deployment

### Frontend (Amplify)
```bash
VITE_API_URL="https://d2g4zib7n3kevf.cloudfront.net" \
VITE_COGNITO_USER_POOL_ID="us-east-2_sndKJLxLR" \
VITE_COGNITO_CLIENT_ID="4bm8gt0i2of69v9g0vm5nnh2k0" \
npx vite build

cd dist/public && zip -r /tmp/frontend.zip .
# Then use Amplify createDeployment API
```

### Backend (ECS)
```bash
docker build --no-cache -t cloud-demo-generator-v3 .
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 633384844157.dkr.ecr.us-east-2.amazonaws.com
docker tag cloud-demo-generator-v3:latest 633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
docker push 633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
aws ecs update-service --cluster demo-gen-cluster --service demo-gen-service --force-new-deployment --region us-east-2
```

**Important:** Bump `package.json` version before each push to ensure a new Docker image digest. Same content = same digest = ECS won't pull.

---

## Accounts & Credentials

| Resource | Value |
|----------|-------|
| AWS Account | 633384844157 |
| Region | us-east-2 |
| Cognito Pool | us-east-2_sndKJLxLR |
| Cognito Client | 4bm8gt0i2of69v9g0vm5nnh2k0 |
| Amplify App | d1s77hhl4y34ji |
| ECS Cluster | demo-gen-cluster |
| ECS Service | demo-gen-service |
| ECR Repo | cloud-demo-generator-v3 |
| CloudFront | d2g4zib7n3kevf.cloudfront.net |
| Bedrock Model | us.anthropic.claude-opus-4-6-v1 |

### Test Users
- `rsundar19@gmail.com` / `DemoForge2026!` — admin
- `demo@example.com` / `DemoUser2026!` — regular user

---

## Rollback

```bash
git reset --hard snapshot-pre-redesign-20260507-161154
# This restores the Cloudscape version (fully working, just old design)
```

---

## Known Issues / TODO

1. **Generator agent route needs the backend deployed** — if you reset to the snapshot, the backend won't have `/api/generator/agent`. Re-add it from `agentRoutes.ts`.

2. **QuestionSingleSelect from agent** — the agent sometimes returns options as strings instead of `{label, value}` objects. The renderer handles both but could be more robust.

3. **Presentation page** — still uses its own inline styles (fullscreen slideshow). Not converted to the new design system since it's intentionally standalone.

4. **Mobile responsive** — sidebar hides below 720px, but some tables may still overflow. The design-reference HTML files have full responsive CSS if you need to refine.

5. **Self-healing (Bug Tracker)** — the "Apply Fix" button calls `approveAction.mutate(id)` which marks the action as approved. The actual fix application (code changes, redeploy) is handled by the bug fix agent on the backend. The downtime warning is a `window.confirm()` — could be upgraded to a proper modal.

6. **Generator session persistence** — uses `sessionStorage` (cleared on tab close). Could be upgraded to `localStorage` or server-side if needed.

---

## Design Reference Files

The `design-reference/` directory contains the original Claude Design export:
- `_shell.css` — shared tokens and shell styles
- `index.html` — Landing page
- `home.html` — Dashboard
- `generator.html` — Generator (the hero page)
- `my-requests.html` — My Requests
- `admin.html` — Admin Dashboard
- `presentation.html` — Presentation mode
- `HANDOFF.md` — Original handoff notes from Claude Design
- `README.md` — Design overview

Use these as the source of truth for any visual refinements.
