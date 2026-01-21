// lib/utils/svgo/url-resolver.ts

export async function resolveUrl(url: string): Promise<string> {
  // Skip URL resolution for Walmart - they have aggressive bot detection
  // that blocks automated requests and returns blocked pages
  // Use the original URL directly to avoid bot detection
  if (url.includes('walmart.com')) {
    console.log('[URL Resolver] Skipping resolution for Walmart URL (bot detection)');
    return url;
  }

  let currentUrl = url;
  let redirectCount = 0;
  const maxRedirects = 5;

  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      // Check if we got blocked (common patterns)
      if (response.status === 403 || 
          response.status === 429 ||
          currentUrl.includes('/blocked') ||
          response.headers.get('location')?.includes('/blocked')) {
        console.warn('[URL Resolver] URL appears to be blocked, using original URL');
        return url; // Return original URL instead of blocked page
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Handle relative redirects
          currentUrl = new URL(location, currentUrl).href;
          redirectCount++;
          continue;
        }
      }

      // Final URL reached (not a redirect)
      return currentUrl;
    } catch (error) {
      // If fetch fails, return the original URL as fallback
      console.error('[URL Resolver] Error resolving URL:', error);
      return url; // Return original URL, not currentUrl (which might be partially resolved)
    }
  }

  // If too many redirects, return original URL
  console.warn('[URL Resolver] Too many redirects, using original URL');
  return url;
}



