# ☁️ Cloud Demo Generator v3

> **Built with Kiro AI in AgentSpaces** — An internal Amazon web application for generating production-ready cloud infrastructure demo repositories, powered by AWS Cloudscape Design System.

**Live App:** [http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com](http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com)

---

## 📸 Screenshots

### Landing Page
The landing page showcases features and popular use cases with Cloudscape Cards layout.

![Landing Page](screenshots/01-landing.png)

### Authentication
Cognito-powered authentication with Sign In, Create Account, and Email Verification tabs.

![Auth Page](screenshots/02-auth.png)

### Demo Generator
Full configuration form — select language, database type, version, instance type, region, use cases, and complexity level. Generated repositories appear in the table below.

![Generator Page](screenshots/03-generator.png)

### Request Demo
Submit custom demo requests with priority levels and detailed requirements.

![Demo Request Page](screenshots/04-demo-request.png)

### Admin Dashboard
Analytics overview with stat cards, plus tabbed views for Repositories, Feedback, and Use Cases.

![Admin Dashboard](screenshots/05-admin.png)

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              AWS Account (sundaar4)          │
                    │              633384844157 / us-east-2        │
                    │                                             │
  Internet ────────►│  ┌─────────┐    ┌──────────────────────┐   │
                    │  │   ALB   │───►│  ECS Fargate (private)│   │
                    │  │ (public)│    │  - Node.js 18        │   │
                    │  └─────────┘    │  - Express + React   │   │
                    │                 └──────────┬───────────┘   │
                    │                            │               │
                    │                 ┌──────────▼───────────┐   │
                    │                 │  RDS PostgreSQL 16.13 │   │
                    │                 │  (private, encrypted) │   │
                    │                 └──────────────────────┘   │
                    │                                             │
                    │  ┌──────────────────────┐                  │
                    │  │  Cognito User Pool   │                  │
                    │  │  (email/password)    │                  │
                    │  └──────────────────────┘                  │
                    └─────────────────────────────────────────────┘
```

### AWS Services Used

| Service | Purpose |
|---------|---------|
| **Amazon Cognito** | User authentication (email/password with SRP) |
| **Amazon ECS Fargate** | Containerized app hosting (256 CPU / 512 MB) |
| **Amazon RDS PostgreSQL 16.13** | Database (db.t4g.micro, private, encrypted) |
| **Application Load Balancer** | Internet-facing entry point (HTTP/80) |
| **Amazon ECR** | Container image registry (scan on push) |
| **Amazon VPC** | 10.0.0.0/16 — 2 public + 2 private subnets |
| **AWS CloudFormation** | Infrastructure as Code |
| **Amazon CloudWatch** | Logs (/ecs/demo-gen, 14-day retention) |
| **NAT Gateway** | Outbound internet for private subnets |

---

## 🔒 Epoxy/Orthanc Compliance

This application is designed to meet [Epoxy Orthanc](https://w.amazon.com/bin/view/AWS_IT_Security/Epoxy/orthanc) security requirements for Isengard accounts:

| Requirement | Status | Details |
|-------------|--------|---------|
| RDS not publicly accessible | ✅ | `PubliclyAccessible: false` — won't trigger `personal-orthanc-rds-publicly-accessible` |
| ECS in private subnets | ✅ | Tasks run in 10.0.10.0/24 and 10.0.11.0/24 |
| Least-privilege security groups | ✅ | ALB → ECS (port 5000) → RDS (port 5432) chain only |
| Storage encryption | ✅ | RDS `StorageEncrypted: true` |
| No EC2 instances | ✅ | Fargate only — minimizes GuardDuty attack surface |
| ECR image scanning | ✅ | `scanOnPush: true` |
| No public S3 buckets | ✅ | No S3 used |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, [Cloudscape Design System](https://cloudscape.design), Wouter, TanStack Query |
| **Backend** | Express.js, Drizzle ORM, Zod validation |
| **Database** | PostgreSQL 16.13 (Amazon RDS) |
| **Auth** | Amazon Cognito (SRP flow, email/password) |
| **Infra** | CloudFormation, ECS Fargate, ALB, VPC |
| **Build** | Vite, esbuild, TypeScript, Docker |
| **AI Tool** | Built entirely with **Kiro AI** in AgentSpaces |

---

## 📁 Project Structure

```
cloud-demo-generator-v3/
├── client/                     # Frontend (React + Cloudscape)
│   ├── index.html
│   └── src/
│       ├── main.tsx            # Entry point + Cloudscape global styles
│       ├── App.tsx             # Router + AuthProvider + QueryClient
│       ├── components/
│       │   └── AppLayout.tsx   # Cloudscape AppLayout + TopNav + SideNav
│       ├── hooks/
│       │   └── useAuth.tsx     # Cognito auth context + hook
│       ├── lib/
│       │   ├── auth.ts         # Cognito client (signIn, signUp, confirm, signOut)
│       │   └── queryClient.ts  # TanStack Query config
│       └── pages/
│           ├── landing.tsx     # Features + use cases cards
│           ├── auth.tsx        # Sign in / Sign up / Verify email
│           ├── home.tsx        # Generator form + repos table
│           ├── demo-request.tsx# Custom demo request form
│           ├── admin.tsx       # Analytics dashboard
│           └── not-found.tsx   # 404 page
├── server/                     # Backend (Express)
│   ├── index.ts                # Dev server (with Vite HMR)
│   ├── production.ts           # Production server (static files)
│   ├── routes.ts               # API routes (repos, feedback, analytics)
│   ├── storage.ts              # DB queries (Drizzle ORM) + ZIP generation
│   ├── db.ts                   # PostgreSQL connection (pg + Drizzle)
│   └── vite.ts                 # Vite dev middleware
├── shared/
│   └── schema.ts               # Drizzle schema (repos, users, logs, feedback)
├── screenshots/                # App screenshots for documentation
├── cloudformation.yaml         # Full infrastructure stack
├── Dockerfile                  # Multi-stage build for ECS
├── DEPLOY.md                   # Deployment guide with all resource IDs
├── LICENSE                     # Amazon internal use only
└── package.json
```

---

## 🚀 Pages & Features

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Landing** | Feature cards, use case gallery, auth-aware CTAs |
| `/auth` | **Authentication** | Cognito sign in, create account, email verification |
| `/home` | **Generator** | Configure repo (language, DB, region, use cases) → generate → download ZIP |
| `/demo-request` | **Request Demo** | Submit custom demo requests with priority levels |
| `/admin` | **Admin Dashboard** | Stats (downloads, users, repos, feedback), tabbed data tables |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/repositories` | List all repositories |
| `POST` | `/api/repositories` | Create new repository |
| `GET` | `/api/repositories/:id` | Get repository details |
| `GET` | `/api/repositories/:id/zip` | Download repository as ZIP |
| `POST` | `/api/feedback` | Submit demo request |
| `GET` | `/api/feedback` | List all feedback |
| `GET` | `/api/analytics/stats` | Get analytics (downloads, users, use cases) |

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Set database URL (local PostgreSQL)
export DATABASE_URL="postgresql://user:pass@localhost:5432/demogen"

