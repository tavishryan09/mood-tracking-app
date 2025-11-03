# Deployment Guide with Neon Database

## Overview
Deploy your app using:
- **Database**: Neon (Serverless PostgreSQL)
- **Backend**: Vercel Serverless Functions OR Railway
- **Frontend**: Vercel

---

## OPTION 1: Full Vercel Deployment (Recommended)

Deploy everything to Vercel using Neon database and serverless functions.

### Step 1: Set Up Neon Database

1. **Go to**: https://neon.tech
2. **Sign up** (free tier available)
3. **Create a new project**:
   - Project name: `mood-tracking-app`
   - Region: Choose closest to your users
   - PostgreSQL version: Latest
4. **Get your connection string**:
   - Go to Dashboard → Connection Details
   - Copy the **connection string** (it looks like):
   ```
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   - **Save this** - you'll need it!

### Step 2: Update Your Server for Vercel Serverless

Since you're using Neon, we can deploy your Express server as Vercel serverless functions.

Create a new file `api/index.ts` that will be your serverless entry point.

### Step 3: Initialize Git and Push to GitHub

```bash
cd /Users/tavishkeegan/Desktop/mood-tracking-app

# Initialize git (if not already done)
git init
git add .
git commit -m "Prepare for Vercel deployment with Neon"

# Create repo on GitHub, then:
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### Step 4: Update Environment Variables

Create/update `.env` in your server directory for local development:

```env
DATABASE_URL="your-neon-connection-string-here"
JWT_SECRET="your-super-secret-jwt-key-change-this"
NODE_ENV="development"
```

**IMPORTANT**: Make sure `.env` is in your `.gitignore`!

### Step 5: Test Database Connection Locally

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations to Neon database
npx prisma migrate deploy

# Or if you want to create a new migration:
npx prisma migrate dev --name init
```

### Step 6: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. **Go to**: https://vercel.com/new
2. **Import your GitHub repository**
3. **Configure the project**:
   - Framework Preset: Other
   - Root Directory: `./`
4. **Add Environment Variables** (VERY IMPORTANT):
   Click "Environment Variables" and add:

   ```
   DATABASE_URL=your-neon-connection-string-with-?sslmode=require
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ```

5. **Click Deploy**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd /Users/tavishkeegan/Desktop/mood-tracking-app
vercel

# Follow prompts, then add environment variables:
vercel env add DATABASE_URL
# Paste your Neon connection string

vercel env add JWT_SECRET
# Enter your secret key

vercel env add NODE_ENV
# Enter: production

# Redeploy with environment variables
vercel --prod
```

### Step 7: Update Your vercel.json

I'll update the vercel.json to work with both frontend and backend.

### Step 8: Configure CORS

The server will automatically allow your Vercel frontend URL, but verify in `server/src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
    'https://*.vercel.app'
  ].filter(Boolean),
  credentials: true
}));
```

---

## OPTION 2: Split Deployment (Railway + Vercel)

Use Neon database with Railway backend and Vercel frontend.

### Step 1: Set Up Neon Database

(Same as Option 1, Step 1)

### Step 2: Deploy Server to Railway

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **Create new project** → "Deploy from GitHub repo"
4. **Select** your `mood-tracking-app` repository
5. **Configure Railway**:
   - Go to Settings → Root Directory: `server`
   - Go to Settings → Start Command: `npm run build && npm run start`
6. **Add Environment Variables**:
   ```
   DATABASE_URL=your-neon-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ```
7. **Get your Railway URL**: `https://your-app.up.railway.app`

### Step 3: Run Database Migrations

In Railway, you need to run migrations:

**Option A**: Add to build command in Railway settings:
```
npm run build && npx prisma migrate deploy
```

**Option B**: Use Railway CLI:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npx prisma migrate deploy
```

### Step 4: Deploy Frontend to Vercel

1. **Go to**: https://vercel.com/new
2. **Import your GitHub repository**
3. **Add Environment Variable**:
   ```
   REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
   ```
4. **Deploy**

---

## Database Migration Commands

### Running Migrations to Neon

```bash
# Development - creates migration files
cd server
npx prisma migrate dev --name your_migration_name

# Production - applies existing migrations
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio to view your Neon data
npx prisma studio
```

### Common Neon Issues

**Problem**: "SSL connection required"
**Solution**: Add `?sslmode=require` to your DATABASE_URL:
```
postgresql://user:pass@host/db?sslmode=require
```

**Problem**: "Too many connections"
**Solution**: Neon free tier has connection limits. Use connection pooling:
```
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
```

---

## Vercel Serverless Configuration

For full Vercel deployment (Option 1), your project structure should be:

```
mood-tracking-app/
├── api/                    # Serverless functions (I'll create this)
│   └── index.ts           # Main API entry point
├── client/                # Frontend
├── server/                # Server code (used to generate serverless functions)
├── vercel.json            # Vercel configuration
└── package.json           # Root package.json (I'll create this)
```

---

## Environment Variables Summary

### Neon Database
```
DATABASE_URL=postgresql://username:password@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require
```

### Server (Railway or Vercel)
```
DATABASE_URL=your-neon-url-with-sslmode
JWT_SECRET=your-secret-key-minimum-32-characters
NODE_ENV=production
```

### Client (Vercel)
```
REACT_APP_API_URL=https://your-backend-url.com/api
```

---

## Testing Your Deployment

1. **Test Neon Connection**:
   ```bash
   cd server
   npx prisma studio
   # Should open browser showing your database
   ```

2. **Test Backend**:
   - Go to `https://your-backend-url.com/health`
   - Should return: `{"status":"ok"}`

3. **Test Frontend**:
   - Go to `https://your-app.vercel.app`
   - Try to register/login
   - Check browser console for errors

---

## Neon Database Features

- **Auto-pause**: Database pauses when inactive (saves resources)
- **Branching**: Create database branches for testing
- **Connection pooling**: Built-in with `?pgbouncer=true`
- **Serverless**: Perfect for Vercel's serverless architecture
- **Free tier**: 0.5 GB storage, 1 compute hour/month

---

## Next Steps

1. ✅ Create Neon database
2. ✅ Get connection string
3. ✅ Choose deployment option (1 or 2)
4. ✅ Add environment variables
5. ✅ Run database migrations
6. ✅ Deploy and test

---

## Need Help?

- Neon Docs: https://neon.tech/docs
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
