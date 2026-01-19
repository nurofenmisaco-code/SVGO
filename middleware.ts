import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create Clerk middleware instance  
const clerkAuth = authMiddleware({
  publicRoutes: ['/', '/[code]', '/api/svgo/create', '/api/svgo/links', '/api/svgo/(.*)'],
});

// Custom middleware that preserves Authorization headers for API routes
export default function middleware(req: NextRequest, event?: any) {
  // For API routes, skip Clerk middleware entirely to preserve Authorization header
  // We handle authentication manually in the API routes using JWT tokens
  if (req.nextUrl.pathname.startsWith('/api/svgo/')) {
    // Just pass through - don't process with Clerk
    // This preserves all headers including Authorization
    return NextResponse.next();
  }

  // For other routes, use Clerk middleware
  return clerkAuth(req, event);
}

export const config = {
  // Include API routes in matcher but handle them separately above
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};