# Push schema to database
npm run db:push

# Start dev server (with Vite HMR)
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 📦 Deployment

### AWS Resources (already deployed)

| Resource | Value |
|----------|-------|
| **Account** | sundaar4 (`633384844157`) |
| **Region** | us-east-2 (Ohio) |
| **Stack** | `cloud-demo-generator-v3` |
| **App URL** | http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com |
| **Cognito Pool** | `us-east-2_sndKJLxLR` |
| **Cognito Client** | `4bm8gt0i2of69v9g0vm5nnh2k0` |
| **RDS Endpoint** | `demo-gen-db.cierbquhdtv6.us-east-2.rds.amazonaws.com` |
| **ECR** | `633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3` |

### Test Credentials

| Field | Value |
|-------|-------|
| Email | `demo@example.com` |
| Password | `DemoUser2026!` |

### Redeploy

```bash
# Federate: https://isengard.amazon.com/federate?account=633384844157&role=Admin

# Build and push
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin 633384844157.dkr.ecr.us-east-2.amazonaws.com
docker build -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest \
  633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
docker push 633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest

# Force new deployment
aws ecs update-service --cluster demo-gen-cluster --service demo-gen-service \
  --force-new-deployment --region us-east-2
```

See [DEPLOY.md](DEPLOY.md) for full details including cleanup instructions.

---

## 🤖 Built with Kiro AI

This entire application was built using **Kiro AI in AgentSpaces** — from initial code conversion, through Cloudscape UI implementation, Cognito auth integration, CloudFormation infrastructure, Docker containerization, ECR push, and ECS deployment. The conversation-driven development process demonstrates how AI agents can deliver production-ready, security-compliant AWS applications.

### What Kiro Did
1. Cloned and analyzed the original v2 repo (Firebase/Replit/Neon/shadcn)
2. Stripped all non-AWS dependencies and rebuilt with Cloudscape
3. Implemented Cognito authentication (SRP flow)
4. Created full API with Drizzle ORM + PostgreSQL
5. Wrote CloudFormation template (Epoxy-compliant)
6. Built Docker image and pushed to ECR
7. Deployed the full stack to an Isengard account
8. Captured screenshots for documentation

---

## 📄 License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
This project is for internal Amazon use only.
