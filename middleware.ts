import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Make API routes public - authentication is handled inside each API route
  publicRoutes: ['/', '/[code]', '/api/svgo/create', '/api/svgo/links', '/api/svgo/(.*)'],
});

export const config = {
  // Exclude API routes from middleware entirely to preserve Authorization headers
  // This ensures headers are never touched by middleware
  matcher: [
    // Skip all static files, API routes, and _next
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
    // But include root and dynamic routes
    "/",
    "/[code]"
  ],
};



