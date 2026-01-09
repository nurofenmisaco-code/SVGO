// app/api/svgo/[code]/clicks/route.ts

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, format } from 'date-fns';
import { getOrCreateUser } from '@/lib/utils/user';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
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

    // Check user subscription status
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    const isPaid = !!userSubscription;
    const maxDays = isPaid ? 30 : 7;

    // Get range from query params (default to maxDays)
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    const range = rangeParam ? Math.min(parseInt(rangeParam, 10), maxDays) : maxDays;

    // Find link by code
    const link = await prisma.svgoLink.findUnique({
      where: { code },
      include: {
        dailyClicks: {
          where: {
            date: {
              gte: subDays(new Date(), range),
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Verify ownership
    if (link.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate total clicks
    const totalClicks = link.dailyClicks.reduce((sum, dc) => sum + dc.clicks, 0);

    // Format daily stats
    const dailyStats = link.dailyClicks.map((dc) => ({
      date: format(dc.date, 'yyyy-MM-dd'),
      clicks: dc.clicks,
    }));

    return NextResponse.json({
      code,
      totalClicks,
      range,
      dailyStats,
    });
  } catch (error) {
    console.error('Error fetching clicks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clicks' },
      { status: 500 }
    );
  }
}



