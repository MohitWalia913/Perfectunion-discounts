# Deployment Guide - Vercel

## Setting up Password Protection on Vercel

### Step 1: Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Vercel will automatically detect it's a Next.js project

### Step 2: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

#### Required - Password Protection
```
APP_PASSWORD = your-6-digit-code
```
Example: `123456` or `987654`

#### Required - Treez API
```
TREEZ_CERT_ID = your-certificate-id-uuid
TREEZ_ORG_ID = your-organization-id-uuid
TREEZ_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

Or use file-based key:
```
TREEZ_PRIVATE_KEY_FILE = .treez/private.pem
```

#### Optional
```
TREEZ_DISPENSARY = your_dispensary_subdomain
TREEZ_API_BASE = https://api-prod.treez.io
```

### Step 3: Deploy

After adding environment variables:
1. Trigger a new deployment (or it will auto-deploy)
2. Your app will now be protected with your 6-digit password

## How Password Protection Works

1. **First Visit**: Users see a beautiful password entry screen
2. **Authentication**: Enter the 6-digit code set in `APP_PASSWORD`
3. **Session**: Cookie is set for 30 days - no need to re-enter
4. **Logout**: Clear browser cookies or change browser to require re-authentication

## Security Notes

- The password is stored as a plain environment variable in Vercel
- Authentication state is maintained via HTTP-only cookies
- Cookies expire after 30 days
- All routes except `/api/auth/verify` are protected
- Middleware handles authentication checks before any page loads

## Testing Locally

1. Copy `env.example` to `.env.local`
2. Set your `APP_PASSWORD` (6 digits recommended)
3. Run `npm run dev`
4. Visit `http://localhost:3000`
5. You'll be redirected to `/auth` to enter the password

## Changing the Password

To change the password:
1. Update `APP_PASSWORD` in Vercel Environment Variables
2. Redeploy (or wait for auto-deploy)
3. All users will need to re-authenticate with the new password
