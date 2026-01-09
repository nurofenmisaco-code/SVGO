# How to Run SVGO.to Project

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (shared with main SV project)
- Clerk account credentials (shared with main SV project)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env.local` file in the project root with:

```bash
# Database (copy from main SV project)
DATABASE_URL="postgresql://user:password@host:5432/database"

# Clerk (copy from main SV project)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/links
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/links

# SVGO-specific
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** 
- For local development, use `http://localhost:3000`
- For production, use `https://svgo.to`

### Step 3: Set Up Database Tables

```bash
# Create the SVGO tables (svgo_links and svgo_daily_clicks)
npm run db:push

# Generate Prisma Client
npm run db:generate
```

### Step 4: Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## 📋 Verification Steps

### 1. Verify Database Connection
```bash
# Open Prisma Studio to view database
npm run db:studio
```

### 2. Test Authentication
1. Open http://localhost:3000
2. Click "Sign In" 
3. Sign in with your Clerk account (should work if you're signed up in main SV project)

### 3. Test Link Creation
1. Sign in to the app
2. Navigate to `/create`
3. Paste an Amazon URL: `https://amzn.to/4jwjE3Z`
4. Click "Create Link"
5. Verify you get a short link back

### 4. Test Redirect Handler
1. Copy the short link you created (e.g., `http://localhost:3000/abc1234`)
2. Open it in a browser
3. Desktop: Should redirect immediately to Amazon
4. Mobile: Should show app redirect page

### 5. Test Link History
1. Navigate to `/links`
2. Verify your created links appear
3. Test search functionality

## 🧪 Testing Requirements Checklist

See `TEST_CHECKLIST.md` for complete testing guide.

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull
```

### Prisma Client Not Generated
```bash
npm run db:generate
```

### Clerk Authentication Not Working
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correct
- Check Clerk dashboard for correct redirect URLs

### Port Already in Use
```bash
# Use a different port
PORT=3001 npm run dev
```

## 📦 Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🚢 Deployment

See `README.md` for Digital Ocean deployment instructions.

