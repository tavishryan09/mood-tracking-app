# Neon + Vercel Full Deployment Guide

This guide will walk you through deploying your entire app to Vercel using Neon as your database.

## Architecture

- **Frontend**: Expo Web → Vercel Static Hosting
- **Backend**: Express → Vercel Serverless Functions
- **Database**: Neon (Serverless PostgreSQL)

---

## Step 1: Set Up Neon Database

### 1.1 Create Neon Account

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up (free tier available - 0.5 GB storage, 1 compute hour/month)
3. Verify your email

### 1.2 Create Database Project

1. Click "Create a project"
2. Fill in details:
   - **Project name**: `mood-tracking-app` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., US East, EU West)
   - **PostgreSQL version**: 16 (latest)
3. Click "Create Project"

### 1.3 Get Connection String

1. Once created, go to **Dashboard** → **Connection Details**
2. Copy the **connection string** - it looks like:
   ```
   postgresql://username:password@ep-xxxxx-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **Save this somewhere safe** - you'll need it for Vercel!

**Important Notes:**
- The connection string includes `?sslmode=require` - this is required for Neon
- If you need connection pooling (recommended for serverless), add `&pgbouncer=true`

---

## Step 2: Prepare Your Code for Git

### 2.1 Create .gitignore (if not exists)

Make sure you have a `.gitignore` file in your root directory with:

```
# Dependencies
node_modules/
client/node_modules/
server/node_modules/

# Environment variables
.env
.env.local
server/.env

# Build outputs
client/dist/
server/dist/
.expo/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

### 2.2 Initialize Git Repository

```bash
cd /Users/tavishkeegan/Desktop/mood-tracking-app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - ready for Vercel deployment"
```

### 2.3 Create GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)
2. Create a new repository:
   - **Name**: `mood-tracking-app` (or your preferred name)
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README (you already have code)
3. Click "Create repository"

### 2.4 Push Code to GitHub

