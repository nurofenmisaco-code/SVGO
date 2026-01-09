# Local Testing Guide

## ⚠️ Important: Use Local URL for Testing

When testing locally, you **must** use `http://localhost:3000` (or your dev server port) instead of `https://svgo.to`.

## Quick Fix

### 1. Update Your `.env.local` File

Make sure your `.env.local` has:

```bash
# For LOCAL DEVELOPMENT - use localhost
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For PRODUCTION - use svgo.to (only after deployment)
# NEXT_PUBLIC_APP_URL=https://svgo.to
```

### 2. Restart Your Dev Server

After updating `.env.local`:
```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

### 3. Test Your Link Locally

Instead of: `https://svgo.to/5T1sp2rf`  
Use: `http://localhost:3000/5T1sp2rf`

## Why This Happens

- The short link URL is generated using `NEXT_PUBLIC_APP_URL`
- If it's set to `https://svgo.to`, all links will point to production
- Since you haven't deployed yet, that domain doesn't exist
- You need to use `http://localhost:3000` for local testing

## Testing Your Created Link

1. **Check your links page**: Go to `http://localhost:3000/links`
2. **Copy the short link** (it should show `http://localhost:3000/5T1sp2rf` if env is correct)
3. **Open it in a new tab** - it should redirect to Amazon

## After Deployment

Once you deploy to `svgo.to`:
1. Update `.env.local` (or production env vars) to `https://svgo.to`
2. All new links will use the production domain
3. Old links will still work (they're stored in the database)

