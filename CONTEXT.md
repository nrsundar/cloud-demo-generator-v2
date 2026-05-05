# Cloud Demo Generator v3 — Project Context Transfer

## What This Is
You are continuing maintenance of **Cloud Demo Generator v3**, an AI-powered web application that generates complete, deployable PostgreSQL demo repositories (pgvector, PostGIS, pgRouting) for customer engagements. The entire application was built by Kiro AI over 6 days.

---

## Code Repositories

| Repo | URL | Purpose |
|------|-----|---------|
| **Main app (GitLab)** | `git@ssh.gitlab.aws.dev:raghasun/cloud-demo-generator-v2.git` | Primary source |
| **Main app (GitHub)** | `https://github.com/nrsundar/cloud-demo-generator-v2` | Public mirror / aws-samples candidate |
| **cdg-pgvector** | GitLab: `raghasun/cdg-pgvector-demo` / GitHub: `nrsundar/cdg-pgvector-hybrid-search-demo` | Generated demo |
| **cdg-postgis** | GitLab: `raghasun/cdg-postgis-demo` / GitHub: `nrsundar/cdg-postgis-property-search-demo` | Generated demo |
| **cdg-pgroute** | GitLab: `raghasun/cdg-pgroute-demo` / GitHub: `nrsundar/cdg-pgroute-transportation-demo` | Generated demo |
| **GitLab MCP Server** | GitLab: `raghasun/gitlab-mcp-server` | Custom MCP server for Kiro |

### Clone the main project
```bash
ln -sf /shared/.ssh/id_ecdsa ~/.ssh/id_ecdsa
ln -sf /shared/.ssh/id_ecdsa.pub ~/.ssh/id_ecdsa.pub
chmod 600 ~/.ssh/id_ecdsa
git clone git@ssh.gitlab.aws.dev:raghasun/cloud-demo-generator-v2.git
cd cloud-demo-generator-v2
```

---

## AWS Infrastructure (sundaar4 account)

| Resource | Value |
|----------|-------|
| **Account** | `<ACCOUNT_ID>` (sundaar4, personal Isengard) |
| **Region** | `us-east-2` |
| **Federate** | `https://isengard.amazon.com/federate?account=<ACCOUNT_ID>&role=<ROLE_NAME>` |
| **CloudFormation Stack** | `cloud-demo-generator-v3` |
| **Cognito User Pool** | `<COGNITO_POOL_ID>` |
| **Cognito Client ID** | `<COGNITO_CLIENT_ID>` |
| **Cognito Domain** | `cloud-demo-gen-v3.auth.us-east-2.amazoncognito.com` |
| **RDS PostgreSQL** | Auto-named by CloudFormation (was `demo-gen-db`, recreated) |
| **ECS Cluster** | `demo-gen-cluster` |
| **ECS Service** | `demo-gen-service` (Fargate, 256 CPU / 512 MB) |
| **ALB** | `demo-gen-alb` (HTTP, redirects non-API to Amplify) |
| **Amplify App** | `<AMPLIFY_APP_ID>` |
| **Amplify URL** | `https://main.<AMPLIFY_APP_ID>.amplifyapp.com` |
| **CloudFront** | `<CLOUDFRONT_ID>.cloudfront.net` (HTTPS proxy to ALB for API) |
| **ECR** | `<ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3` |
| **KMS CMK** | `alias/demo-gen-cmk` (key rotation enabled) |
| **CloudWatch Logs** | `/ecs/demo-gen` (14-day retention) |
| **Lambda** | `cognito-presignup-email-filter` (validates @amazon.com, currently not active since self-reg is disabled) |
| **AWS Config** | Enabled with S3 delivery (`demo-gen-config-<ACCOUNT_ID>`) |
| **SecurityHub** | Enabled with default standards |

---

## User Accounts (Cognito)

