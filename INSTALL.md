# Installation and Deployment Guide

This guide is ordered to minimize repetition:

1. Run locally with placeholder data and no backend.
2. Add Google login and backend session flow.
3. Deploy to AWS with CDK.

## 1) Initial Local Run (No Backend Yet)

### Prerequisites

- Nix with flakes enabled.
- AWS CLI is not required for local-only usage.

### Steps

1. Enter the dev shell:
```bash
nix develop
```

2. Install dependencies exactly from lockfile:
```bash
npm ci
```

3. Create local env file (you can leave OAuth values unset for this step):
```bash
cp .env.local.example .env.local
```

4. Start the frontend:
```bash
npm run dev
```

5. Open:
`http://127.0.0.1:5173`

Notes:
- The UI uses local placeholder data for games, competitors, and predictions.
- Backend endpoints are stubbed and will be wired later.

## 2) Add Google Integration

Google sign-in pairs with backend session endpoints (`/api/*`), so run both the frontend and local API server.

### Configure `.env.local`

Set:
```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

### Configure Google OAuth Client

1. Add authorized JavaScript origin:
`http://127.0.0.1:5173`
2. Ensure OAuth consent screen and test-user access are configured for your account.

### Run Frontend + Local API

Terminal A:
```bash
npm run dev:api
```

Terminal B:
```bash
npm run dev
```

Notes:
- Frontend calls `/api/*`; Vite proxies to `http://127.0.0.1:8787` by default.
- Local backend data is stored in memory (sessions + users) until persistence is wired.

## 3) Deploy to AWS (CDK)

### 3.1 Prerequisites and Account Setup

1. Create an AWS account if you do not already have one.
2. On the root user:
   - Enable MFA.
   - Do not use root access keys.
3. Create a deploy identity:
   - Either an IAM user (simplest to start) or a role-assumption setup.

### Recommended bootstrap path (simple first deploy)

Use an IAM deploy user/profile (for example `sport-rank-deployer`) with `AdministratorAccess` for the first bootstrap/deploy.
After first deploy succeeds, follow section 3.7 to reduce permissions.

```bash
aws configure --profile sport-rank-deployer
aws sts get-caller-identity --profile sport-rank-deployer
```

### Role-based path (if you prefer roles now)

1. Create IAM role `SportRankPredictionCdkDeployRole`.
2. Trust policy allows assumption by your IAM deploy user/group.
3. Attach permissions required for CDK bootstrap/deploy:
   - simplest: `AdministratorAccess` for initial setup.
   - tighten later to least privilege once your deployment pattern is stable.
4. Use `aws sts assume-role` or profile-based role assumption for deploy commands.

### 3.2 Region and Profile

Use a consistent profile and region for all CDK commands:

```bash
export AWS_PROFILE=sport-rank-deployer
export AWS_REGION=<REGION>
aws sts get-caller-identity
```

If identity lookup fails, fix auth first before running CDK.

### 3.3 Deployment Env Variables (`.env.local`)

Before deploy, ensure `.env.local` has the OAuth client IDs used by the frontend and backend:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

Set backend CORS allowed origins:
```bash
BACKEND_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173
```

Rules:
- Comma-separated origins.
- No trailing slash on each origin.

After first frontend deploy, append your CloudFront origin and redeploy backend.

Where to find it:
- In terminal output from `npm run deploy:all:dev` or `npm run deploy:dev`, under frontend stack outputs as `CloudFrontDomainName`.
- In AWS Console: CloudFormation -> stack `SportRankPredictionGame-dev` -> Outputs -> `CloudFrontDomainName`.

Example (correctly appended in `.env.local`):
```bash
BACKEND_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,https://abcde123456789.cloudfront.net
```

### 3.4 CDK Bootstrap (One-Time Per Account+Region)

`<ACCOUNT_ID>` is the AWS account number for the account where you created the deploy user/role in section 3.1.
You can confirm it with:
```bash
AWS_PROFILE=sport-rank-deployer aws sts get-caller-identity --query Account --output text
```

```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npx aws-cdk bootstrap aws://<ACCOUNT_ID>/<REGION>
```

### 3.5 Deploy

From repo root:

1. Deploy backend + frontend together (recommended):
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:all:dev
```

2. Alternative scripts:
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:backend:dev
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:dev
```

Stack names:
- `SportRankPredictionGameBackend-dev`
- `SportRankPredictionGame-dev`

### 3.6 CDK Outputs (What They Mean)

Backend stack outputs:
- `ApiBaseUrl`: API Gateway base URL.
- `AppTableName`: DynamoDB table name.
- `Environment`: deployment environment label (`dev`).

Frontend stack outputs:
- `CloudFrontDomainName`: public frontend URL host.
- `BucketName`: S3 bucket holding built frontend assets.
- `Environment`: deployment environment label (`dev`).

Usage:
- Open `https://<CloudFrontDomainName>` for the deployed app.
- Then update config to include this origin:
  - Add `https://<CloudFrontDomainName>` to Google OAuth authorized JavaScript origins.
  - Append `https://<CloudFrontDomainName>` to `BACKEND_CORS_ALLOWED_ORIGINS`.
- Redeploy backend after CORS update:
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:backend:dev
```

### 3.7 Reduce Deployer Permissions (After First Successful Deploy)

After bootstrap and first deploy are confirmed, replace broad admin permissions on the deploy role/user with a narrower policy.

Use the interactive generator:
```bash
node scripts/generate-aws-deployer-policy.mjs
```

The script asks for:
- AWS account ID.
- Primary region.
- CDK bootstrap qualifier.
- Backend Lambda name prefix.

Notes:
- `hnb659fds` is the default CDK bootstrap qualifier used in bootstrap resource names.
- Keep `hnb659fds` unless you bootstrapped CDK with a custom qualifier.
- The script reads `aws_deployer_role_template.json`, fills placeholders, validates JSON, and prints policy JSON ready to paste into AWS IAM.

Apply it in AWS:
1. Open IAM and edit the policy attached to your deploy role/user.
2. Replace broad bootstrap permissions (for example `AdministratorAccess`) with the generated policy.
3. Keep trust policy/assume-role configuration unchanged.
4. Test deploy again with:
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:all:dev
```

### 3.8 Update Deployments (Later Upgrades)

For future updates:

1. Update code and `.env.local` as needed.
2. Redeploy:
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run deploy:all:dev
```

If only backend config changed (for example CORS origins), backend-only deploy is enough.

### 3.9 Teardown

Destroy both stacks:
```bash
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run destroy:backend:dev
AWS_PROFILE=sport-rank-deployer AWS_REGION=<REGION> npm run destroy:dev
```
