/**
 * SVGO Link Routing — client requirement (TL;DR + Technical Implementation Reference)
 * passthrough = redirect immediately, no interstitial.
 * svgo_deeplink = Amazon + Amazon-owned URL → show interstitial on mobile only.
 */

const AMAZON_OWNED = ['amazon.com', 'amazon.', 'amzn.to', 'a.co'];

function isAmazonOwnedUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return AMAZON_OWNED.some((d) => lower.includes(d));
}

/** Third-party / non-Amazon-owned: URLGenius, Linktw, Bitly, etc. → passthrough per client doc. */
function isThirdPartyShortenerUrl(url: string | null): boolean {
  if (!url || !/^https?:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes('urlgeni') ||
      host.includes('linktw') ||
      host === 'bit.ly' ||
      host === 't.co'
    );
  } catch {
    return false;
  }
}

export type RoutingMode = 'passthrough' | 'svgo_deeplink';

/**
 * Determine routing mode per client doc:
 * - svgo_deeplink: destination is Amazon AND original URL is Amazon-owned (amazon.*, amzn.to, a.co).
 * - passthrough: destination is NOT Amazon OR original URL is NOT Amazon-owned (URLGenius, Linktw, Bitly).
 */
export function getRoutingMode(link: {
  platform: string;
  originalUrl: string;
  resolvedUrl?: string | null;
  fallbackUrl: string;
}): RoutingMode {
  const platform = (link.platform || '').toLowerCase();
  const url = link.originalUrl || link.resolvedUrl || link.fallbackUrl || '';
  if (platform !== 'amazon') return 'passthrough';
  if (isThirdPartyShortenerUrl(url)) return 'passthrough';
  if (isAmazonOwnedUrl(url)) return 'svgo_deeplink';
  return 'passthrough';
}

/** Hostile in-app browsers (TikTok, IG, Facebook, Messenger) — client doc. */
export function isHostileBrowser(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /TikTok|Instagram|FBAN|FBAV|Messenger/i.test(userAgent);
}
