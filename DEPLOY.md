# Deployment Guide

## Prerequisites

- AWS CLI v2 configured
- Docker installed
- An AWS account with appropriate permissions

## Step 1: Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name cloud-demo-generator \
  --auto-verified-attributes email \
  --username-attributes email \
  --admin-create-user-config AllowAdminCreateUserOnly=false \
  --region <your-region>

# Note the UserPoolId, then create a client:
aws cognito-idp create-user-pool-client \
  --user-pool-id <pool-id> \
  --client-name cloud-demo-generator-spa \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region <your-region>

# Create admin group:
aws cognito-idp create-group \
  --user-pool-id <pool-id> \
  --group-name admin \
  --region <your-region>
```

## Step 2: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name cloud-demo-generator-v3 \
  --image-scanning-configuration scanOnPush=true \
  --region <your-region>
```

## Step 3: Deploy Infrastructure

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

# Wait for completion (~10-15 min):
aws cloudformation wait stack-create-complete \
  --stack-name cloud-demo-generator --region <your-region>
```

## Step 4: Build and Push Docker Image

```bash
aws ecr get-login-password --region <your-region> | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.<your-region>.amazonaws.com

docker build -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest \
  <account-id>.dkr.ecr.<your-region>.amazonaws.com/cloud-demo-generator-v3:latest
docker push <account-id>.dkr.ecr.<your-region>.amazonaws.com/cloud-demo-generator-v3:latest
```

## Step 5: Deploy Frontend to Amplify (optional, for HTTPS)

```bash
aws amplify create-app --name cloud-demo-generator-v3 --platform WEB --region <your-region>
aws amplify create-branch --app-id <app-id> --branch-name main --region <your-region>

# Build frontend with API URL:
VITE_API_URL=http://<alb-dns-name> \
VITE_COGNITO_USER_POOL_ID=<pool-id> \
VITE_COGNITO_CLIENT_ID=<client-id> \
  npx vite build

# Deploy:
cd dist/public && zip -r /tmp/frontend.zip .
# Use Amplify create-deployment + start-deployment APIs
```

## Step 6: Configure Environment Variables

Set these on the ECS task definition or in CloudFormation parameters:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by CloudFormation) |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `AMPLIFY_URL` | Amplify frontend URL (for ALB redirect) |

## Step 7: Create Admin User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <pool-id> \
  --username admin@example.com \
  --temporary-password TempPass1! \
  --message-action SUPPRESS \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true Name=name,Value=Admin \
  --region <your-region>

aws cognito-idp admin-set-user-password \
  --user-pool-id <pool-id> \
  --username admin@example.com \
  --password <permanent-password> \
  --permanent \
  --region <your-region>

aws cognito-idp admin-add-user-to-group \
  --user-pool-id <pool-id> \
  --username admin@example.com \
  --group-name admin \
  --region <your-region>
```

## Cleanup

```bash
aws cloudformation delete-stack --stack-name cloud-demo-generator --region <your-region>
aws cognito-idp delete-user-pool --user-pool-id <pool-id> --region <your-region>
aws ecr delete-repository --repository-name cloud-demo-generator-v3 --force --region <your-region>
aws amplify delete-app --app-id <app-id> --region <your-region>
```
