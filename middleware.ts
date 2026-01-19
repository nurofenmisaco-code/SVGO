import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Make API routes public - authentication is handled inside each API route
  // This allows both cookie-based and JWT token-based authentication
  publicRoutes: ['/', '/[code]', '/api/svgo/create', '/api/svgo/links', '/api/svgo/(.*)'],
});

export const config = {
  // Exclude API routes from middleware to preserve Authorization headers
  // Only run middleware on non-API routes, redirect handler, and static files
  matcher: [
    // Skip all static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
    // But include root and dynamic routes
    "/",
    "/[code]"
  ],
};



