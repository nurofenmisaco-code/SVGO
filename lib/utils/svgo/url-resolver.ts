// lib/utils/svgo/url-resolver.ts

export async function resolveUrl(url: string): Promise<string> {
  let currentUrl = url;
  let redirectCount = 0;
  const maxRedirects = 5;

  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

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
      // If fetch fails, return the current URL as fallback
      console.error('Error resolving URL:', error);
      return currentUrl;
    }
  }

  throw new Error('Too many redirects');
}



