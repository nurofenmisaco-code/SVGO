// lib/utils/svgo/deep-link-generator.ts

import { Platform } from './platform-detector';

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
    const path = urlObj.pathname;
    const search = urlObj.search;
    
    // Amazon app deep link format
    // com.amazon.mobile.shopping.web://amazon.com{path}?{query}
    const deepLink = `com.amazon.mobile.shopping.web://amazon.com${path}${search}`;
    
    return deepLink;
  } catch (error) {
    console.error('Error generating deep link:', error);
    return null;
  }
}



