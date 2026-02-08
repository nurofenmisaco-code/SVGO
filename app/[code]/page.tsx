// app/[code]/page.tsx - Redirect handler with mobile app deep linking

import { prisma } from '@/lib/prisma';
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

/** Detect in-app browser (TikTok, Instagram, etc.) - app deep links rarely work in WebViews */
function isInAppBrowser(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('musical_ly') ||
    ua.includes('tiktok') ||
    ua.includes('bytedancewebview') ||
    ua.includes('instagram') ||
    ua.includes('fbav') ||
    ua.includes('fbiossdk') ||
    ua.includes('fbios') ||
    ua.includes('line/')
  );
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
      data: { totalClicks: { increment: 1 } },
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
  const inAppBrowser = isInAppBrowser(userAgent);

  // In-app browser (TikTok, Instagram, etc.): WebViews block app deep links. Skip our "Open in App"
  // page - redirect straight to product URL. Amazon's mobile page may open app or show Open in App.
  if (mobile && inAppBrowser) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Redirecting...</title>
          <meta httpEquiv="refresh" content={`0;url=${fallbackUrl}`} />
        </head>
        <body>
          <script dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(fallbackUrl)});`
          }} />
          <noscript>
            <meta httpEquiv="refresh" content={`0;url=${fallbackUrl}`} />
            <p>Redirecting... <a href={fallbackUrl}>Tap here</a></p>
          </noscript>
        </body>
      </html>
    );
  }

  // If mobile but no app deep link, just redirect immediately
  if (mobile && !hasAppDeepLink) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Redirecting...</title>
          <meta httpEquiv="refresh" content={`0;url=${fallbackUrl}`} />
        </head>
        <body>
          <script dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(fallbackUrl)});`
          }} />
          <noscript>
            <meta httpEquiv="refresh" content={`0;url=${fallbackUrl}`} />
            <p>Redirecting... <a href={link.fallbackUrl}>Click here if you are not redirected</a></p>
          </noscript>
        </body>
      </html>
    );
  }

  // Mobile with app deep link: show smart redirect page
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Redirecting...</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 2rem;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              max-width: 400px;
              width: 100%;
            }
            h1 {
              font-size: 1.5rem;
              margin-bottom: 1rem;
              font-weight: 600;
            }
            p {
              font-size: 1rem;
              margin-bottom: 2rem;
              opacity: 0.9;
            }
            .buttons {
              display: flex;
              flex-direction: column;
              gap: 1rem;
              opacity: 0;
              transition: opacity 0.3s;
            }
            .buttons.visible {
              opacity: 1;
            }
            button {
              padding: 0.875rem 1.5rem;
              font-size: 1rem;
              font-weight: 500;
              border: 2px solid white;
              border-radius: 0.5rem;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              cursor: pointer;
              transition: all 0.2s;
              backdrop-filter: blur(10px);
            }
            button:hover {
              background: rgba(255, 255, 255, 0.2);
              transform: translateY(-2px);
            }
            button:active {
              transform: translateY(0);
            }
            .loading {
              margin-bottom: 2rem;
            }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.3);
              border-top: 3px solid white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </head>
      <body>
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <h1>Opening in app...</h1>
            <p>If the app doesn't open, use the buttons below:</p>
          </div>
          <div className="buttons" id="buttons">
            <button id="openAppBtn">
              Open in App
            </button>
            <button id="openBrowserBtn">
              Continue in Browser
            </button>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const appDeeplinkUrl = ${JSON.stringify(appDeeplinkUrl)};
              const fallbackUrl = ${JSON.stringify(fallbackUrl)};
              
              // Attempt app deep link immediately
              window.location.href = appDeeplinkUrl;
              
              // Set up button handlers
              document.getElementById('openAppBtn').addEventListener('click', function() {
                window.location.href = appDeeplinkUrl;
              });
              
              document.getElementById('openBrowserBtn').addEventListener('click', function() {
                window.location.href = fallbackUrl;
              });
              
              // Show buttons after 1 second
              setTimeout(() => {
                var btn = document.getElementById('buttons');
                var load = document.querySelector('.loading');
                if (btn) btn.classList.add('visible');
                if (load && load instanceof HTMLElement) load.style.opacity = '0.5';
              }, 1000);
            })();
          `
        }} />
      </body>
    </html>
  );
}

