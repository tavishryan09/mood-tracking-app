# Vercel Deployment Guide

## Overview
This guide will help you deploy your mood-tracking app to Vercel. Due to the nature of your app (Expo client + Express server), we'll use a **split deployment strategy**:

- **Frontend (Client)**: Deploy to Vercel
- **Backend (Server)**: Deploy to Railway or Render (recommended for Express + PostgreSQL)

---

## Prerequisites

1. GitHub account
2. Vercel account (https://vercel.com)
3. Railway account (https://railway.app) OR Render account (https://render.com)

---

## PART 1: Prepare Your Code for Deployment

### Step 1: Initialize Git Repository (if not already done)

```bash
cd /Users/tavishkeegan/Desktop/mood-tracking-app
git init
git add .
git commit -m "Initial commit for deployment"
```

### Step 2: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., "mood-tracking-app")
3. **Do NOT initialize with README** (you already have code)
4. Copy the repository URL

### Step 3: Push Your Code to GitHub

```bash
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

---

## PART 2: Deploy Backend (Server) to Railway

### Why Railway?
- Easy PostgreSQL setup
- Automatic environment variables
- Free tier available
- Built-in deployment pipelines

### Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy PostgreSQL Database

1. Click "+ New" → "Database" → "PostgreSQL"
2. Railway will automatically create a database
3. Note: The `DATABASE_URL` will be automatically set as an environment variable

### Step 3: Deploy Your Server

1. Click "+ New" → "GitHub Repo"
2. Select your `mood-tracking-app` repository
3. Railway will detect it's a Node.js app

### Step 4: Configure Server Deployment

1. In Railway, click on your service
2. Go to "Settings" → "Root Directory"
3. Set Root Directory to: `server`
4. Go to "Settings" → "Start Command"
5. Set to: `npm run build && npm run start`

### Step 5: Add Environment Variables

In Railway, go to "Variables" and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=(automatically set by Railway PostgreSQL)
```

**Important**: The `DATABASE_URL` is automatically set when you add PostgreSQL database in Railway.

### Step 6: Run Database Migration

1. In Railway, go to your server service
2. Open the deployment logs
3. You'll need to run Prisma migrations

**Option A**: Add to package.json build script:
```json
"build": "prisma generate && prisma migrate deploy && tsc"
```

**Option B**: Use Railway's one-time command (in Settings → Deploy):
```bash
npx prisma migrate deploy
```

### Step 7: Get Your API URL

Once deployed, Railway will give you a URL like:
```
https://your-app.up.railway.app
```

**Save this URL** - you'll need it for the frontend!

---

## PART 3: Deploy Frontend (Client) to Vercel

### Step 1: Prepare Client for Web Deployment

Your Expo app needs a few modifications for Vercel.

### Step 2: Update Client API Configuration

Update `client/src/services/api.ts` to use your Railway backend URL:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'https://your-app.up.railway.app';
```

### Step 3: Create Vercel Configuration

Create `vercel.json` in your ROOT directory (I'll do this for you):

```json
{
  "buildCommand": "cd client && npm install && npx expo export:web",
  "outputDirectory": "client/dist",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Step 4: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect settings
4. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
npm i -g vercel
cd /Users/tavishkeegan/Desktop/mood-tracking-app
vercel
```

Follow the prompts:
- Set up and deploy? Yes
- Which scope? Your account
- Link to existing project? No
- Project name? mood-tracking-app
- In which directory is your code located? ./
- Override settings? Yes
  - Build Command: `cd client && npx expo export:web`
  - Output Directory: `client/dist`
  - Install Command: `cd client && npm install`

### Step 5: Configure Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Environment Variables"
3. Add:

```
REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
```

**Replace with your actual Railway URL!**

### Step 6: Redeploy

After adding environment variables:
1. Go to "Deployments"
2. Click the three dots on latest deployment
3. Click "Redeploy"

---

## PART 4: Post-Deployment Configuration

### Update CORS in Your Server

In `server/src/index.ts`, update CORS to allow your Vercel domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006',
    'https://your-vercel-app.vercel.app', // Add your Vercel URL
    'https://*.vercel.app' // Allow all Vercel preview deployments
  ],
  credentials: true
}));
```

Push this change to GitHub, and Railway will auto-deploy.

---

## PART 5: Testing Your Deployment

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Try to register/login
3. Check browser console for any API errors
4. If you see CORS errors, double-check Step 4 above

---

## Troubleshooting

### Problem: "Cannot connect to API"

**Solution:**
1. Check that Railway server is running (check Railway dashboard)
2. Verify `REACT_APP_API_URL` in Vercel environment variables
3. Check CORS settings in your server

### Problem: "Database connection error"

**Solution:**
1. Ensure Railway PostgreSQL is running
2. Check `DATABASE_URL` in Railway variables
3. Run `npx prisma migrate deploy` in Railway

### Problem: "Build failed on Vercel"

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure `expo export:web` works locally:
   ```bash
   cd client
   npx expo export:web
   ```

### Problem: "Prisma Client not generated"

**Solution:**
Add `postinstall` script to `server/package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

---

## Alternative: Deploy Server to Render

If you prefer Render over Railway:

1. Go to https://render.com
2. Create New → Web Service
3. Connect your GitHub repo
4. Set:
   - Root Directory: `server`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start`
5. Add PostgreSQL database (Render → Create PostgreSQL)
6. Link database to your web service
7. Add environment variables

---

## Summary of URLs

After deployment, you'll have:

1. **Frontend**: `https://your-app.vercel.app`
2. **Backend API**: `https://your-app.railway.app` or `https://your-app.onrender.com`
3. **Database**: Managed by Railway/Render

---

## Next Steps

1. Set up custom domain (optional)
2. Enable automatic deployments from GitHub
3. Set up monitoring and logging
4. Configure production environment variables

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
