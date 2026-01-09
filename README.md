# SVGO.to - URL Shortener

A URL shortener service that converts affiliate links into short links that automatically open native shopping apps on mobile devices.

## Features

- 🔗 **Smart Redirects**: Automatically detects mobile devices and opens native apps when available
- 📊 **Click Tracking**: Track daily clicks per link with detailed analytics
- 🔍 **Link History**: Store and search your link history for easy retrieval
- 🎯 **Deduplication**: Prevents duplicate links for the same product
- 📱 **Mobile App Deep Linking**: Amazon links open in the native Amazon app
- 🔐 **Shared Authentication**: Uses the same Clerk authentication as the main SV project
- 💾 **Shared Database**: Uses the same PostgreSQL database as the main SV project

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (shared with main SV project)
- **Authentication**: Clerk (shared with main SV project)
- **Styling**: Tailwind CSS + Radix UI
- **Validation**: Zod + React Hook Form
- **State Management**: React Query (TanStack Query)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database (shared with main SV project)
- Clerk account (shared with main SV project)

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd svgo
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables from your main SV project:
```bash
cp ../sv/.env.local .env.local
```

4. Update `.env.local` with SVGO-specific settings:
```bash
NEXT_PUBLIC_APP_URL=https://svgo.to
```

5. Set up the database:
```bash
# Push Prisma schema to database (adds new tables)
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy these from your main SV project's `.env.local`:

```bash
# Database (shared)
DATABASE_URL="postgresql://..."

# Clerk (shared)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/links
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/links

# SVGO-specific
NEXT_PUBLIC_APP_URL=https://svgo.to
```

## Database Schema

The project adds two new tables to the shared database:

- `svgo_links`: Stores short links and metadata
- `svgo_daily_clicks`: Tracks daily click counts per link

See `prisma/schema.prisma` for the full schema.

## API Endpoints

### Create Link
**POST** `/api/svgo/create`

Creates a new short link from an affiliate URL.

**Request:**
```json
{
  "url": "https://amzn.to/4jwjE3Z"
}
```

**Response:**
```json
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

### Get Click Analytics
**GET** `/api/svgo/:code/clicks?range=7|30`

Returns click analytics for a specific link.

**Query Parameters:**
- `range`: Number of days (7 for free users, 30 for paid users)

**Response:**
```json
{
  "code": "abc1234",
  "totalClicks": 150,
  "range": 7,
  "dailyStats": [
    { "date": "2026-01-03", "clicks": 25 },
    { "date": "2026-01-02", "clicks": 20 }
  ]
}
```

## Supported Platforms

- **Amazon**: Full support with app deep linking
- **Walmart**: Web redirect only (app deep linking coming soon)
- **Costco**: Web redirect only
- **Home Depot**: Web redirect only
- **Lowe's**: Web redirect only
- **Other**: Generic web redirect

## Project Structure

```
svgo/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (pages)/         # Main pages (create, links)
│   ├── [code]/          # Redirect handler
│   ├── api/             # API routes
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── ui/              # Base UI components
│   └── svgo/            # SVGO-specific components
├── lib/
│   ├── prisma.ts        # Prisma client
│   ├── utils/
│   │   └── svgo/        # SVGO utilities
│   └── validators/      # Zod schemas
└── prisma/
    └── schema.prisma    # Database schema
```

## Deployment

### Digital Ocean App Platform

1. Create a new App Platform project
2. Connect your SVGO repository/folder
3. Configure environment variables (copy from main SV project)
4. Set custom domain: `svgo.to`
5. Deploy

### Post-Deployment

1. Run Prisma migrations:
```bash
npx prisma db push
```

2. Test the following:
   - Link creation (Amazon and Walmart)
   - Mobile redirect behavior
   - Click tracking
   - Authentication (should work with existing SV users)

## Development

### Database Commands

```bash
# Push schema changes
npm run db:push

# Generate Prisma Client
npm run db:generate

# Open Prisma Studio
npm run db:studio
```

### Testing

Test URLs:
- Amazon: `https://amzn.to/4jwjE3Z`
- Walmart: `https://walmrt.us/492e4TB`

## License

Private project - All rights reserved.



