import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkAuth = authMiddleware({
  publicRoutes: ['/'],
});

export default function middleware(req: NextRequest, event?: any) {
  // Allow short link redirects (any path that's not /api, /_next, or root) to be public
  // This makes /{code} routes public without authentication
  const pathname = req.nextUrl.pathname;
  
  // Public routes: root, short links (any non-API, non-_next path), and API routes
  const isPublicRoute = 
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    (!pathname.startsWith('/_next') && !pathname.startsWith('/api'));
  
  if (isPublicRoute) {
    // For public routes, just pass through without Clerk authentication
    return NextResponse.next();
  }
  
  // For other routes, use Clerk middleware
  return clerkAuth(req, event);
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};



