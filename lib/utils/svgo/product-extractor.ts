// lib/utils/svgo/product-extractor.ts

import { Platform } from './platform-detector';

export interface ProductInfo {
  merchantProductId: string | null;
  merchantProductIdType: string | null;
  productSlug: string | null;
}

export function extractProductInfo(url: string, platform: Platform): ProductInfo {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  let merchantProductId: string | null = null;
  let merchantProductIdType: string | null = null;
  let productSlug: string | null = null;
  
  switch (platform) {
    case 'amazon': {
      // Amazon patterns:
      // /dp/{ASIN}
      // /gp/product/{ASIN}
      // /product/{ASIN}
      // /dp/{ASIN}/...
      const dpMatch = pathname.match(/\/dp\/([A-Z0-9]{10})/);
      const gpMatch = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);
      const productMatch = pathname.match(/\/product\/([A-Z0-9]{10})/);
      
      const asin = dpMatch?.[1] || gpMatch?.[1] || productMatch?.[1];
      
      if (asin) {
        merchantProductId = asin;
        merchantProductIdType = 'asin';
      }
      
      // Extract slug from pathname (everything after /dp/{ASIN}/)
      const slugMatch = pathname.match(/\/dp\/[A-Z0-9]{10}\/(.+)/);
      if (slugMatch?.[1]) {
        productSlug = slugMatch[1].split('/')[0]; // First segment after ASIN
      }
      break;
    }
    
    case 'walmart': {
      // Walmart patterns:
      // /ip/{slug}/{itemId}
      // /ip/{slug}/{itemId}/...
      const ipMatch = pathname.match(/\/ip\/([^/]+)\/([^/?]+)/);
      
      if (ipMatch) {
        productSlug = ipMatch[1];
        merchantProductId = ipMatch[2];
        merchantProductIdType = 'itemId';
      }
      break;
    }
    
    default:
      // For other platforms, try to extract any meaningful ID from path
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        // If it looks like an ID (alphanumeric, reasonable length)
        if (/^[A-Za-z0-9-]{3,50}$/.test(lastSegment)) {
          merchantProductId = lastSegment;
          merchantProductIdType = 'sku';
        }
      }
  }
  
  return {
    merchantProductId,
    merchantProductIdType,
    productSlug,
  };
}



