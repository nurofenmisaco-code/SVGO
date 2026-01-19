// lib/utils/auth.ts
// Helper to authenticate users via Clerk cookies OR JWT token in Authorization header

import { auth, clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';

export interface AuthResult {
  userId: string;
  email?: string;
}

/**
 * Authenticates a user using either:
 * 1. Clerk session cookies (for browser requests)
 * 2. JWT token in Authorization header (for server-to-server requests)
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  // First, try to get auth from cookies (standard browser flow)
  const { userId: cookieUserId } = await auth();
  
  if (cookieUserId) {
    // User authenticated via cookies
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    return {
      userId: cookieUserId,
      email,
    };
  }

  // If no cookie auth, try JWT token from Authorization header (server-to-server)
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Decode JWT token to get userId (Clerk JWT contains userId in the payload)
      // Format: { sub: "user_xxx", ... }
      const parts = token.split('.');
      if (parts.length === 3) {
        // Decode the payload (base64url)
        const payload = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
        );
        
        const userId = payload.sub; // Clerk uses 'sub' for userId
        
        if (userId && userId.startsWith('user_')) {
          // Verify user exists with Clerk
          // clerkClient is already the client object in Clerk v4, not a function
          const user = await clerkClient.users.getUser(userId);
          
          if (user) {
            const email = user.emailAddresses[0]?.emailAddress;
            return {
              userId,
              email,
            };
          }
        }
      }
    } catch (error) {
      console.error('Error verifying JWT token:', error);
      // Token is invalid, return null
      return null;
    }
  }

  // No valid authentication found
  return null;
}
