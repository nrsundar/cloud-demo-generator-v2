# Agent Brief — Deploy & Verify DemoForge

You are an autonomous agent. This document is a complete handoff: read it once,
do the work, report back. Don't ask for clarification on anything below.

## Goal

Deploy this repo to an AWS Isengard account so AWS field SAs can use it, then
prove the deployment is healthy by running the security test suite against the
public ALB URL.

## Success criteria — all four must hold at the end

1. CloudFormation stack `demoforge` is `CREATE_COMPLETE` (or `UPDATE_COMPLETE`).
2. ECS service `demo-gen-service` in cluster `demo-gen-cluster` shows
   `desiredCount == runningCount > 0` and `serviceStable == true`.
3. `tests/security.mjs` run against the ALB DNS name passes (exit code 0,
   "0 failed").
4. The output of `aws cloudformation describe-stacks --stack-name demoforge
   --query 'Stacks[0].Outputs'` includes a working `AppURL`, and `GET ${AppURL}/api/health`
   returns HTTP 200 with a JSON body containing `"status":"ok"`.

## Required environment

Before starting, verify you have:

- `aws sts get-caller-identity` succeeds (Isengard role assumed).
- `aws configure get region` is set, or you set `AWS_REGION` explicitly.
  Default in this repo: `us-east-2`.
- `docker info` succeeds (Docker daemon reachable).
- `git` is installed and the repo is cloned with push access to
  `git@ssh.gitlab.aws.dev:raghasun/cloud-demo-generator-v2.git`.
- `node --version` ≥ 18 and `npm --version` available.
- Bedrock model access for `us.anthropic.claude-opus-4-6-v1` is enabled in
  the target region. If not, request access in the Bedrock console first;
  deployment will succeed but the agent loop will 500 at runtime.

If any of those are missing, stop and report which ones — don't try to
work around them.

## Inputs you must collect

