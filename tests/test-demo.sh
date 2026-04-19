#!/bin/bash
# =============================================================================
# End-to-End Test Script for Generated Demos
# Tests: CloudFormation deploy → SSH → DB setup → App run → Cleanup
#
# Usage:
#   ./test-demo.sh <demo-zip> <key-pair-name> <region>
#
# Example:
#   ./test-demo.sh samples/pgvector-hybrid-search-demo.zip my-keypair us-west-2
# =============================================================================

set -e

ZIP_FILE="${1:?Usage: ./test-demo.sh <demo.zip> <keypair> <region>}"
KEY_PAIR="${2:?Provide EC2 key pair name}"
REGION="${3:-us-west-2}"
KEY_FILE="${4:-${HOME}/.ssh/${KEY_PAIR}.pem}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS: $1${NC}"; }
fail() { echo -e "${RED}❌ FAIL: $1${NC}"; FAILURES=$((FAILURES+1)); }
info() { echo -e "${YELLOW}→ $1${NC}"; }

FAILURES=0
TMPDIR=$(mktemp -d)
STACK_NAME=""

cleanup() {
  if [ -n "$STACK_NAME" ]; then
    info "Cleaning up stack: $STACK_NAME"
    aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null || true
  fi
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

# ── Step 1: Unzip ──
info "Step 1: Unzipping $ZIP_FILE"
unzip -q -o "$ZIP_FILE" -d "$TMPDIR"

# Verify required files exist
for FILE in app.py cloudformation/main.yaml cloudformation/parameters.json database/setup.sql requirements.txt; do
  if [ -f "$TMPDIR/$FILE" ]; then
    pass "File exists: $FILE"
  else
    fail "Missing file: $FILE"
  fi
done

# Verify modules exist
MODULE_COUNT=$(find "$TMPDIR/modules" -name "README.md" 2>/dev/null | wc -l)
if [ "$MODULE_COUNT" -ge 5 ]; then
  pass "Learning modules: $MODULE_COUNT found"
else
  fail "Expected 5+ modules, found $MODULE_COUNT"
fi

# ── Step 2: Validate CloudFormation ──
info "Step 2: Validating CloudFormation template"
aws cloudformation validate-template \
  --template-body "file://$TMPDIR/cloudformation/main.yaml" \
  --region "$REGION" > /dev/null 2>&1 && pass "CloudFormation template valid" || fail "CloudFormation template invalid"

# Check for known issues
if grep -q "DBEndpoint" "$TMPDIR/cloudformation/main.yaml"; then
  pass "Fn::Sub uses DBEndpoint variable map (fixed)"
else
  fail "CloudFormation still uses old DatabaseCluster.Endpoint.Address in Fn::Sub"
fi

if grep -q "FindInMap.*RegionAMI" "$TMPDIR/cloudformation/main.yaml"; then
  pass "AMI uses region mapping (not hardcoded)"
else
  fail "AMI is hardcoded (should use RegionAMI mapping)"
fi

if grep -q "db.t4g.medium" "$TMPDIR/cloudformation/main.yaml"; then
  pass "Instance type is Aurora-compatible (db.t4g.medium+)"
else
  fail "Instance type may not be Aurora-compatible"
fi

# ── Step 3: Deploy CloudFormation ──
STACK_NAME="test-$(basename "$ZIP_FILE" .zip)-$(date +%s)"
info "Step 3: Deploying stack: $STACK_NAME (this takes ~15 min)"

aws cloudformation deploy \
  --template-file "$TMPDIR/cloudformation/main.yaml" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    ProjectName="$STACK_NAME" \
    KeyPairName="$KEY_PAIR" \
    PostgreSQLVersion=16.6 \
    DatabaseInstanceType=db.t4g.medium \
    BastionInstanceType=t3.micro \
  --capabilities CAPABILITY_IAM \
  --region "$REGION" \
  --no-fail-on-empty-changeset 2>&1 && pass "CloudFormation deployed" || { fail "CloudFormation deploy failed"; exit 1; }

# Get outputs
BASTION_IP=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`BastionPublicIP`].OutputValue' --output text)
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' --output text)

info "Bastion IP: $BASTION_IP"
info "DB Endpoint: $DB_ENDPOINT"

if [ -n "$BASTION_IP" ] && [ "$BASTION_IP" != "None" ]; then
  pass "Bastion host created with public IP"
else
  fail "No bastion IP in outputs"
fi

if [ -n "$DB_ENDPOINT" ] && [ "$DB_ENDPOINT" != "None" ]; then
  pass "Aurora cluster created"
else
  fail "No database endpoint in outputs"
fi

# ── Step 4: SSH and test ──
info "Step 4: Testing SSH connectivity (waiting 60s for instance boot)"
sleep 60

SSH_CMD="ssh -i $KEY_FILE -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@$BASTION_IP"

$SSH_CMD "echo 'SSH works'" 2>/dev/null && pass "SSH to bastion works" || fail "SSH to bastion failed"

# ── Step 5: Test database connectivity from bastion ──
info "Step 5: Testing database connectivity from bastion"
DB_URL="postgresql://postgres:${DB_PASSWORD:-ChangeMe123!}@${DB_ENDPOINT}:5432/postgres"

$SSH_CMD "psql '$DB_URL' -c 'SELECT version()'" 2>/dev/null && pass "Database connection works" || fail "Database connection failed"

# ── Step 6: Run setup SQL ──
info "Step 6: Running database setup"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no "$TMPDIR/database/setup.sql" "ec2-user@$BASTION_IP:/tmp/" 2>/dev/null
$SSH_CMD "psql '$DB_URL' -f /tmp/setup.sql" 2>/dev/null && pass "Database setup completed" || fail "Database setup failed"

# ── Step 7: Copy and run app ──
info "Step 7: Testing application"
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -r "$TMPDIR/app.py" "$TMPDIR/requirements.txt" "ec2-user@$BASTION_IP:/tmp/" 2>/dev/null
$SSH_CMD "cd /tmp && pip3 install -q -r requirements.txt 2>/dev/null && timeout 10 python3 -c 'import app; print(\"App imports OK\")'" 2>/dev/null \
  && pass "Application imports successfully" || fail "Application import failed"

# ── Summary ──
echo ""
echo "============================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC}"
else
  echo -e "${RED}$FAILURES TEST(S) FAILED${NC}"
fi
echo "============================================"
echo ""
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""
echo "To clean up:"
echo "  aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION"
echo ""

exit $FAILURES
