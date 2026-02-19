// lib/utils/svgo/deep-link-generator.ts

import { Platform } from './platform-detector';

/** Extract ASIN from Amazon URL path (handles /dp/ASIN, /Product-Name/dp/ASIN, /gp/product/ASIN). */
function extractAsinFromPath(pathname: string): string | null {
  const dp = pathname.match(/\/dp\/([A-Z0-9]{10})/);
  const gp = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
  const product = pathname.match(/\/product\/([A-Z0-9]{10})/);
  return dp?.[1] ?? gp?.[1] ?? product?.[1] ?? null;
}

export function generateDeepLink(
  platform: Platform,
  resolvedUrl: string
): string | null {
  if (platform !== 'amazon') {
    // Phase 1: Only Amazon has deep links
    return null;
  }

  try {
    const urlObj = new URL(resolvedUrl);
    const pathname = urlObj.pathname;
    const asin = extractAsinFromPath(pathname);
    if (!asin) return null;

    // Use canonical /dp/ASIN for the app so we don't depend on long paths or query strings.
    // Optionally keep tag= for affiliate attribution if present.
    const tag = urlObj.searchParams.get('tag');
    const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    const deepLink = `com.amazon.mobile.shopping.web://amazon.com/dp/${asin}${query}`;
    return deepLink;
  } catch (error) {
    console.error('Error generating deep link:', error);
    return null;
  }
}



