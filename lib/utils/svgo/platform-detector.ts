// lib/utils/svgo/platform-detector.ts

export type Platform = 'amazon' | 'walmart' | 'costco' | 'homedepot' | 'lowes' | 'other';

export function detectPlatform(url: string): Platform {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Remove www. prefix
  const cleanHostname = hostname.replace(/^www\./, '');
  
  if (cleanHostname.includes('amazon') || cleanHostname.includes('amzn.to')) {
    return 'amazon';
  }
  
  if (cleanHostname.includes('walmart') || cleanHostname.includes('walmrt.us')) {
    return 'walmart';
  }
  
  if (cleanHostname.includes('costco')) {
    return 'costco';
  }
  
  if (cleanHostname.includes('homedepot')) {
    return 'homedepot';
  }
  
  if (cleanHostname.includes('lowes')) {
    return 'lowes';
  }
  
  return 'other';
}



