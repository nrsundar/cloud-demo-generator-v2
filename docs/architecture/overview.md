# Architecture Overview

## What DemoForge is

DemoForge is a GenAI orchestration tool. The model is not an assistant bolted onto a CRUD backend — it is the backend's main control flow. A field SA describes a customer's needs in plain English; DemoForge produces a deployable demo package (CloudFormation, application code, schema, learning modules, cost estimate, documentation).

The application is small in surface area but high in stakes: outputs are deployed by SAs into customer-adjacent environments, used in customer-facing sessions, and authored by an LLM. Reliability, safety, observability, tenancy, and iteration safety are not optional features — they are the architecture.

## Stack today

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + wouter + @tanstack/react-query |
| Frontend hosting | AWS Amplify (`d1s77hhl4y34ji`, `main` branch) |
| Auth | Amazon Cognito (`us-east-2_sndKJLxLR`), JWT validated server-side via `aws-jwt-verify` |
| Backend runtime | Express + TypeScript, bundled with esbuild |
| Backend hosting | ECS Fargate (`demo-gen-cluster` / `demo-gen-service`) behind CloudFront |
| Database | PostgreSQL (Neon), accessed via Drizzle ORM |
| AI | AWS Bedrock — `us.anthropic.claude-opus-4-6-v1` |
| CDN / API edge | CloudFront (`d2g4zib7n3kevf.cloudfront.net`) — `/api/*` to ECS, `/*` to Amplify |
| Container registry | ECR `cloud-demo-generator-v3` |

The constraint set in [`../../CONSTRAINTS.md`](../../CONSTRAINTS.md) pins each of these. Changes to the stack require explicit deviation from a constraint.

## Code organization (today)

```
client/
  src/
    main.tsx, App.tsx                  # entry + router
    components/
      AppLayout.tsx                    # custom shell (sidebar + topbar)
      genui/types.ts                   # GenNode union (17 types)
    pages/                             # one file per route
    services/agent.ts                  # sendAgentTurn, pollRequestStatus, submitDemoRequest
    hooks/useAuth.tsx                  # Cognito context
    lib/{auth,config,queryClient}.ts
    styles/shell.css                   # design tokens + every component class
server/
  index.ts                             # dev entry (with Vite middleware)
  production.ts                        # production entry
  routes.ts, agentRoutes.ts            # all HTTP handlers
  agent.ts                             # Bedrock calls (clarifying questions, spec gen)
  templateGenerator.ts                 # demo package assembly
  bugFixAgent.ts                       # self-healing scan
  auth.ts                              # JWT verification middleware
  db.ts                                # Drizzle + Neon
  migrate.ts                           # auto-create tables on boot
shared/schema.ts                       # Drizzle schema
```

## How a generation runs today

```
SA opens /generator
   │
   ▼
Generator page (client/src/pages/generator.tsx)
   │
   │  POST /api/generator/agent
   │  body: { messages, specSnapshot }
   ▼
server/agentRoutes.ts:338  app.post("/api/generator/agent", ...)
   │
   │  one Bedrock InvokeModelCommand against
   │  us.anthropic.claude-opus-4-6-v1
   │  with a JSON-only system prompt (lines 342-347)
   ▼
Bedrock Opus 4.6
   │
   │  returns single JSON envelope:
   │  { message, components[], specSnapshot, phase }
   ▼
Frontend renders components via the GenNode union
```

When `phase === "generating"`, the frontend additionally calls `submitDemoRequest()` which inserts into `demo_requests` and triggers `generateClarifyingQuestions(...)` for the back-of-house pipeline.

## Limits of today's architecture

The current shape works but has several properties that are unacceptable for a production tool used by the field:

1. **The model's output is the contract.** A monolithic prompt asks the model to produce valid GenNode JSON. There is one retry path (the catch in `agentRoutes.ts:355`), no schema validation, and no structured tool use. Bad emissions break the renderer in front of customers.
2. **There is no agent loop.** Each call is a one-shot Bedrock invocation. The "agent" cannot decide to fetch additional context, call a deterministic generator, or refine its plan — it has to do everything in a single completion.
3. **Generation is synchronous and blocking.** A 30–60 second HTTP request keeps the SA staring at a spinner. A reconnect or laptop close restarts work.
4. **There is no per-turn observability.** When the field reports "the demo it generated was wrong," there is no trace of which model call produced what or which inputs led there.
5. **There is no tenancy enforcement inside generation.** ACLs are at the HTTP layer (`requireAuth`); the generation logic itself does not know who the principal is.
6. **There is no eval gate.** Prompt or model changes ship and the field is the test set.
7. **There is no safety scanning of outputs.** CFN, code, and modules are emitted by the model and rendered without `cfn-lint`, `cfn-nag`, secret scanning, or service-existence checks.
8. **There is no caching of expensive operations.** Bedrock prompt caching is off; tool result caches do not exist.

## Target architecture

The target is the same stack — same languages, same frameworks, same hosting — re-shaped around six principles:

1. **The agent loop is a first-class service.** Stateless HTTP in front; a stateful loop core that loads context, calls the model with tool defs, executes tools, loops, emits the final envelope, and persists every step.
2. **Tools are the integration layer.** The model orchestrates a typed tool catalog (CFN generation, schema generation, cost estimation, retrieval, lookups). Tool I/O is validated at the boundary. Tools enforce ACL.
3. **Streaming is the default UX.** SSE from server to client; resumable across reconnects; final event carries the complete envelope so non-streaming clients keep working.
4. **Safety is middleware.** Every CFN passes `cfn-lint` + `cfn-nag` + `cloudformation:ValidateTemplate`. Every code emission passes secret scanning. Failures surface as `ErrorCard`, not silent suppression.
5. **Async generation with resume.** Long jobs run in a Postgres-backed queue; SAs can close their laptops and resume from My Requests.
6. **Eval-driven iteration.** A JSONL fixture set is the gate for prompt and tool changes. Drift is detected, not discovered.

The plan to get there is in [`plan.md`](plan.md). Detailed designs live in `phase-1/`, `phase-2/`, `phase-3/`.

## Reading order

1. [`plan.md`](plan.md) — sequencing across phases.
2. [`phase-1/P1.1-agent-loop.md`](phase-1/P1.1-agent-loop.md) — start of the structural change.
3. [`phase-1/P1.2-tool-catalog.md`](phase-1/P1.2-tool-catalog.md) — the spine.
4. The remaining Phase 1 docs in order: P1.3 streaming, P1.4 structured generation, P1.5 safety, P1.6 tenancy.
5. Phase 2 docs.
6. Phase 3 docs.
