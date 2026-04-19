# Deployment Guide — Cloud Demo Generator v3

## Live App

**URL:** http://demo-gen-alb-29620839.us-east-2.elb.amazonaws.com

**Test credentials:**
- Email: `demo@example.com`
- Password: `DemoUser2026!`

## Architecture

```
Internet → ALB (public subnets) → ECS Fargate (private subnets) → RDS PostgreSQL (private subnets)
                                                                ↕
                                                         Cognito User Pool
```

## AWS Resources (sundaar4 / 633384844157 / us-east-2)

| Resource | ID/Name |
|----------|---------|
| CloudFormation Stack | `cloud-demo-generator-v3` |
| Cognito User Pool | `us-east-2_sndKJLxLR` |
| Cognito Client ID | `4bm8gt0i2of69v9g0vm5nnh2k0` |
| RDS PostgreSQL 16.13 | `demo-gen-db` (private, encrypted) |
| ECS Cluster | `demo-gen-cluster` |
| ECS Service | `demo-gen-service` (Fargate, 256 CPU / 512 MB) |
| ALB | `demo-gen-alb` |
| ECR | `cloud-demo-generator-v3` |
| VPC | 10.0.0.0/16 (2 public + 2 private subnets) |

## Epoxy/Orthanc Compliance

- ✅ RDS NOT publicly accessible — won't trigger `personal-orthanc-rds-publicly-accessible`
- ✅ ECS tasks in private subnets with NAT Gateway
- ✅ Security groups: ALB → ECS → RDS (least privilege)
- ✅ RDS storage encrypted
- ✅ ECR image scanning on push
- ✅ No EC2 instances — Fargate only

## Redeploying

```bash
# 1. Federate
# https://isengard.amazon.com/federate?account=633384844157&role=Admin

# 2. Build and push Docker image
cd cloud-demo-generator-v3
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin 633384844157.dkr.ecr.us-east-2.amazonaws.com
docker build -t cloud-demo-generator-v3 .
docker tag cloud-demo-generator-v3:latest \
  633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest
docker push 633384844157.dkr.ecr.us-east-2.amazonaws.com/cloud-demo-generator-v3:latest

# 3. Force ECS to pick up new image
aws ecs update-service --cluster demo-gen-cluster --service demo-gen-service \
  --force-new-deployment --region us-east-2
```

## Cleanup

```bash
aws cloudformation delete-stack --stack-name cloud-demo-generator-v3 --region us-east-2
aws cognito-idp delete-user-pool --user-pool-id us-east-2_sndKJLxLR --region us-east-2
aws ecr delete-repository --repository-name cloud-demo-generator-v3 --force --region us-east-2
```
