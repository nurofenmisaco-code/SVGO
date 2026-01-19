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
        let payload: any;
        try {
          payload = JSON.parse(
            Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
          );
        } catch (decodeError) {
          console.error('[SVGO Auth] Failed to decode JWT payload:', decodeError);
          return null;
        }
        
        console.log('[SVGO Auth] JWT payload keys:', Object.keys(payload));
        console.log('[SVGO Auth] JWT payload sub:', payload.sub);
        console.log('[SVGO Auth] JWT payload sid:', payload.sid);
        
        // Clerk JWT might have userId in 'sub' field
        // The 'sub' field typically contains the user ID
        let userId = payload.sub;
        
        // If 'sub' is a session ID (starts with sess_), try to get the session
        if (userId && userId.startsWith('sess_')) {
          try {
            console.log('[SVGO Auth] Token contains session ID, fetching session...');
            const session = await clerkClient.sessions.getSession(userId);
            userId = session.userId;
            console.log('[SVGO Auth] Got userId from session:', userId);
          } catch (sessionError) {
            console.error('[SVGO Auth] Error getting session:', sessionError);
            return null;
          }
        }
        
        // Also check if there's a direct userId in the payload
        if (!userId || (!userId.startsWith('user_') && !userId.startsWith('sess_'))) {
          // Try other possible fields
          userId = payload.userId || payload.user_id || payload.uid;
        }
        
        if (userId && userId.startsWith('user_')) {
          console.log('[SVGO Auth] Found userId from token:', userId);
          // Verify user exists with Clerk
          try {
            const user = await clerkClient.users.getUser(userId);
            
            if (user) {
              const email = user.emailAddresses[0]?.emailAddress;
              console.log('[SVGO Auth] User verified successfully:', userId);
              return {
                userId,
                email,
              };
            } else {
              console.error('[SVGO Auth] User not found in Clerk:', userId);
            }
          } catch (userError) {
            console.error('[SVGO Auth] Error fetching user from Clerk:', userError);
            return null;
          }
        } else {
          console.error('[SVGO Auth] Invalid userId format. userId:', userId, 'Payload keys:', Object.keys(payload));
          // Log full payload for debugging (but mask sensitive data)
          const safePayload = { ...payload };
          if (safePayload.iat) delete safePayload.iat;
          if (safePayload.exp) delete safePayload.exp;
          console.error('[SVGO Auth] Full payload (sanitized):', JSON.stringify(safePayload, null, 2));
        }
      } else {
        console.error('[SVGO Auth] Invalid JWT format - not 3 parts, got:', parts.length);
      }
    } catch (error) {
      console.error('[SVGO Auth] Error verifying JWT token:', error);
      if (error instanceof Error) {
        console.error('[SVGO Auth] Error message:', error.message);
        console.error('[SVGO Auth] Error stack:', error.stack);
      }
      // Token is invalid, return null
      return null;
    }
  } else {
    console.log('[SVGO Auth] No Authorization header or not Bearer token');
  }

  // No valid authentication found
  return null;
}
