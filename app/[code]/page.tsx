// app/[code]/page.tsx - Redirect handler with mobile app deep linking

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { startOfDay } from 'date-fns';

interface PageProps {
  params: Promise<{ code: string }>;
}

function isMobile(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

async function trackClick(linkId: string) {
  const today = startOfDay(new Date());

  await prisma.$transaction([
    prisma.svgoDailyClick.upsert({
      where: {
        linkId_date: { linkId, date: today },
      },
      update: { clicks: { increment: 1 } },
      create: { linkId, date: today, clicks: 1 },
    }),
    prisma.svgoLink.update({
      where: { id: linkId },
      data: { totalClicks: { increment: 1 } } as Prisma.SvgoLinkUpdateInput,
    }),
  ]);
}

export default async function RedirectPage({ params }: PageProps) {
  const { code } = await params;
  const link = await prisma.svgoLink.findUnique({
    where: { code },
  });

  if (!link || !link.isActive) {
    redirect('/');
  }

  // Track click
  await trackClick(link.id);

  // Check if mobile
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');
  const mobile = isMobile(userAgent);

  // Check if this is a Walmart URL - they block server-side redirects
  const isWalmart = link.fallbackUrl.includes('walmart.com') || 
                    link.originalUrl.includes('walmart.com') ||
                    link.platform === 'walmart';

  // For desktop non-Walmart: use server-side redirect (fastest)
  if (!mobile && !isWalmart) {
    redirect(link.fallbackUrl);
  }

  // For desktop Walmart: minimal page with immediate JavaScript redirect
  if (!mobile && isWalmart) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Redirecting...</title>
          <meta httpEquiv="refresh" content={`0;url=${link.fallbackUrl}`} />
        </head>
        <body>
          <script dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(link.fallbackUrl)});`
          }} />
          <noscript>
            <meta httpEquiv="refresh" content={`0;url=${link.fallbackUrl}`} />
            <p>Redirecting... <a href={link.fallbackUrl}>Click here if you are not redirected</a></p>
          </noscript>
        </body>
      </html>
    );
  }

  const appDeeplinkUrl = link.appDeeplinkUrl || link.fallbackUrl;
  const fallbackUrl = link.fallbackUrl;
  const hasAppDeepLink = link.appDeeplinkUrl && link.appDeeplinkUrl !== link.fallbackUrl;

  // Mobile: redirect directly to app (no interstitial page per client requirement).
  // Use app deep link when available so the link opens in Amazon app without user decision.
  // For in-app browsers (TikTok, etc.): still try app deep link first; OS may hand off to app.
  const redirectUrl = hasAppDeepLink ? appDeeplinkUrl : fallbackUrl;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Redirecting...</title>
        <meta httpEquiv="refresh" content={`0;url=${redirectUrl}`} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(redirectUrl)});`
        }} />
        <noscript>
          <meta httpEquiv="refresh" content={`0;url=${redirectUrl}`} />
          <p>Redirecting... <a href={redirectUrl}>Tap here</a></p>
        </noscript>
      </body>
    </html>
  );
}

