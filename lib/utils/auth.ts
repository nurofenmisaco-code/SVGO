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
      if (parts.length !== 3) {
        console.error('[SVGO Auth] Invalid JWT format - not 3 parts, got:', parts.length);
        return null;
      }

      // Decode the payload (base64url)
      let payload: any;
      try {
        // Handle base64url decoding properly
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        payload = JSON.parse(Buffer.from(padded, 'base64').toString());
      } catch (decodeError) {
        console.error('[SVGO Auth] Failed to decode JWT payload:', decodeError);
        return null;
      }
      
      // Log payload structure for debugging
      const payloadKeys = Object.keys(payload);
      console.log('[SVGO Auth] JWT payload keys:', payloadKeys);
      console.log('[SVGO Auth] JWT payload sub:', payload.sub);
      
      // Clerk JWT typically has userId in 'sub' field
      // But it might also be a session token (sess_xxx) that needs to be resolved
      let userId = payload.sub;
      
      // If 'sub' is a session ID (starts with sess_), get the session to extract userId
      if (userId && userId.startsWith('sess_')) {
        try {
          console.log('[SVGO Auth] Token contains session ID, fetching session...');
          const session = await clerkClient.sessions.getSession(userId);
          userId = session.userId;
          console.log('[SVGO Auth] Got userId from session:', userId);
        } catch (sessionError: any) {
          console.error('[SVGO Auth] Error getting session:', sessionError?.message || sessionError);
          return null;
        }
      }
      
      // Validate userId format
      if (!userId || !userId.startsWith('user_')) {
        console.error('[SVGO Auth] Invalid userId format. userId:', userId);
        console.error('[SVGO Auth] Payload keys:', payloadKeys);
        // Try alternative fields (though unlikely)
        const altUserId = payload.userId || payload.user_id || payload.uid;
        if (altUserId && altUserId.startsWith('user_')) {
          userId = altUserId;
          console.log('[SVGO Auth] Found userId in alternative field:', userId);
        } else {
          return null;
        }
      }
      
      // Verify user exists with Clerk
      try {
        console.log('[SVGO Auth] Verifying user with Clerk:', userId);
        const user = await clerkClient.users.getUser(userId);
        
        if (user) {
          const email = user.emailAddresses[0]?.emailAddress;
          console.log('[SVGO Auth] User verified successfully:', userId);
          return {
            userId,
            email,
          };
        } else {
          console.error('[SVGO Auth] User not found in Clerk (user object is null/undefined)');
          return null;
        }
      } catch (userError: any) {
        console.error('[SVGO Auth] Error fetching user from Clerk:', userError?.message || userError);
        // If it's a 404, the user doesn't exist
        if (userError?.status === 404 || userError?.clerkError?.status === 404) {
          console.error('[SVGO Auth] User not found (404)');
        }
        return null;
      }
    } catch (error) {
      console.error('[SVGO Auth] Unexpected error verifying JWT token:', error);
      if (error instanceof Error) {
        console.error('[SVGO Auth] Error message:', error.message);
        console.error('[SVGO Auth] Error stack:', error.stack);
      }
      return null;
    }
  } else {
    console.log('[SVGO Auth] No Authorization header or not Bearer token');
  }

  // No valid authentication found
  return null;
}