| Input | Where to get it | Used for |
|-------|-----------------|----------|
| `<region>` | `aws configure get region` or pick `us-east-2` | All AWS calls |
| `<account-id>` | `aws sts get-caller-identity --query Account --output text` | ECR / IAM ARNs |
| `<db-password>` | Generate a 16-char random secret; record it where you can find it again (you'll need it for stack updates) | RDS master password |
| `<cognito-pool-id>` | If a Cognito pool already exists in the account named `demoforge`, reuse its ID. Otherwise run the create commands in **DEPLOY.md Step 1**. | Backend JWT verification |
| `<cognito-client-id>` | Same — from the existing pool's app client, or created in Step 1. | Backend JWT verification |

## Procedure

Follow these in order. Each step has a "verify" line — run it before moving on.

### 1. Sanity-check the working tree

```bash
git fetch origin && git status
git log --oneline -5
npm ci
npm run check    # tsc --noEmit; must exit 0
```

Verify: `npm run check` produces no output and exits 0. If it doesn't, stop;
something has regressed. Don't try to fix tsc errors — report them and stop.

### 2. Cognito (skip if pool already exists)

If `aws cognito-idp list-user-pools --max-results 50 --region <region>` already
contains a pool named `demoforge`, capture its ID and the app-client ID and
skip to step 3. Otherwise follow **DEPLOY.md Step 1**.

This repo does *not* allow self-signup; field SAs are added via
`admin-create-user`. Do not change that policy.

### 3. ECR repository (idempotent — `scripts/deploy.sh` will create it if missing)

You can let the deploy script handle this, or pre-create:

```bash
aws ecr describe-repositories --repository-names demoforge --region <region> \
  || aws ecr create-repository --repository-name demoforge \
       --image-scanning-configuration scanOnPush=true --region <region>
```

### 4. CloudFormation stack (first-time deploy only)

If `aws cloudformation describe-stacks --stack-name demoforge --region <region>`
returns a `CREATE_COMPLETE` stack, skip to step 5. Otherwise create it:

```bash
aws cloudformation create-stack \
  --stack-name demoforge \
  --template-body file://cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=DBUsername,ParameterValue=demoadmin \
    ParameterKey=DBPassword,ParameterValue=<db-password> \
    ParameterKey=CognitoUserPoolId,ParameterValue=<cognito-pool-id> \
    ParameterKey=CognitoClientId,ParameterValue=<cognito-client-id> \
  --region <region>

aws cloudformation wait stack-create-complete \
  --stack-name demoforge --region <region>
```

The stack creates: VPC, RDS Postgres (private), ECS cluster, Fargate task
def, ALB, KMS CMK. ~10–15 minutes. The ECS service will be unhealthy until
step 5 pushes the image — that's expected.

Verify:
```bash
aws cloudformation describe-stacks --stack-name demoforge --region <region> \
  --query 'Stacks[0].StackStatus' --output text
# Must print: CREATE_COMPLETE  (or UPDATE_COMPLETE on subsequent runs)
```

### 5. Build, push, redeploy

```bash
./scripts/deploy.sh
```

The script: runs `npm run check`, ECR-logs-in, builds the Docker image,
pushes `latest`, and (if the service exists) forces an ECS redeploy and
waits for `services-stable`. Region/cluster/service all overrideable via
env vars; defaults match this stack.

Verify:
```bash
aws ecs describe-services --cluster demo-gen-cluster \
  --services demo-gen-service --region <region> \
  --query 'services[0].{desired:desiredCount,running:runningCount,stable:deployments[0].rolloutState}'
# desired == running > 0, stable == "COMPLETED"
```

### 6. Get the public URL and run security tests

```bash
APP_URL=$(aws cloudformation describe-stacks --stack-name demoforge \
  --region <region> --query 'Stacks[0].Outputs[?OutputKey==`AppURL`].OutputValue' \
  --output text)
echo "$APP_URL"

curl -fsS "${APP_URL}/api/health"
# Must return 200 + JSON {"status":"ok",...}

API_BASE="${APP_URL}" node tests/security.mjs
# Must exit 0 with "0 failed"
```

### 7. Create a smoke-test admin user (only if the pool was empty)

If you created the Cognito pool in step 2, follow **DEPLOY.md Step 7** to
add yourself as an admin user. Otherwise skip — accounts are admin-managed.

### 8. Report back

Output a single block in this format:

```
DEPLOY: success | failed
  region: <region>
  account: <account-id>
  stack-status: CREATE_COMPLETE | UPDATE_COMPLETE | ROLLBACK_COMPLETE | ...
  ecs-running: N/M
  app-url: http://...elb.amazonaws.com
  health: 200 | <status>
  security-tests: P passed, F failed
  notes: <anything unexpected — flapping tasks, pre-existing CFN drift, Bedrock model access denied, etc.>
```

## Things you must NOT do

- Do **not** push code changes. If `npm run check` fails, stop and report.
- Do **not** run `aws cloudformation delete-stack` for any reason.
- Do **not** use `--no-verify`, `--force`, or `git push --force`.
- Do **not** modify `cloudformation.yaml`, `Dockerfile`, or any source. The
  goal is to deploy what's at `HEAD`, not improve it.
- Do **not** commit secrets (the DB password, Cognito IDs) to the repo.
- Do **not** disable the security tests if any fail. Fail loudly.
- Do **not** deploy to a region where Bedrock Opus 4.6 isn't enabled —
  `us-east-2` is the default for a reason.

## When to stop and ask the human

- `npm run check` reports new errors not in the existing repo.
- The CFN stack ends in `*_FAILED` or `ROLLBACK_*`.
- Security tests fail and the failure isn't obviously from a wrong
  `API_BASE` (e.g., expected 401 got 502 — that's a real failure).
- Bedrock model access is not enabled in the chosen region and you can't
  enable it yourself (it requires a separate request flow).
- Any AWS API returns `AccessDenied` — your Isengard role is missing a
  permission; don't try to grant it yourself.

## Reference: what's in the repo

- `cloudformation.yaml` — VPC + RDS + ECS Fargate + ALB + KMS CMK.
- `Dockerfile` — Node 18 builder + alpine runtime; bundles AWS RDS CA.
- `scripts/deploy.sh` — type-check → build → push → ECS force-redeploy.
- `server/agent/` — agent loop (`loop.ts`), persistent sessions
  (`sessions.ts`), per-turn budget (`budget.ts`, currently 8 iters/150s/64K
  tokens), envelope Zod validation (`envelope.ts`), safety guardrails
  (`safety.ts`), tenant scoping (`tenant.ts`).
- `server/tools/` — 8 tools registered at startup (lookupExtensions,
  validateExtension, searchPriorDemos, estimateInfraCost, generate{CFTemplate,
  Schema,AppCode,Modules}). All input/output schemas are Zod.
- `server/bedrock/config.ts` — single source of truth for the model id;
  override with `BEDROCK_MODEL_ID`.
- `tests/security.mjs` — auth/authz + CORS smoke tests. Used by step 6.
- `DEPLOY.md` — long-form, human-oriented deployment guide. Use it as
  reference when this brief points at specific steps.
