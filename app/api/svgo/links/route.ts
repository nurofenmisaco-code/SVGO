// app/api/svgo/links/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/utils/user';
import { authenticateRequest } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Log for debugging
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    console.log('[SVGO Links] Auth header present:', !!authHeader);
    
    // Authenticate user (supports both cookies and JWT token)
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      // Return detailed error for debugging
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
        }
      }, { status: 401 });
    }

    // Get or create user from shared database
    const user = await getOrCreateUser(authResult.userId, authResult.email);

    if (!user) {
      return NextResponse.json({ 
        error: 'Unable to create user. Please ensure you are signed up in the main SV project first.' 
      }, { status: 404 });
    }

    // Fetch user's links
    const links = await prisma.svgoLink.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            dailyClicks: true,
          },
        },
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('[SVGO Links] Error fetching links:', error);
    
    if (error instanceof Error) {
      console.error('[SVGO Links] Error message:', error.message);
      console.error('[SVGO Links] Error stack:', error.stack);
      
      // Return detailed error for debugging
      return NextResponse.json(
        { 
          error: 'Failed to fetch links',
          message: error.message,
          name: error.name,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch links',
        message: 'Unknown error',
      },
      { status: 500 }
    );
  }
}



