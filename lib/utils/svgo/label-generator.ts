// lib/utils/svgo/label-generator.ts

import { Platform } from './platform-detector';

export function generateLabel(
  platform: Platform,
  merchantProductId: string | null
): string {
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  
  if (merchantProductId) {
    return `${platformName} • ${merchantProductId}`;
  }
  
  return platformName;
}

export function generateTags(
  platform: Platform,
  merchantProductId: string | null,
  merchantProductIdType: string | null,
  productSlug: string | null
): string[] {
  const tags: string[] = [platform];
  
  if (merchantProductId && merchantProductIdType) {
    tags.push(`${merchantProductIdType}:${merchantProductId}`);
  }
  
  if (productSlug) {
    // Only add slug if it's meaningful (not just random characters)
    if (productSlug.length > 3 && productSlug.length < 100) {
      tags.push(`slug:${productSlug}`);
    }
  }
  
  return tags;
}



