#!/usr/bin/env bash
# One-button deploy: build the image, push to ECR, force ECS to pull and replace tasks.
# Reads AWS account / region from the active AWS CLI profile. Idempotent.
#
# Required env or CLI defaults:
#   AWS_REGION           (default: us-east-2)
#   ECR_REPO             (default: demoforge)
#   ECS_CLUSTER          (default: demo-gen-cluster)
#   ECS_SERVICE          (default: demo-gen-service)
#   IMAGE_TAG            (default: latest)
#
# Usage:
#   ./scripts/deploy.sh                # tag = latest, infers region from AWS CLI
#   IMAGE_TAG=v1.2.3 ./scripts/deploy.sh
#   AWS_REGION=us-west-2 ./scripts/deploy.sh

set -euo pipefail

REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo us-east-2)}"
ECR_REPO="${ECR_REPO:-demoforge}"
ECS_CLUSTER="${ECS_CLUSTER:-demo-gen-cluster}"
ECS_SERVICE="${ECS_SERVICE:-demo-gen-service}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

cd "$(dirname "$0")/.."

# 1. Discover AWS account
echo "==> Discovering AWS account..."
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
echo "    Account: ${ACCOUNT}"
echo "    Region:  ${REGION}"
echo "    Image:   ${IMAGE_URI}"

# 2. Type-check before building (cheap fail-fast)
echo "==> Type-checking..."
npm run check

# 3. ECR login + ensure repo exists
echo "==> Logging into ECR..."
aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${REGION}" >/dev/null 2>&1 || {
  echo "    Creating ECR repository ${ECR_REPO}..."
  aws ecr create-repository \
    --repository-name "${ECR_REPO}" \
    --image-scanning-configuration scanOnPush=true \
    --region "${REGION}" >/dev/null
}
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${REGISTRY}"

# 4. Build and push
echo "==> Building image..."
docker build -t "${ECR_REPO}:${IMAGE_TAG}" .
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${IMAGE_URI}"

echo "==> Pushing image..."
docker push "${IMAGE_URI}"

# 5. Force ECS redeploy (only if the cluster/service actually exist; first-time
#    deploys go through CloudFormation and don't have a service yet)
if aws ecs describe-services \
     --cluster "${ECS_CLUSTER}" \
     --services "${ECS_SERVICE}" \
     --region "${REGION}" \
     --query 'services[0].status' \
     --output text 2>/dev/null | grep -q ACTIVE; then
  echo "==> Forcing ECS deployment..."
  aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --force-new-deployment \
    --region "${REGION}" \
    --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
    --output table

  echo "==> Waiting for service to stabilize (this can take a few minutes)..."
  aws ecs wait services-stable \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${REGION}"
  echo "    Service stable."
else
  echo "==> ECS service ${ECS_SERVICE} not found in ${ECS_CLUSTER}; skipping redeploy."
  echo "    First-time deploy? Run the CloudFormation stack first (see DEPLOY.md)."
fi

echo "==> Done. Image: ${IMAGE_URI}"
