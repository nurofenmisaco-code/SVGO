// lib/utils/svgo/deep-link-generator.ts
// Client requirement: "Preserve full path + query string from resolved affiliate URL."

import { Platform } from './platform-detector';

/** Extract ASIN from Amazon URL path (handles /dp/ASIN, /Product-Name/dp/ASIN, /gp/product/ASIN). */
function extractAsinFromPath(pathname: string): string | null {
  const dp = pathname.match(/\/dp\/([A-Z0-9]{10})/);
  const gp = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
  const product = pathname.match(/\/product\/([A-Z0-9]{10})/);
  return dp?.[1] ?? gp?.[1] ?? product?.[1] ?? null;
}

/**
 * Generate Amazon app deep link.
 * Client doc: "Preserve full path + query string from resolved affiliate URL."
 * iOS: com.amazon.mobile.shopping.web://amazon.com/<path>?<query>
 */
export function generateDeepLink(
  platform: Platform,
  resolvedUrl: string
): string | null {
  if (platform !== 'amazon') {
    return null;
  }

  try {
    const urlObj = new URL(resolvedUrl);
    if (!urlObj.hostname.toLowerCase().includes('amazon')) return null;

    const pathname = urlObj.pathname || '/';
    const search = urlObj.search || ''; // includes leading ?
    const pathAndQuery = search ? `${pathname}${search}` : pathname;

    // Must look like a product path (has /dp/ or /gp/product/) for valid deep link
    const asin = extractAsinFromPath(pathname);
    if (!asin) return null;

    const deepLink = `com.amazon.mobile.shopping.web://amazon.com${pathAndQuery}`;
    return deepLink;
  } catch (error) {
    console.error('Error generating deep link:', error);
    return null;
  }
}



