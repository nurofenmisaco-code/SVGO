import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ['/', '/[code]', '/sign-in', '/sign-up'], // Allow redirect handler and auth pages to be public
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};



