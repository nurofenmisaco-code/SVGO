// app/api/svgo/[code]/clicks/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { subDays, format, startOfDay, isSameDay } from 'date-fns';
import { getOrCreateUser } from '@/lib/utils/user';
import { authenticateRequest } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    // Authenticate user (supports both cookies and JWT token)
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user from shared database
    const user = await getOrCreateUser(authResult.userId, authResult.email);

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

    // Get range from query params: 7 or 30 (default 7)
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    const range = rangeParam === '30' ? Math.min(30, maxDays) : Math.min(7, maxDays);

    const today = startOfDay(new Date());
    // Graph: last N days EXCLUDING today
    const graphStartDate = subDays(today, range);

    // Find link by code - fetch extra to get today's clicks
    const link = await prisma.svgoLink.findUnique({
      where: { code },
      include: {
        dailyClicks: {
          where: {
            date: {
              gte: graphStartDate,
            },
          },
          orderBy: {
            date: 'asc',
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

    const todayRecord = link.dailyClicks.find((dc) => isSameDay(dc.date, today));
    const todayClicks = todayRecord?.clicks ?? 0;

    // Build clicks-by-date map
    const clicksByDate = new Map<string, number>();
    for (const dc of link.dailyClicks) {
      const key = format(dc.date, 'yyyy-MM-dd');
      clicksByDate.set(key, dc.clicks);
    }

    // Fill all days in range (including today) so chart shows full 7/30 days
    const dailyStats: { date: string; dateLabel: string; clicks: number }[] = [];
    for (let i = 0; i < range; i++) {
      const d = subDays(today, range - 1 - i);
      const key = format(d, 'yyyy-MM-dd');
      const clicks = clicksByDate.get(key) ?? 0;
      dailyStats.push({
        date: key,
        dateLabel: i === range - 1 ? 'Today' : format(d, 'MMM d'),
        clicks,
      });
    }

    const totalClicks = link.dailyClicks.reduce((sum, dc) => sum + dc.clicks, 0);

    return NextResponse.json({
      code,
      totalClicks,
      range,
      dailyStats,
      todayClicks,
    });
  } catch (error) {
    console.error('Error fetching clicks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clicks' },
      { status: 500 }
    );
  }
}



