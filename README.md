# Cloud Demo Generator v3

An internal Amazon web application for generating production-ready cloud infrastructure demo repositories. Built with AWS Cloudscape Design System for an AWS Console look and feel.

## Architecture

```
Internet → ALB (public) → ECS Fargate (private) → RDS PostgreSQL (private)
                                                 ↕
                                          Cognito User Pool
```

### AWS Services Used
- **Amazon Cognito** — User authentication (email/password)
- **Amazon ECS Fargate** — Containerized app hosting (no EC2)
- **Amazon RDS PostgreSQL 16** — Database (private subnet, encrypted)
- **Application Load Balancer** — Internet-facing entry point
- **Amazon ECR** — Container image registry
- **VPC** — Isolated networking with public/private subnets

### Epoxy/Orthanc Compliance
- ✅ RDS is NOT publicly accessible
- ✅ ECS tasks in private subnets with NAT Gateway
- ✅ Security groups: ALB → ECS → RDS (least privilege chain)
- ✅ RDS storage encrypted
- ✅ ECR image scanning on push
- ✅ No EC2 instances — Fargate only

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Cloudscape Design System, Wouter |
| Backend | Express.js, Drizzle ORM |
| Database | PostgreSQL 16 (RDS) |
| Auth | Amazon Cognito |
| Infra | CloudFormation, ECS Fargate, ALB |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with features and use cases |
| `/auth` | Sign in / Sign up / Email verification |
| `/home` | Demo generator — configure and create repos |
| `/demo-request` | Request custom demonstrations |
| `/admin` | Analytics dashboard — repos, feedback, stats |

## Local Development

```bash
npm install
export DATABASE_URL="postgresql://user:pass@localhost:5432/demogen"
npm run dev
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for full deployment instructions to AWS.

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
This project is for internal Amazon use only.
