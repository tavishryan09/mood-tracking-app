# Deployment Checklist

## Quick Start - What You Need to Do

### ✅ Step 1: Set Up GitHub Repository

```bash
cd /Users/tavishkeegan/Desktop/mood-tracking-app

# Initialize git (if not already done)
git init
git add .
git commit -m "Prepare for deployment"

# Create repo on GitHub, then:
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### ✅ Step 2: Deploy Backend to Railway

1. **Go to**: https://railway.app
2. **Sign up** with GitHub
3. **Create PostgreSQL Database**:
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway auto-creates `DATABASE_URL`
4. **Deploy Server**:
   - Click "+ New" → "GitHub Repo"
   - Select `mood-tracking-app`
   - Go to Settings → Set "Root Directory" to `server`
   - Go to Settings → Set "Start Command" to `npm run build && npm run start`
5. **Add Environment Variables**:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-key-change-this-now
   ```
6. **Run Migration**:
   - In Railway dashboard, go to your server service
   - Click "Deploy" → add this build command:
   ```
   npm run build && npx prisma migrate deploy
   ```
7. **Copy Your API URL**: `https://your-app.up.railway.app`

### ✅ Step 3: Deploy Frontend to Vercel

1. **Go to**: https://vercel.com/new
2. **Import** your GitHub repository
3. **Configure**:
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: `cd client && npx expo export:web`
   - Output Directory: `client/dist`
4. **Add Environment Variable**:
   ```
   REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
   ```
   (Replace with your actual Railway URL!)
5. **Click Deploy**

### ✅ Step 4: Update CORS on Server

Add your Vercel URL to CORS in `server/src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:8081',
    'http://localhost:19006',
    'https://your-app.vercel.app',  // Add this
    'https://*.vercel.app'           // Add this
  ],
  credentials: true
}));
```

Push this change to GitHub - Railway will auto-deploy.

### ✅ Step 5: Test Your Deployment

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Try to register/login
3. Check if planning, projects work

---

## Files I Created for You

1. **`VERCEL_DEPLOYMENT.md`** - Full detailed guide
2. **`vercel.json`** - Vercel configuration
3. **Updated `server/package.json`** - Added Prisma build steps

---

## Common Issues & Fixes

### "Cannot connect to API"
- Verify `REACT_APP_API_URL` in Vercel environment variables
- Check Railway server is running
- Check CORS settings

### "Database connection error"
- Ensure Railway PostgreSQL is running
- Run `npx prisma migrate deploy` in Railway

### "Build failed on Vercel"
- Test `cd client && npx expo export:web` locally first
- Check build logs in Vercel dashboard

---

## Need Help?

Read the full guide in `VERCEL_DEPLOYMENT.md`
