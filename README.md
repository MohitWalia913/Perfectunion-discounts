This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Perfect Union Discount Manager

A secure portal for managing Perfect Union dispensary discounts via the Treez API.

## Setup

1. Copy `env.example` to `.env.local` and configure your environment variables:
   - `APP_PASSWORD` - Set your 6-digit access code for the portal
   - `TREEZ_CERT_ID` - Your Treez certificate ID
   - `TREEZ_ORG_ID` - Your Treez organization ID
   - Other Treez API credentials as needed

2. Install dependencies:
```bash
npm install
```

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Features

- 🔐 **Password Protection** - Secure 6-digit code entry screen
- 💾 **Persistent Sessions** - Authentication stored in cookies (30-day expiry)
- 🎨 **Beautiful UI** - Modern, animated password entry interface
- 🔄 **Auto-submit** - Password validates automatically when 6 digits entered
- 📋 **Paste Support** - Paste 6-digit codes directly
- 🛡️ **Secure** - HTTP-only cookies, middleware-based protection

## Password Protection

The entire app is protected by a 6-digit password configured via environment variables. Users only need to enter it once per browser/device (stored in cookies for 30 days).

To clear authentication:
- Clear browser cookies
- Change browser/device
- Wait 30 days for automatic expiry

## Deploy on Vercel

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Setting up the 6-digit password in Vercel
- Configuring Treez API credentials
- Environment variable setup

Quick deploy: [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
