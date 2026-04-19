# Cloud Demo Generator v3

> **Built with Kiro (powered by [Anthropic Claude](https://www.anthropic.com/claude))** — primary authoring via Kiro CLI in AgentSpaces. Full AWS migration from Firebase/Render/Neon to Cognito/ECS Fargate/RDS completed entirely through AI-driven conversation.

---

## Demo Walkthrough

| Step | Screenshot |
|------|------------|
| Landing / feature overview | ![Landing](screenshots/01-landing.png) |
| Authentication (Cognito) | ![Auth](screenshots/02-auth.png) |
| Generator configuration | ![Generator](screenshots/03-generator.png) |
| Custom demo request | ![Demo Request](screenshots/04-demo-request.png) |
| Admin analytics dashboard | ![Admin](screenshots/05-admin.png) |

**Live App:** [http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com](http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com)

**Test credentials:** `demo@example.com` / `DemoUser2026!`

---

## What This Produces

This generator produces customer-ready PostgreSQL demos including:

- **[pgvector-hybrid-search-demo](https://github.com/nrsundar/pgvector-hybrid-search-demo-py-v1.0)** — semantic + lexical hybrid retrieval over AWS Aurora PostgreSQL using pgvector
- **[postgis-property-search-demo](https://github.com/nrsundar/postgis-property-search-demo-py-v2)** — geospatial property search with PostGIS (distance, filtering, ranking)
- **[pgroute-transportation-demo](https://github.com/nrsundar/pgroute-transportation-demo-py-v1.0-2)** — transportation network routing with pgRouting

Each demo is generated end-to-end, including:

- Database schema and extensions
- Seed data and ingestion pipelines
- Application layer (Python, JavaScript, TypeScript, Go)
- Infrastructure (AWS CloudFormation)
- Documentation and setup instructions

This positions the generator as a **meta-tool** that produces production-ready, deployable PostgreSQL solutions — not just sample code.

---

## Overview

The **Cloud Demo Generator v3** is an AI-powered platform that generates complete, deployable PostgreSQL demo repositories for real-world customer use cases.

It is designed for:

- Solutions Architects
- Sales Engineers
- Developers exploring PostgreSQL extensions on AWS

The goal is simple:

> Reduce demo setup time from hours to minutes, while ensuring production-quality outputs.

---

## Architecture Summary

```
                    ┌─────────────────────────────────────────────┐
                    │              AWS Account (sundaar4)          │
                    │              633384844157 / us-east-2        │
                    │                                             │
  Internet ────────►│  ┌─────────┐    ┌──────────────────────┐   │
                    │  │   ALB   │───►│  ECS Fargate (private)│   │
                    │  │ (public)│    │  Node.js 18 + React  │   │
                    │  └─────────┘    └──────────┬───────────┘   │
                    │                            │               │
                    │                 ┌──────────▼───────────┐   │
                    │                 │  RDS PostgreSQL 16.13 │   │
                    │                 │  (private, encrypted) │   │
                    │                 └──────────────────────┘   │
                    │                                             │
                    │  ┌──────────────────────┐                  │
                    │  │  Cognito User Pool   │                  │
                    │  │  (email/password SRP) │                  │
                    │  └──────────────────────┘                  │
                    └─────────────────────────────────────────────┘
```

### AWS Services

| Service | Purpose |
|---------|---------|
| **Amazon Cognito** | User authentication (email/password with SRP) |
| **Amazon ECS Fargate** | Containerized app hosting (256 CPU / 512 MB, no EC2) |
| **Amazon RDS PostgreSQL 16.13** | Database (db.t4g.micro, private subnet, encrypted) |
| **Application Load Balancer** | Internet-facing entry point |
| **Amazon ECR** | Container image registry (scan on push) |
| **Amazon VPC** | 10.0.0.0/16 — 2 public + 2 private subnets, NAT Gateway |
| **AWS CloudFormation** | Infrastructure as Code |
| **Amazon CloudWatch** | Logs (/ecs/demo-gen, 14-day retention) |

---

## Key Features

### Repository Generation Engine

- Generates complete, downloadable demo repositories
- Includes CloudFormation templates for AWS deployment
- Configurable: language, DB type/version, instance type, region, use cases, complexity
- Produces structured learning modules per generated demo
- 3+ production use cases shipped (pgvector, PostGIS, pgRouting)

### Supported Use Cases

- Hybrid Search (pgvector)
- Geospatial Analytics (PostGIS)
- Time-Series Analytics (TimescaleDB)
- Multi-Tenant SaaS (Row-Level Security)
- Analytics Dashboard
- High Availability Setup (Aurora)

### Authentication

- Amazon Cognito (email/password with SRP flow)
- Sign up with email verification
- Session management client-side (JWT tokens)

### Admin Dashboard

- Tracks downloads and usage patterns
- Repository status monitoring
- Feedback collection and management
- Use case popularity analytics

---

## Directory Structure

```
cloud-demo-generator-v3/
├── client/                         # Frontend (React + Cloudscape)
│   ├── index.html
│   └── src/
│       ├── main.tsx                # Entry + Cloudscape global styles
│       ├── App.tsx                 # Router + AuthProvider + QueryClient
│       ├── components/
│       │   └── AppLayout.tsx       # Cloudscape AppLayout + TopNav + SideNav
│       ├── hooks/
│       │   └── useAuth.tsx         # Cognito auth context + hook
│       ├── lib/
│       │   ├── auth.ts             # Cognito client (signIn, signUp, confirm)
│       │   └── queryClient.ts      # TanStack Query config
│       └── pages/
│           ├── landing.tsx         # Features + use cases cards
│           ├── auth.tsx            # Sign in / Sign up / Verify email
│           ├── home.tsx            # Generator form + repos table
│           ├── demo-request.tsx    # Custom demo request form
│           ├── admin.tsx           # Analytics dashboard
│           └── not-found.tsx       # 404 page
├── server/                         # Backend (Express)
│   ├── index.ts                    # Dev server (with Vite HMR)
│   ├── production.ts              # Production server (static files)
│   ├── routes.ts                   # API routes (repos, feedback, analytics)
│   ├── storage.ts                  # DB queries (Drizzle ORM) + ZIP generation
│   ├── db.ts                       # PostgreSQL connection (pg + Drizzle)
│   └── vite.ts                     # Vite dev middleware
├── shared/
│   └── schema.ts                   # Drizzle schema (repos, users, logs, feedback)
├── screenshots/                    # UI screenshots for documentation
├── cloudformation.yaml             # Full infrastructure stack
├── Dockerfile                      # Multi-stage build for ECS
├── DEPLOY.md                       # Deployment guide with resource IDs
├── LICENSE                         # Amazon internal use only
└── package.json
```

---

## Technology Stack

### Frontend

- React 18 + TypeScript
- [Cloudscape Design System](https://cloudscape.design) (AWS Console UI)
- TanStack Query (data fetching)
- Wouter (routing)
- amazon-cognito-identity-js (auth)

### Backend

- Node.js 18 + Express.js (TypeScript)
- Drizzle ORM + PostgreSQL
- Archiver (ZIP generation)
- Zod (input validation)

### Infrastructure

- AWS ECS Fargate (compute)
- Amazon RDS PostgreSQL 16.13 (database)
- Amazon Cognito (authentication)
- Application Load Balancer (ingress)
- Amazon ECR (container registry)
- AWS CloudFormation (IaC)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/repositories` | List all repositories |
| `POST` | `/api/repositories` | Create new repository |
| `GET` | `/api/repositories/:id` | Get repository details |
| `GET` | `/api/repositories/:id/zip` | Download repository as ZIP |
| `POST` | `/api/feedback` | Submit demo request |
| `GET` | `/api/feedback` | List all feedback |
| `GET` | `/api/analytics/stats` | Analytics (downloads, users, use cases) |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)

### Setup

```bash
git clone git@ssh.gitlab.aws.dev:raghasun/cloud-demo-generator-v2.git
cd cloud-demo-generator-v3
npm install
```

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/demogen"
npm run db:push    # Push schema to database
npm run dev        # Start dev server with Vite HMR
```

App runs at: `http://localhost:3000`

---

## Deployment (AWS)

Deployed to Isengard account **sundaar4** (`633384844157`) in **us-east-2**.

### Deployed Resources

| Resource | Value |
|----------|-------|
| CloudFormation Stack | `cloud-demo-generator-v3` |
| App URL | http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com |
| Cognito User Pool | `us-east-2_sndKJLxLR` |
| Cognito Client ID | `4bm8gt0i2of69v9g0vm5nnh2k0` |
| RDS Endpoint | `demo-gen-db.cierbquhdtv6.us-east-2.rds.amazonaws.com` |
| ECR Repository | `633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3` |
| ECS Cluster | `demo-gen-cluster` |
| ECS Service | `demo-gen-service` (Fargate, 1 task) |

### Deploy from scratch

```bash
# 1. Federate: https://isengard.amazon.com/federate?account=633384844157&role=Admin

# 2. Deploy infrastructure
aws cloudformation create-stack \
  --stack-name cloud-demo-generator-v3 \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=DBUsername,ParameterValue=demoadmin \
    ParameterKey=DBPassword,ParameterValue=<YOUR_PASSWORD> \
  --region us-east-2

# 3. Build and push Docker image
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin 633384844157.dkr.ecr.us-east-2.amazonaws.com
docker build -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest \
  633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
docker push 633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest

# 4. Force new deployment
aws ecs update-service --cluster demo-gen-cluster --service demo-gen-service \
  --force-new-deployment --region us-east-2
```

### Tear-down

```bash
aws cloudformation delete-stack --stack-name cloud-demo-generator-v3 --region us-east-2
aws cognito-idp delete-user-pool --user-pool-id us-east-2_sndKJLxLR --region us-east-2
aws ecr delete-repository --repository-name cloud-demo-generator-v3 --force --region us-east-2
```

---

## Evolution

Three-generation evolution of the same core concept, each generation deepening the Claude-tooling integration:

- **V1 — Replit Agent (Claude-powered), 2024.** Original prototype. See precursor repo: [database-demo-generator](https://github.com/nrsundar/database-demo-generator).
- **V2 — Kiro on Claude Opus, Render deployment.** Re-architected into a portable TypeScript/Postgres platform with Drizzle ORM, Firebase Auth, and a Render deployment target. Used shadcn/ui + Tailwind + Neon serverless.
- **V3 — Kiro in AgentSpaces, AWS-native.** Current state. Migrated to Cloudscape Design System + Cognito + ECS Fargate + RDS PostgreSQL. CloudFormation templates for one-command deploy. Fully Epoxy/Orthanc compliant.

---

## How It Works

1. User signs in via Amazon Cognito
2. Selects demo configuration (language, DB type, region, use cases, complexity)
3. The generator produces:
   - Database schema + extensions
   - Seed data
   - Application code
   - CloudFormation infrastructure templates
   - Documentation
4. Files are packaged into a ZIP archive
5. The ZIP is streamed to the user for download
6. Admin dashboard tracks usage and download analytics

---

## Security Considerations

- Input validation with Zod on all API endpoints
- Amazon Cognito SRP authentication (no passwords transmitted in plaintext)
- RDS in private subnets, not publicly accessible
- Security groups enforce ALB → ECS → RDS chain only
- RDS storage encrypted at rest
- ECR image scanning on push
- No hardcoded credentials (DATABASE_URL via environment)
- Epoxy/Orthanc compliant for Isengard accounts

---

## Built With

- **[Kiro](https://kiro.dev)** (powered by Anthropic Claude) in **AgentSpaces** — entire V3 build: code conversion, Cloudscape UI, Cognito auth, CloudFormation, Docker, ECR push, ECS deployment, screenshots, documentation
- **Replit Agent** (Claude-powered) — V1 prototype, 2024
- TypeScript / React / Cloudscape — frontend
- Node.js / Express / Drizzle ORM — backend
- Amazon RDS PostgreSQL 16 — data layer
- Amazon Cognito — authentication
- AWS ECS Fargate, ALB, VPC, CloudFormation — cloud infrastructure

---

## Related Repositories

- [database-demo-generator](https://github.com/nrsundar/database-demo-generator) — V1 precursor (Replit Agent)
- [pgvector-hybrid-search-demo](https://github.com/nrsundar/pgvector-hybrid-search-demo-py-v1.0) — generated output
- [postgis-property-search-demo](https://github.com/nrsundar/postgis-property-search-demo-py-v2) — generated output
- [pgroute-transportation-demo](https://github.com/nrsundar/pgroute-transportation-demo-py-v1.0-2) — generated output
- [gitlab-mcp-server](https://ssh.gitlab.aws.dev/raghasun/gitlab-mcp-server) — GitLab MCP server (also built with Kiro)

---

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
This project is for internal Amazon use only.
