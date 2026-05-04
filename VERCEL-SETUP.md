# Quick Vercel Setup Guide

## 🚀 Deploy in 3 Steps

### Step 1: Add Environment Variable in Vercel

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Add this variable:

```
Name: APP_PASSWORD
Value: 123456
Environment: Production, Preview, Development
```

**Important**: Change `123456` to your own 6-digit code!

### Step 2: Add Your Treez API Credentials

Add these required variables:

```
TREEZ_CERT_ID = your-certificate-id
TREEZ_ORG_ID = your-organization-id
TREEZ_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nyour-key-here\n-----END PRIVATE KEY-----
```

### Step 3: Deploy

1. Click **Deploy** or push to your git branch
2. Wait for deployment to complete
3. Visit your app URL

## 🔐 What Happens Next

1. **First Visit**: You'll see a beautiful green password screen
2. **Enter Code**: Type or paste your 6-digit password
3. **Auto-Submit**: Code validates automatically when all 6 digits are entered
4. **Dashboard**: You're redirected to the discount dashboard
5. **Remember**: Cookie stays active for 30 days

## 🎨 Password Screen Features

- ✅ Beautiful animated gradient background
- ✅ 6 individual digit input boxes
- ✅ Auto-focus next box as you type
- ✅ Paste support (paste entire 6-digit code)
- ✅ Keyboard navigation (arrows, backspace)
- ✅ Auto-submit when complete
- ✅ Error shake animation for wrong password
- ✅ Loading state during verification

## 🔄 How to Logout (Optional)

Users can logout manually by:
1. Clearing browser cookies
2. Using the `<LogoutButton />` component (if added to UI)

To add logout button to your dashboard:

```tsx
import { LogoutButton } from "@/components/logout-button"

// Add this to your header/sidebar:
<LogoutButton />
```

## 🛠️ Testing Locally

1. Create `.env.local`:
```bash
APP_PASSWORD=123456
TREEZ_CERT_ID=your-cert-id
TREEZ_ORG_ID=your-org-id
# ... other Treez variables
```

2. Run dev server:
```bash
npm run dev
```

3. Visit `http://localhost:3000` → You'll see the password screen

4. Enter `123456` → You'll be redirected to dashboard

## 🔒 Security Notes

- Password is stored as environment variable (keep it secret!)
- Session stored in HTTP-only cookie (30-day expiry)
- All routes protected except auth API
- Middleware runs before every request
- No password in client-side code

## ⚠️ Troubleshooting

**Problem**: "Authentication not configured" error
- **Solution**: Make sure `APP_PASSWORD` is set in Vercel environment variables

**Problem**: Can't login even with correct password
- **Solution**: Check Vercel deployment logs for errors
- **Solution**: Make sure environment variable is set for the correct environment (Production/Preview)

**Problem**: Password screen doesn't show
- **Solution**: Clear browser cache and cookies
- **Solution**: Check middleware is running (should see "Proxy (Middleware)" in build output)

**Problem**: Need to change password
- **Solution**: Update `APP_PASSWORD` in Vercel, redeploy
- **Solution**: All users will need to re-authenticate

## 📱 Mobile Support

The password screen is fully responsive and works great on:
- Desktop browsers
- Mobile Safari (iOS)
- Mobile Chrome (Android)
- Tablets

The numeric keyboard will automatically appear on mobile devices.

## 🎯 Next Steps

After deployment:
1. Test the password screen works
2. Verify dashboard access
3. Share the 6-digit code securely with your team
4. Consider adding logout button to your UI
5. Monitor Vercel logs for any authentication issues

## 💡 Pro Tips

- Use a memorable 6-digit code (not 123456!)
- Don't share the password publicly
- Rotate the password periodically for security
- Use different passwords for dev/staging/production
- Keep your `.env.local` file in `.gitignore` (it already is)
