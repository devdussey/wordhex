# Deployment Guide

This project is split into a Vite-powered frontend and a lightweight Node.js backend.  
The recommended production setup deploys the frontend to **Vercel** and the backend to a managed Node.js host such as **Railway**.  
This guide focuses on the Vercel configuration because the backend can be deployed to any provider that supports Node.js + WebSocket.

---

## Vercel Frontend Deployment

### 1. Import the Repository
1. Sign in to [Vercel](https://vercel.com/) and click **New Project**.
2. Choose the Git provider that hosts `WordHexDiscord` and authorize access if requested.
3. Select the repository and click **Import**.

### 2. Build & Output Settings
Set the following values on the **Configure Project** screen (or later under **Settings → Build & Development**):

| Setting | Value | Notes |
| --- | --- | --- |
| **Framework Preset** | `Vite` | Automatically applies sensible defaults for Vite apps. |
| **Build Command** | `npm run build` | Matches the command defined in `package.json`. |
| **Install Command** | `npm install --include=dev` | Ensures development-only tooling (Prisma, Tailwind, etc.) is available during the build. |
| **Output Directory** | `dist` | Vite outputs static assets to `dist/`. |
| **Node.js Version** | `20.x` | Matches the version used locally (`.nvmrc`/`package.json` engines). |
| **Serverless Functions Region** | Choose the region closest to the majority of your players. | Reduces latency for API rewrites and WebSocket fallback. |

If you prefer to manage the settings as code, the repository stores them in [`package.json`](./package.json) under the `vercel`
key. Run `npm run sync:vercel` whenever you change that section to regenerate [`vercel.json`](./vercel.json) before pushing.
The configuration defines the required security headers and rewrites the `/api/*` path to the hosted backend.

### 3. Environment Variables
Add the same environment variables used in development (from `.env`).  
Minimum frontend variables:

| Variable | Description |
| --- | --- |
| `VITE_DISCORD_CLIENT_ID` | Discord client ID used by the embedded activity. |
| `VITE_API_URL` | Base URL of the deployed backend (e.g., `https://your-backend-domain/api`). |
| `VITE_WS_URL` | WebSocket URL for live gameplay (e.g., `wss://your-backend-domain/ws`). |
| `VITE_SERVER_ID` | Optional default Discord guild/server identifier. |

Remember to re-run the Vercel build whenever these variables change.

### 4. Production Domains
1. Set the **Production Branch** (usually `main`).
2. Assign custom domains if desired. Vercel automatically provisions HTTPS.
3. If you embed the app in Discord, ensure the chosen domain is added to your Discord application allow list.

### 5. Discord Frame Compatibility
Vercel serves the app with security headers defined in `vercel.json`.  
Confirm that the `X-Frame-Options: ALLOWALL` and `Content-Security-Policy` headers remain in place—Discord requires these settings for embedded activities to load correctly.

---

## Backend Deployment Notes

The backend is designed for hosts like Railway, Render, or Fly.io. Key commands:

```bash
npm run server    # Express + WebSocket server
npm run bot       # Optional Discord bot
```

Ensure the backend exposes the `/api` HTTP routes and `/ws` WebSocket endpoint, then update `VITE_API_URL` and `VITE_WS_URL` in Vercel to point to the deployed backend.

For database access, provision a PostgreSQL instance (e.g., Supabase or Railway) and set `DATABASE_URL` on the backend.  
Run migrations and seeds using:

```bash
npm run prisma:migrate
npm run prisma:seed
```

---

## Testing the Deployment

1. Visit the Vercel preview URL to confirm the lobby, matchmaking, and gameplay screens load.
2. Start a second session (or use Discord Activity sandbox) to verify WebSocket updates broadcast correctly.
3. Check the browser console for CORS or CSP errors. Adjust the backend allow list or security headers if needed.

You are now ready to share WordHex with your Discord community!
