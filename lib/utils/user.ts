// lib/utils/user.ts
// Helper to get or create user from Clerk

import { prisma } from '@/lib/prisma';

export async function getOrCreateUser(clerkId: string, email?: string) {
  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  // If user doesn't exist, create a basic user record
  // Note: This is a minimal user - the main SV project's webhook should handle full user creation
  if (!user) {
    try {
      // Generate unique username and email if not provided
      const baseUsername = `user-${clerkId.substring(0, 8)}`;
      const userEmail = email || `${baseUsername}@temp.svgo.local`;
      
      // Check if username/email already exists and make unique if needed
      let username = baseUsername;
      let finalEmail = userEmail;
      let counter = 1;
      
      while (true) {
        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { username },
              { email: finalEmail },
            ],
          },
        });
        
        if (!existing) break;
        
        username = `${baseUsername}${counter}`;
        finalEmail = email ? `${email.split('@')[0]}+${counter}@${email.split('@')[1]}` : `${baseUsername}${counter}@temp.svgo.local`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          clerkId,
          email: finalEmail,
          username,
          photo: '',
          planId: 1,
          role: 'USER',
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error creating user:', error);
      // If creation fails, return null
      return null;
    }
  }

  return user;
}