| Email | Password | Role |
|-------|----------|------|
| `demo@example.com` | `<ADMIN_PASSWORD>` | Admin (in `admin` Cognito group) |
| `rsundar19@gmail.com` | (user's own) | Admin |
| `demo1@example.com` | `<DEMO1_PASSWORD>` | Regular user |
| `demo2@example.com` | `<DEMO2_PASSWORD>` | Regular user |

### Create new users (self-registration is DISABLED due to Palisade)
```bash
aws cognito-idp admin-create-user --user-pool-id <COGNITO_POOL_ID> \
  --username alias@amazon.com --temporary-password TempPass1! \
  --message-action SUPPRESS \
  --user-attributes Name=email,Value=alias@amazon.com Name=email_verified,Value=true Name=name,Value="User Name" \
  --region us-east-2

aws cognito-idp admin-set-user-password --user-pool-id <COGNITO_POOL_ID> \
  --username alias@amazon.com --password PermanentPass1! --permanent --region us-east-2
```

### Make a user admin
```bash
aws cognito-idp admin-add-user-to-group --user-pool-id <COGNITO_POOL_ID> \
  --username alias@amazon.com --group-name admin --region us-east-2
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Cloudscape Design System, TanStack Query, Wouter |
| Backend | Node.js 18, Express.js, Drizzle ORM, Zod, Archiver |
| Database | PostgreSQL 16 (Amazon RDS) |
| Auth | Amazon Cognito (JWT via aws-jwt-verify, admin-only registration) |
| Infra | CloudFormation, ECS Fargate, ALB, Amplify, CloudFront, VPC |
| Build | Vite, esbuild, TypeScript, Docker |

---

## Deployment Process

### Backend (ECS)
```bash
cd cloud-demo-generator-v2
npm run build
docker build --no-cache -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com
docker push <ACCOUNT_ID>.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
aws ecs update-service --cluster demo-gen-cluster --service demo-gen-service --force-new-deployment --region us-east-2
```

### Frontend (Amplify)
```bash
VITE_API_URL="https://<CLOUDFRONT_ID>.cloudfront.net" \
VITE_COGNITO_USER_POOL_ID="<COGNITO_POOL_ID>" \
VITE_COGNITO_CLIENT_ID="<COGNITO_CLIENT_ID>" \
  npx vite build

cd dist/public && zip -r /tmp/frontend.zip .
# Then use Amplify create-deployment + start-deployment APIs
```

### CloudFormation updates
```bash
aws cloudformation update-stack --stack-name cloud-demo-generator-v3 \
  --template-body file://cloudformation.yaml --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=DBUsername,UsePreviousValue=true ParameterKey=DBPassword,UsePreviousValue=true \
    ParameterKey=CognitoUserPoolId,UsePreviousValue=true ParameterKey=CognitoClientId,UsePreviousValue=true \
  --region us-east-2
```

---

## Key Architecture Decisions

1. **Amplify (frontend) + CloudFront (API proxy) + ALB (backend)** — Amplify provides HTTPS for the SPA. CloudFront proxies API calls to the ALB over HTTPS to avoid mixed-content browser blocking. ALB is HTTP-only.

2. **Self-registration DISABLED** — Palisade (AppSec scanner) flags any Cognito self-registration on personal Isengard accounts, regardless of domain filtering. Admin-invite is the only Palisade-safe pattern. A Lambda pre-sign-up trigger exists (`cognito-presignup-email-filter`) for @amazon.com filtering but self-reg must stay off.

3. **Demo templates as tarballs** — The 3 demo templates (pgvector, PostGIS, pgRouting) are stored as `.tar.gz` files in `server/templates/`. The generator extracts them, customizes (name, region, PG version, instance type), and creates a ZIP. Templates include CloudFormation, app.py, modules, data, scripts.

4. **Auto-migration on startup** — `server/migrate.ts` creates tables on first boot (no manual `db:push` needed). This was necessary because we can't run Drizzle commands against the private RDS from DevSpaces.

5. **ALB redirects non-API to Amplify** — If someone hits the ALB URL directly, non-`/api/*` requests redirect 301 to the Amplify HTTPS URL.

---

## Known Issues / Gotchas

1. **Cognito self-registration** — MUST stay disabled on this account. Enabling it triggers Palisade alerts within hours.
2. **RDS was deleted once** — CloudFormation had a hardcoded `DBInstanceIdentifier: demo-gen-db`. After deletion, CFN couldn't recreate it. Fixed by removing the hardcoded name.
3. **CORS origins** — The `ALLOWED_ORIGINS` env var in CloudFormation must include the Amplify and CloudFront URLs. It was accidentally reset to localhost-only during cleanup, breaking the app.
4. **Binary files in git** — `.gitattributes` marks `*.zip` and `*.tar.gz` as binary. Without this, git applies line-ending conversion that corrupts them.
5. **`import.meta.dirname`** — Undefined in esbuild bundles. Template path resolution uses `process.cwd()` and `/app/server/templates` (Docker path).
6. **NODE_TLS_REJECT_UNAUTHORIZED=0** — Set in CloudFormation env vars for RDS SSL. Ideally should use RDS CA bundle instead.
7. **pgRouting on Aurora** — IS supported (confirmed via AWS docs). Earlier we incorrectly added a warning saying it wasn't.

---

## Epoxy/Orthanc Compliance

Global rules saved at `/shared/.kiro/steering/epoxy-compliance.md`. Key rules:
- RDS: private subnets, encrypted, not publicly accessible
- ECS: Fargate in private subnets, no EC2
- Security groups: ALB → ECS → RDS chain only
- Cognito: no self-registration on personal accounts
- All storage encrypted (KMS CMK preferred)
- CloudTrail, Config, SecurityHub enabled

---

## aws-samples Submission Status

- ✅ Code ready (MIT-0, NOTICE, CoC, CONTRIBUTING, git-secrets clean)
- ✅ GitHub account linked to Amazon
- ✅ Joined aws-samples org
- ✅ GitHub training completed
- ✅ Bindle: `amzn1.bindle.resource.ij2hff56oohpnyfkziqa`
- 🔄 ALM Launch — in progress (needed POSIX/LDAP group setup)
- 🔄 OpenSourcerer repo creation — in progress (needed GitHub team)
- GitHub team created: `cloud-demo-generators-admins` under aws-samples

---

## Files Structure

```
cloud-demo-generator-v3/
├── client/src/
│   ├── main.tsx, App.tsx
│   ├── components/AppLayout.tsx     # Cloudscape shell
│   ├── hooks/useAuth.tsx            # Cognito auth context
│   ├── lib/auth.ts                  # Cognito client SDK
│   ├── lib/queryClient.ts           # API calls with Bearer token
│   ├── lib/config.ts                # API_BASE URL
│   └── pages/                       # landing, auth, home, admin, demo-request, not-found
├── server/
│   ├── production.ts                # Production entry (no Vite dep)
│   ├── routes.ts                    # All API routes (requireAuth, requireAdmin)
│   ├── auth.ts                      # JWT verification middleware
│   ├── storage.ts                   # DB queries + ZIP generation from templates
│   ├── migrate.ts                   # Auto-create tables on startup
│   ├── db.ts                        # PostgreSQL connection with SSL
│   └── templates/*.tar.gz           # pgvector, postgis, pgroute demo templates
├── shared/schema.ts                 # Drizzle ORM schema
├── tests/security.mjs               # 12 security integration tests
├── tests/test-demo.sh               # E2E demo deployment test
├── samples/*.zip                    # Pre-generated demo ZIPs
├── screenshots/                     # App screenshots + architecture diagram
├── cloudformation.yaml              # Full infrastructure stack
├── Dockerfile                       # Multi-stage build
├── .github/ISSUE_TEMPLATE/          # Bug report + feature request
├── LICENSE (MIT-0), NOTICE, CODE_OF_CONDUCT.md, CONTRIBUTING.md
└── README.md
```

---

## Common Operations

### Get AWS credentials
```bash
# From Isengard web UI, or using ADA on laptop:
ada credentials update --profile sundaar4 --once
```

### Run security tests
```bash
API_BASE=https://<CLOUDFRONT_ID>.cloudfront.net node tests/security.mjs
```

### Regenerate sample ZIPs
Get a Cognito token, create repos via API, download ZIPs, commit to `samples/`.

### Check ECS logs
```bash
aws logs describe-log-streams --log-group-name /ecs/demo-gen --region us-east-2 --order-by LastEventTime --descending --max-items 1
aws logs get-log-events --log-group-name /ecs/demo-gen --log-stream-name <stream> --region us-east-2
```

### Push to both remotes
```bash
git push origin main          # GitLab
git push github main --force  # GitHub (remote name: github)
```
