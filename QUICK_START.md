# Quick Start - Deploy to Vercel with Neon

Follow these steps in order. Full details in [NEON_VERCEL_GUIDE.md](NEON_VERCEL_GUIDE.md).

---

## ✅ Step 1: Create Neon Database (5 minutes) ✓ DONE

1. ✓ Go to **https://neon.tech** and sign up
2. ✓ Create new project: `time-tracking-test`
3. Copy your connection string (looks like):
   ```
   postgresql://user:pass@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save it somewhere safe!**

**Next:** Copy your connection string from the Neon dashboard

---

## ✅ Step 2: Set Up Database Schema (2 minutes)

```bash
cd server

# Update server/.env with your Neon connection string
# DATABASE_URL="postgresql://..."

# Run migration
npx prisma generate
npx prisma db push

# Verify (optional)
npx prisma studio
```

---

## ✅ Step 3: Push to GitHub (3 minutes)

```bash
cd /Users/tavishkeegan/Desktop/mood-tracking-app

# Initialize git
git init
git add .
git commit -m "Ready for Vercel deployment"

# Create repo on GitHub, then:
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

---

## ✅ Step 4: Deploy to Vercel (5 minutes)

### Via Dashboard (Easiest):

1. Go to **https://vercel.com/new**
2. Sign in with GitHub
3. Import your repository
4. **Add Environment Variables**:
   - `DATABASE_URL` = Your Neon connection string
   - `JWT_SECRET` = Random 32+ character string
   - `NODE_ENV` = `production`
5. Click **Deploy**
6. Wait 2-5 minutes

### Via CLI (Alternative):

```bash
npm i -g vercel
vercel login
vercel

# Add environment variables:
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NODE_ENV

# Deploy to production:
vercel --prod
```

---

## ✅ Step 5: Test Deployment (2 minutes)

1. **Health Check**: Visit `https://your-app.vercel.app/health`
   - Should return: `{"status":"OK","message":"Server is running"}`

2. **Frontend**: Visit `https://your-app.vercel.app`
   - Should show login screen

3. **Create Admin User**:
   ```bash
   cd server
   npx prisma studio
   ```
   - Add a User record with role: `ADMIN`
   - Hash password with bcrypt first

---

## 🎉 Done!

Your app is live at: **https://your-app.vercel.app**

---

## Files Created/Modified:

- ✅ [api/index.ts](api/index.ts) - Serverless function entry point
- ✅ [package.json](package.json) - Root package with dependencies
- ✅ [vercel.json](vercel.json) - Vercel configuration
- ✅ [client/src/services/api.ts](client/src/services/api.ts) - Updated API URLs

---

## Common Issues:

### "Database connection error"
- Check DATABASE_URL in Vercel env vars
- Add `&pgbouncer=true` for connection pooling

### "CORS error"
- Already handled in `api/index.ts`
- Clear browser cache

### "Prisma Client not found"
- Redeploy: `vercel --prod --force`

---

## Need Help?

Read the full guide: [NEON_VERCEL_GUIDE.md](NEON_VERCEL_GUIDE.md)
