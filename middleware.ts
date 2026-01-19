import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Make API routes public - authentication is handled inside each API route
  // This allows both cookie-based and JWT token-based authentication
  // Clerk middleware needs to run (for auth() to work) but routes are public (headers preserved)
  publicRoutes: ['/', '/[code]', '/api/svgo/create', '/api/svgo/links', '/api/svgo/(.*)'],
});

export const config = {
  // Include API routes in matcher so Clerk can detect authMiddleware()
  // But mark them as publicRoutes above so they don't require cookie auth
  // This preserves Authorization headers while allowing auth() to work
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};



