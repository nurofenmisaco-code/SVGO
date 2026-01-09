# 🚀 SVGO.to - Quick Start Guide

## ⚡ Fast Setup (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env.local` File

Create `.env.local` in the project root:

```bash
# Copy from your main SV project
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/links
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/links

# SVGO-specific (use localhost for dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Create Database Tables
```bash
npm run db:push
npm run db:generate
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Browser
Navigate to: **http://localhost:3000**

## ✅ Verify Everything Works

### Quick Test Checklist:

1. **Sign In** - Click "Sign In" and authenticate with Clerk
2. **Create Link** - Go to `/create` and paste: `https://amzn.to/4jwjE3Z`
3. **View Links** - Go to `/links` and see your created link
4. **Test Redirect** - Open the short link in a new tab

## 📚 Full Documentation

- **How to Run:** See `HOW_TO_RUN.md`
- **Testing Guide:** See `TEST_CHECKLIST.md`
- **Project Summary:** See `PROJECT_SUMMARY.md`
- **General Info:** See `README.md`

## 🎯 What's Implemented

✅ URL shortening with affiliate links  
✅ Mobile app deep linking (Amazon)  
✅ Daily click tracking  
✅ Link history & search  
✅ Deduplication  
✅ Analytics (7 days free, 30 days paid)  
✅ Shared Clerk authentication  
✅ Shared database  

**Status: 100% Complete and Ready for Use!**

