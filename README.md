# Cloud Demo Generator v3

> **Built with [Kiro](https://kiro.dev) (powered by [Anthropic Claude](https://www.anthropic.com/claude))** — AI-driven development from code conversion through production deployment.

---

## Demo Walkthrough

| Step | Screenshot |
|------|------------|
| Landing / feature overview | ![Landing](screenshots/01-landing.png) |
| Authentication (Cognito) | ![Auth](screenshots/02-auth.png) |
| Generator configuration | ![Generator](screenshots/03-generator.png) |
| Custom demo request | ![Demo Request](screenshots/04-demo-request.png) |
| Admin analytics dashboard | ![Admin](screenshots/05-admin.png) |

---

## What This Produces

A platform that generates customer-ready PostgreSQL demo repositories including:

- **[pgvector-hybrid-search-demo](https://github.com/nrsundar/pgvector-hybrid-search-demo-py-v1.0)** — semantic + lexical hybrid retrieval using pgvector
- **[postgis-property-search-demo](https://github.com/nrsundar/postgis-property-search-demo-py-v2)** — geospatial property search with PostGIS
- **[pgroute-transportation-demo](https://github.com/nrsundar/pgroute-transportation-demo-py-v1.0-2)** — transportation network routing with pgRouting

Each demo is generated end-to-end:

- Database schema and extensions
- Seed data and ingestion pipelines
- Application layer (Python, JavaScript, TypeScript, Go)
- Infrastructure (AWS CloudFormation)
- Documentation and setup instructions

> Reduce demo setup time from hours to minutes, while ensuring production-quality outputs.

---

## Overview

The **Cloud Demo Generator** is an AI-powered platform that generates complete, deployable PostgreSQL demo repositories for real-world use cases.

Designed for:

- Solutions Architects preparing customer demonstrations
- Sales Engineers building proof-of-concept environments
- Developers exploring PostgreSQL extensions on AWS

---

## Architecture

![Architecture](screenshots/architecture.png)

### AWS Services

| Service | Purpose |
|---------|---------|
| **Amazon Cognito** | User authentication (email/password with SRP) |
| **Amazon ECS Fargate** | Containerized app hosting (no EC2 instances) |
| **Amazon RDS PostgreSQL 16** | Database (private subnet, encrypted at rest) |
| **Application Load Balancer** | Internet-facing entry point |
| **Amazon ECR** | Container image registry with scan-on-push |
| **Amazon VPC** | Isolated networking with public/private subnets |
| **AWS CloudFormation** | Infrastructure as Code — one-command deploy |
| **Amazon CloudWatch** | Centralized logging and monitoring |

### Security

- RDS in private subnets, not publicly accessible
- ECS tasks in private subnets with NAT Gateway for outbound only
- Least-privilege security groups: ALB → ECS → RDS chain
- RDS storage encrypted at rest
- Cognito SRP authentication (no passwords in transit)
- ECR image scanning on push
- No hardcoded credentials — all via environment variables
- Input validation with Zod on all API endpoints

---

## Key Features

### Repository Generation Engine

- Generates complete, downloadable demo repositories as ZIP packages
- Configurable: language, database type/version, instance type, region, use cases, complexity
- Includes CloudFormation templates for AWS deployment
- Produces structured learning modules per generated demo

### Supported Use Cases

| Use Case | Technologies |
|----------|-------------|
| Hybrid Search | pgvector · OpenAI · LangChain |
| Geospatial Analytics | PostGIS · QGIS · Leaflet |
| Time-Series Analytics | TimescaleDB · Grafana · Python |
| Multi-Tenant SaaS | Row-Level Security · JWT · REST API |
| Analytics Dashboard | Metabase · PostgreSQL · Docker |
| High Availability | Aurora · Read Replicas · CloudWatch |

### Authentication

- Amazon Cognito User Pool
- Email/password sign-up with verification
- SRP-based sign-in (secure, no password transmission)

### Admin Dashboard

- Download and usage analytics
- Repository status monitoring
- Feedback collection and management
- Use case popularity tracking

---

## Technology Stack

### Frontend

- React 18 + TypeScript
- [Cloudscape Design System](https://cloudscape.design) (AWS Console UI)
- TanStack Query (data fetching)
- Wouter (routing)

### Backend

- Node.js 18 + Express.js (TypeScript)
- Drizzle ORM + PostgreSQL
- Archiver (ZIP generation)
- Zod (input validation)

### Infrastructure

- AWS ECS Fargate (compute)
- Amazon RDS PostgreSQL 16 (database)
- Amazon Cognito (authentication)
- Application Load Balancer (ingress)
- Amazon ECR (container registry)
- AWS CloudFormation (IaC)

---

## Project Structure

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
│   ├── routes.ts                   # API routes
│   ├── storage.ts                  # DB queries + ZIP generation
│   ├── db.ts                       # PostgreSQL connection
│   └── vite.ts                     # Vite dev middleware
├── shared/
│   └── schema.ts                   # Drizzle schema
├── screenshots/                    # App screenshots + architecture diagram
├── cloudformation.yaml             # Full infrastructure stack
├── Dockerfile                      # Multi-stage build for ECS
├── DEPLOY.md                       # Deployment guide
└── package.json
```

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
git clone <repository-url>
cd cloud-demo-generator-v3
npm install
```

### Configure

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/demogen"

# Optional: override Cognito defaults
export VITE_COGNITO_USER_POOL_ID="your-pool-id"
export VITE_COGNITO_CLIENT_ID="your-client-id"
```

### Run

```bash
npm run db:push    # Push schema to database
npm run dev        # Start dev server with Vite HMR
```

App runs at `http://localhost:3000`.

---

## Deploy to AWS

The included `cloudformation.yaml` provisions the entire stack in your AWS account.

### Prerequisites

- AWS CLI v2 configured with appropriate IAM permissions
- Docker installed

### 1. Create a Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name cloud-demo-generator \
  --auto-verified-attributes email \
  --username-attributes email \
  --region <your-region>

# Note the UserPoolId, then create a client:
aws cognito-idp create-user-pool-client \
  --user-pool-id <pool-id> \
  --client-name cloud-demo-generator-spa \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region <your-region>
```

### 2. Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name cloud-demo-generator-v3 \
  --image-scanning-configuration scanOnPush=true \
  --region <your-region>
```

### 3. Deploy Infrastructure

```bash
aws cloudformation create-stack \
  --stack-name cloud-demo-generator \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=DBUsername,ParameterValue=demoadmin \
    ParameterKey=DBPassword,ParameterValue=<your-password> \
    ParameterKey=CognitoUserPoolId,ParameterValue=<pool-id> \
    ParameterKey=CognitoClientId,ParameterValue=<client-id> \
  --region <your-region>
```

### 4. Build and Push Docker Image

```bash
aws ecr get-login-password --region <your-region> | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com

docker build -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest \
  <account-id>.dkr.ecr.<your-region>.amazonaws.com/cloud-demo-generator-v3:latest
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/cloud-demo-generator-v3:latest
```

### 5. Get App URL

```bash
aws cloudformation describe-stacks \
  --stack-name cloud-demo-generator \
  --query 'Stacks[0].Outputs[?OutputKey==`AppURL`].OutputValue' \
  --output text --region <your-region>
```

### Tear-down

```bash
aws cloudformation delete-stack --stack-name cloud-demo-generator --region <your-region>
```

See [DEPLOY.md](DEPLOY.md) for detailed instructions.

---

## How It Works

1. User signs in via Amazon Cognito
2. Selects demo configuration (language, DB type, region, use cases, complexity)
3. The generator produces:
   - Database schema + extensions
   - Seed data and ingestion pipelines
   - Application code
   - CloudFormation infrastructure templates
   - Documentation
4. Files are packaged into a ZIP archive
5. The ZIP is streamed to the user for download
6. Admin dashboard tracks usage and download analytics

---

## Evolution

| Version | Year | Platform | Key Changes |
|---------|------|----------|-------------|
| **V1** | 2024 | Replit Agent | Original prototype ([database-demo-generator](https://github.com/nrsundar/database-demo-generator)) |
| **V2** | 2025 | Kiro CLI | TypeScript rewrite, Drizzle ORM, Firebase Auth, shadcn/ui, Render deployment |
| **V3** | 2026 | Kiro in AgentSpaces | AWS-native: Cloudscape UI, Cognito, ECS Fargate, RDS, CloudFormation |

---

## Built With

- **[Kiro](https://kiro.dev)** (powered by Anthropic Claude) — entire V3 build: code conversion, UI, auth, infrastructure, deployment, documentation
- **Replit Agent** (Claude-powered) — V1 prototype
- React / Cloudscape Design System — frontend
- Node.js / Express / Drizzle ORM — backend
- Amazon RDS PostgreSQL — data layer
- Amazon Cognito — authentication
- AWS ECS Fargate, ALB, VPC, CloudFormation — infrastructure

---

## Related Repositories

- [database-demo-generator](https://github.com/nrsundar/database-demo-generator) — V1 precursor (Replit Agent)
- [pgvector-hybrid-search-demo](https://github.com/nrsundar/pgvector-hybrid-search-demo-py-v1.0) — generated output
- [postgis-property-search-demo](https://github.com/nrsundar/postgis-property-search-demo-py-v2) — generated output
- [pgroute-transportation-demo](https://github.com/nrsundar/pgroute-transportation-demo-py-v1.0-2) — generated output

---

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
