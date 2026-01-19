import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Make API routes public - authentication is handled inside each API route
  // This allows both cookie-based and JWT token-based authentication
  publicRoutes: ['/', '/[code]', '/api/svgo/create', '/api/svgo/links', '/api/svgo/(.*)'],
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};



