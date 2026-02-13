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

function isAndroid(userAgent: string | null): boolean {
  return !!userAgent && /Android/i.test(userAgent);
}

/** Build Android intent URL so WebViews (TikTok, YouTube, Pinterest) can hand off to the Amazon app. Falls back to browser if app not installed. */
function buildAmazonIntentUrl(deepLink: string, fallbackUrl: string): string {
  const match = deepLink.match(/^com\.amazon\.mobile\.shopping\.web:\/\/(.+)$/);
  const pathAndQuery = match ? match[1] : '';
  const encodedFallback = encodeURIComponent(fallbackUrl);
  return `intent://${pathAndQuery}#Intent;scheme=com.amazon.mobile.shopping.web;package=com.amazon.mShop.android.shopping;S.browser_fallback_url=${encodedFallback};end`;
}

/** Escape URL for safe use in HTML attribute (e.g. meta refresh content). Prevents & and " from breaking the page. */
function escapeUrlForHtml(url: string): string {
  return url
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Deep link is only valid if it points to a real product path (/dp/ASIN or /gp/product/ASIN). */
function isValidAmazonDeepLink(appDeeplinkUrl: string | null): boolean {
  if (!appDeeplinkUrl || !appDeeplinkUrl.startsWith('com.amazon.mobile.shopping.web://')) return false;
  try {
    const pathPart = appDeeplinkUrl.replace(/^com\.amazon\.mobile\.shopping\.web:\/\/amazon\.com/, '') || '/';
    const path = pathPart.split('?')[0];
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
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Link not found</title>
        </head>
        <body style={{ margin: 0, padding: 16, fontFamily: 'sans-serif', fontSize: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Link not found</h1>
          <p style={{ color: '#666' }}>This short link doesn&apos;t exist or has expired.</p>
        </body>
      </html>
    );
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

  // Mobile: match client requirement — open in Amazon app (TikTok/YouTube/Pinterest WebViews). On Android use intent:// so in-app WebViews can hand off to the Amazon app; on iOS use custom scheme. Fall back to product page in browser after 2.5s if app doesn't open.
  const fallbackUrl = link.fallbackUrl || link.resolvedUrl || link.originalUrl;
  const hasValidAppDeepLink =
    link.platform === 'amazon' &&
    link.appDeeplinkUrl &&
    link.appDeeplinkUrl !== fallbackUrl &&
    isValidAmazonDeepLink(link.appDeeplinkUrl);
  const rawAppDeepLink = hasValidAppDeepLink ? link.appDeeplinkUrl! : null;
  const finalFallback = fallbackUrl && /^https?:\/\//.test(fallbackUrl) ? fallbackUrl : link.originalUrl || '';
  // Android: intent URL works better in WebViews (TikTok, YouTube, etc.). iOS: use custom scheme.
  const appDeepLink =
    rawAppDeepLink && isAndroid(userAgent)
      ? buildAmazonIntentUrl(rawAppDeepLink, finalFallback)
      : rawAppDeepLink;

  const safeFallbackForMeta = escapeUrlForHtml(finalFallback);

  // Mobile + Amazon app: show interstitial so app open is triggered by user gesture.
  // In-app WebViews (TikTok, YouTube) block intent/scheme navigation unless it's from a user tap.
  // linktw.in uses the same pattern: "This site is trying to open another application" → Allow / Don't allow.
  if (appDeepLink) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Open in Amazon app</title>
        </head>
        <body style={{ margin: 0, padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 16, background: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: '0 0 24px', color: '#333', textAlign: 'center', lineHeight: 1.5 }}>
              This site is trying to open another application.
            </p>
            <a
              href={appDeepLink}
              style={{ display: 'block', width: '100%', padding: '14px 20px', marginBottom: 12, background: '#ff9900', color: '#000', fontWeight: 600, textAlign: 'center', borderRadius: 8, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Open in Amazon app
            </a>
            <a
              href={finalFallback}
              style={{ display: 'block', width: '100%', padding: '14px 20px', background: '#e5e5e5', color: '#333', fontWeight: 500, textAlign: 'center', borderRadius: 8, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Continue in browser
            </a>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: '#999' }}>Powered by svgo.to</p>
        </body>
      </html>
    );
  }

  // Mobile but no app deep link (e.g. non-Amazon): redirect to web URL
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Opening...</title>
        <meta httpEquiv="refresh" content={`0;url=${safeFallbackForMeta}`} />
      </head>
      <body style={{ margin: 0, padding: 16, fontFamily: 'sans-serif', fontSize: 16 }}>
        <p style={{ marginTop: 24 }}>
          <a href={finalFallback} style={{ color: '#0066c0' }}>Tap here if you are not redirected</a>
        </p>
      </body>
    </html>
  );
}

