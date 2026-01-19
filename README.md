# SVGO - Backend API Service

A backend-only URL shortener service that provides API endpoints for creating and managing short links. The UI is implemented in the main SV project.

## 🎯 Purpose

This service provides:
- URL shortening API endpoints
- Mobile app deep linking (Amazon)
- Daily click tracking
- Link history and analytics

**Note:** This is a backend-only service. All UI is handled by the main SV project.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Variables

```bash
# Database (shared with SV project)
DATABASE_URL="postgresql://..."

# Clerk (shared with SV project)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# SVGO App URL (CRITICAL - must be SVGO deployment URL)
NEXT_PUBLIC_APP_URL=https://svgo.to
```

**Important:** `NEXT_PUBLIC_APP_URL` must be set to your SVGO deployment URL (e.g., `https://svgo.to`), NOT the SV project URL. This ensures short links point to the correct domain.

### Database Setup

```bash
# Create SVGO tables
npm run db:push

# Generate Prisma Client
npm run db:generate
```

### Development

```bash
npm run dev
```

## 📡 API Endpoints

### Create Link
**POST** `/api/svgo/create`

```json
// Request
{
  "url": "https://amzn.to/4jwjE3Z"
}

// Response
{
  "shortUrl": "https://svgo.to/abc1234",
  "platform": "amazon",
  "label": "Amazon • B0ABC123",
  "code": "abc1234"
}
```

### Get Links
**GET** `/api/svgo/links`

Returns all links for the authenticated user.

### Get Analytics
**GET** `/api/svgo/:code/clicks?range=7|30`

Returns click analytics for a specific link.

### Redirect Handler (Public)
**GET** `/:code`

Handles short link redirects. No authentication required.

See `API_DOCUMENTATION.md` for complete API documentation.

## 🔧 Integration with SV Project

The SV project calls these API endpoints to create and manage links. The short URLs point to this SVGO service's redirect handler.

**Example:**
```typescript
// In SV project
const response = await fetch('https://svgo.to/api/svgo/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include Clerk cookies
  body: JSON.stringify({ url: 'https://amzn.to/4jwjE3Z' })
});
```

## 🗄️ Database

SVGO adds two tables to the shared database:
- `svgo_links` - Stores short links
- `svgo_daily_clicks` - Tracks daily clicks

## 🚢 Deployment

### Vercel

1. Deploy to Vercel
2. Set environment variables
3. **Critical:** Set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
4. Run `npx prisma db push` to create tables

### Environment Variables for Production

```bash
NEXT_PUBLIC_APP_URL=https://svgo.to  # Your SVGO deployment URL
DATABASE_URL=postgresql://...                    # Shared database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...    # Shared Clerk
CLERK_SECRET_KEY=sk_live_...                      # Shared Clerk
```

## ⚠️ Important: Short URL Generation

The `shortUrl` in API responses uses `NEXT_PUBLIC_APP_URL`. 

**Correct:**
- `NEXT_PUBLIC_APP_URL=https://svgo.to`
- Short URL: `https://svgo.to/abc1234`

**Wrong:**
- `NEXT_PUBLIC_APP_URL=https://shoppablevideos.com`
- Short URL: `https://shoppablevideos.com/abc1234` ❌

Make sure `NEXT_PUBLIC_APP_URL` points to your SVGO deployment, not the SV project!

## 📚 Documentation

- **API Documentation:** See `API_DOCUMENTATION.md`
- **Database Schema:** See `prisma/schema.prisma`
