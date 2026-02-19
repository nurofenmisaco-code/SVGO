// lib/utils/svgo/url-resolver.ts

/** Amazon short links (amzn.to, amzn.com) often only redirect on GET, not HEAD. Use GET + follow to get final URL. */
function isAmazonShortUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'amzn.to' || host === 'amzn.com' || host.endsWith('.amzn.to') || host.endsWith('.amzn.com');
  } catch {
    return false;
  }
}

export async function resolveUrl(url: string): Promise<string> {
  // Skip URL resolution for Walmart - they have aggressive bot detection
  // that blocks automated requests and returns blocked pages
  // Use the original URL directly to avoid bot detection
  if (url.includes('walmart.com')) {
    console.log('[URL Resolver] Skipping resolution for Walmart URL (bot detection)');
    return url;
  }

  // amzn.to / amzn.com only redirect on GET; HEAD often returns 200 with no Location. Use GET + follow.
  if (isAmazonShortUrl(url)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      clearTimeout(timeoutId);
      const finalUrl = response.url && /^https?:\/\//.test(response.url) ? response.url : url;
      if (finalUrl !== url) {
        return finalUrl;
      }
    } catch (e) {
      console.warn('[URL Resolver] GET follow for amzn short URL failed:', e);
    }
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



