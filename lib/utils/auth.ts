// lib/utils/auth.ts
// Helper to authenticate users via Clerk cookies OR JWT token OR API key (server-to-server)

import { auth, clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';

export interface AuthResult {
  userId: string;
  email?: string;
}

const SVGO_API_SECRET = process.env.SVGO_API_SECRET;

/**
 * Authenticates a user using either:
 * 1. API key + X-User-Id header (server-to-server, most reliable when both projects share env)
 * 2. JWT token in Authorization header (server-to-server)
 * 3. Clerk session cookies (for browser requests)
 */
export async function authenticateRequest(request: Request): Promise<AuthResult | null> {
  // 1. API key auth (server-to-server fallback - use when Imaginify and SVGO share same env)
  if (SVGO_API_SECRET) {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
    const userId = request.headers.get('X-User-Id') || request.headers.get('x-user-id');
    if (apiKey === SVGO_API_SECRET && userId && userId.startsWith('user_')) {
      console.log('[SVGO Auth] Authenticated via API key for userId:', userId);
      return { userId };
    }
  }

  // 2. JWT token in Authorization header
  // Try multiple ways to get the auth header
  let authHeader = request.headers.get('Authorization') || 
                   request.headers.get('authorization') ||
                   request.headers.get('AUTHORIZATION');
  
  // Also try custom header as fallback (in case Authorization is being stripped)
  if (!authHeader) {
    authHeader = request.headers.get('X-Authorization') || 
                 request.headers.get('x-authorization');
  }
  
  // Also check via header entries (in case get() doesn't work)
  if (!authHeader) {
    const headerEntries = Array.from(request.headers.entries());
    const foundEntry = headerEntries.find(([key]) => 
      key.toLowerCase() === 'authorization' || key.toLowerCase() === 'x-authorization'
    );
    if (foundEntry) {
      authHeader = foundEntry[1];
      console.log('[SVGO Auth] Found auth header via entries search');
    }
  }
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // We have a JWT token, process it directly without calling auth()
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Decode JWT token to get userId (Clerk JWT contains userId in the payload)
      // Format: { sub: "user_xxx", ... }
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[SVGO Auth] Invalid JWT format - not 3 parts, got:', parts.length);
        // Fall through to try cookie auth
      } else {
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
          // Fall through to try cookie auth
          payload = null;
        }
        
        if (payload) {
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
              // Fall through to try cookie auth
              userId = null;
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
              // Fall through to try cookie auth
              userId = null;
            }
          }
          
          // Verify user exists with Clerk
          if (userId && userId.startsWith('user_')) {
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
              }
            } catch (userError: any) {
              console.error('[SVGO Auth] Error fetching user from Clerk:', userError?.message || userError);
              // If it's a 404, the user doesn't exist
              if (userError?.status === 404 || userError?.clerkError?.status === 404) {
                console.error('[SVGO Auth] User not found (404)');
              }
              // Fall through to try cookie auth
            }
          }
        }
      }
    } catch (error) {
      console.error('[SVGO Auth] Unexpected error verifying JWT token:', error);
      if (error instanceof Error) {
        console.error('[SVGO Auth] Error message:', error.message);
        console.error('[SVGO Auth] Error stack:', error.stack);
      }
      // Fall through to try cookie auth
    }
  }

  // If no JWT token or JWT verification failed, try cookie-based auth (standard browser flow)
  try {
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
  } catch (authError) {
    console.error('[SVGO Auth] Error calling auth():', authError);
    // If auth() fails, return null
    return null;
  }

  // No valid authentication found
  return null;
}
