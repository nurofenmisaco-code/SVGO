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

/** Deep link is only valid if it points to a real product path (/dp/ASIN or /gp/product/ASIN). Links created from amzn.to that didn't resolve get path like /3ZiwVUG and break on mobile. */
function isValidAmazonDeepLink(appDeeplinkUrl: string | null): boolean {
  if (!appDeeplinkUrl || !appDeeplinkUrl.startsWith('com.amazon.mobile.shopping.web://')) return false;
  try {
    const pathPart = appDeeplinkUrl.replace(/^com\.amazon\.mobile\.shopping\.web:\/\/amazon\.com/, '') || '/';
    const path = pathPart.split('?')[0];
    // Valid: /dp/B0CNCL35CH, /gp/product/B0xxx, /product/B0xxx
    return /^\/dp\/[A-Z0-9]{10}(\/|$)/.test(path) ||
           /^\/gp\/product\/[A-Z0-9]{10}(\/|$)/.test(path) ||
           /^\/product\/[A-Z0-9]{10}(\/|$)/.test(path);
  } catch {
    return false;
  }
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

  // Mobile: use app deep link only when it's valid (e.g. /dp/ASIN). Manual links created with amzn.to that didn't resolve have bad paths like /3ZiwVUG and cause a blank page; use fallback so they open in browser.
  const fallbackUrl = link.fallbackUrl;
  const hasValidAppDeepLink =
    link.appDeeplinkUrl &&
    link.appDeeplinkUrl !== link.fallbackUrl &&
    isValidAmazonDeepLink(link.appDeeplinkUrl);
  const redirectUrl = hasValidAppDeepLink ? (link.appDeeplinkUrl ?? fallbackUrl) : fallbackUrl;
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

