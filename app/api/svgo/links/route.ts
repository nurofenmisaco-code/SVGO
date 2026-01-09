// app/api/svgo/links/route.ts

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser } from '@/lib/utils/user';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Clerk user for email
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;

    // Get or create user from shared database
    const user = await getOrCreateUser(userId, email);

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
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}