Copy the commands from GitHub (they'll look like this):

```bash
git remote add origin https://github.com/YOUR_USERNAME/mood-tracking-app.git
git branch -M main
git push -u origin main
```

---

## Step 3: Run Database Migration to Neon

Before deploying, let's set up your database schema in Neon.

### 3.1 Update Local .env

Create/update `server/.env` with your Neon connection string:

```env
DATABASE_URL="postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-this-to-something-random"
NODE_ENV="development"
```

### 3.2 Run Prisma Migration

```bash
cd server

# Generate Prisma client
npx prisma generate

# Push schema to Neon database
npx prisma db push

# Or create a migration (recommended for production)
npx prisma migrate deploy
```

### 3.3 Verify Database Setup

```bash
# Open Prisma Studio to view your database
npx prisma studio
```

You should see all your tables (User, Project, Client, TimeEntry, etc.) in Prisma Studio.

---

## Step 4: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended - Easiest)

#### 4.1 Go to Vercel

1. Visit [https://vercel.com/new](https://vercel.com/new)
2. Sign up/login with GitHub

#### 4.2 Import Repository

1. Click "Import Git Repository"
2. Select your `mood-tracking-app` repository
3. Click "Import"

#### 4.3 Configure Project

Vercel should auto-detect your `vercel.json` settings, but verify:

- **Framework Preset**: Other
- **Root Directory**: `./`
- **Build Command**: `cd client && npm install && npx expo export:web`
- **Output Directory**: `client/dist`

#### 4.4 Add Environment Variables

This is **CRITICAL** - click "Environment Variables" and add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | Your Neon connection string from Step 1.3 |
| `JWT_SECRET` | A strong random secret (min 32 characters) |
| `NODE_ENV` | `production` |

**Example:**
```
DATABASE_URL=postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
JWT_SECRET=your-super-secret-random-string-min-32-chars
NODE_ENV=production
```

#### 4.5 Deploy

1. Click "Deploy"
2. Wait 2-5 minutes for build to complete
3. You'll get a URL like: `https://your-app.vercel.app`

---

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project root
cd /Users/tavishkeegan/Desktop/mood-tracking-app
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? mood-tracking-app
# - In which directory? ./
# - Override settings? No (vercel.json will be used)

# Add environment variables
vercel env add DATABASE_URL
# Paste your Neon connection string

vercel env add JWT_SECRET
# Enter your secret key

vercel env add NODE_ENV
# Enter: production

# Deploy to production
vercel --prod
```

---

## Step 5: Verify Deployment

### 5.1 Test API Endpoint

Visit: `https://your-app.vercel.app/health`

You should see:
```json
{"status":"OK","message":"Server is running"}
```

### 5.2 Test Frontend

1. Go to: `https://your-app.vercel.app`
2. You should see your login screen
3. Try logging in with existing credentials

### 5.3 Check Vercel Logs

If something doesn't work:
1. Go to Vercel Dashboard → Your Project
2. Click "Functions" tab to see serverless function logs
3. Click "Deployments" to see build logs

---

## Step 6: Post-Deployment Tasks

### 6.1 Update CORS (If Needed)

Your API already handles Vercel CORS automatically via the `api/index.ts` file, which includes:
- `process.env.VERCEL_URL`
- `*.vercel.app` wildcard

No changes needed unless you have a custom domain!

### 6.2 Create Admin User (First Time Setup)

You'll need to create your first admin user directly in the database:

```bash
# From your local machine, connected to Neon database
cd server
npx prisma studio
```

1. Open the `User` table
2. Click "Add Record"
3. Fill in:
   - `email`: your email
   - `password`: Run this in Node.js to hash a password:
     ```javascript
     const bcrypt = require('bcryptjs');
     const hash = bcrypt.hashSync('your-password', 10);
     console.log(hash);
     ```
   - `name`: Your name
   - `role`: `ADMIN`
   - `isActive`: `true`

### 6.3 Test Full Workflow

1. Login with admin user
2. Create a client
3. Create a project
4. Add a time entry
5. Test planning feature

---

## Environment Variables Reference

### Required Environment Variables for Vercel:

```env
DATABASE_URL=postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
JWT_SECRET=minimum-32-character-random-string-for-security
NODE_ENV=production
```

### Optional (for email features):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

---

## Project Structure (Final)

```
mood-tracking-app/
├── api/                        # Vercel serverless functions
│   └── index.ts               # Main API handler
├── client/                    # Frontend (Expo Web)
│   ├── src/
│   └── package.json
├── server/                    # Backend code (used by api/)
│   ├── src/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── package.json               # Root package.json with server deps
├── vercel.json                # Vercel configuration
└── .gitignore
```

---

## Troubleshooting

### Problem: "Database connection error"

**Solution:**
1. Check DATABASE_URL in Vercel environment variables
2. Make sure it includes `?sslmode=require`
3. Verify Neon database is active (check Neon dashboard)
4. Try adding `&pgbouncer=true` for connection pooling

### Problem: "Prisma Client not found"

**Solution:**
1. Check that `postinstall` script runs in `package.json`
2. Redeploy with: `vercel --prod --force`
3. Check build logs in Vercel dashboard

### Problem: "CORS error"

**Solution:**
1. Check that you're using the correct Vercel URL
2. Verify `api/index.ts` has proper CORS configuration
3. Clear browser cache and try again

### Problem: "Function timeout"

**Solution:**
1. Check Neon database isn't paused (auto-pauses after inactivity)
2. Add connection pooling: `&pgbouncer=true`
3. Increase function timeout in `vercel.json` (already set to 10s)

### Problem: "Module not found" errors

**Solution:**
1. Make sure all dependencies are in root `package.json`
2. Check that TypeScript compiles without errors locally
3. Verify file paths in `api/index.ts` are correct

---

## Neon-Specific Features

### Connection Pooling

For better performance with serverless functions, use PgBouncer:

```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
```

### Database Branching

Neon allows you to create database branches for testing:
1. Go to Neon Dashboard
2. Click "Branches"
3. Create a new branch for staging/testing

### Auto-Pause

Neon automatically pauses your database after 5 minutes of inactivity to save resources. First request after pause may be slower (cold start).

### Monitoring

- Go to Neon Dashboard → Monitoring
- View queries, connections, and performance metrics

---

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Enable automatic deployments from GitHub (already enabled)
3. ✅ Set up preview deployments for branches
4. ✅ Monitor application performance
5. ✅ Set up error tracking (Sentry, LogRocket, etc.)
6. ✅ Configure backup strategy in Neon

---

## Cost Estimate

### Neon Free Tier:
- 0.5 GB storage
- 1 compute hour/month
- Perfect for development/testing

### Neon Pro ($19/month):
- 10 GB storage included
- Unlimited compute hours
- Better for production

### Vercel Free Tier:
- 100 GB bandwidth
- Unlimited deployments
- Serverless function executions

### Vercel Pro ($20/month):
- 1 TB bandwidth
- More serverless function execution time

---

## Support Resources

- **Neon Docs**: https://neon.tech/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Neon Discord**: https://discord.gg/neon
- **Vercel Discord**: https://discord.gg/vercel

---

## Summary

You've successfully deployed your mood tracking app to Vercel with Neon database! 🎉

Your app is now:
- ✅ Hosted on Vercel's global CDN
- ✅ Using Neon's serverless PostgreSQL
- ✅ Running serverless functions for the API
- ✅ Automatically deploying on git push
- ✅ Scalable and production-ready

**Your URLs:**
- Frontend: `https://your-app.vercel.app`
- API: `https://your-app.vercel.app/api`
- Health Check: `https://your-app.vercel.app/health`
