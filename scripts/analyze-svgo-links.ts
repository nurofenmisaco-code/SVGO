/**
 * Analyze svgo_links table for interstitial / "Open in Amazon app" issues.
 * Run from SVGO project root: npx tsx scripts/analyze-svgo-links.ts
 * Requires DATABASE_URL in .env
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env when run standalone (Next.js loads it automatically)
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  });
}

import { PrismaClient } from '@prisma/client';
import { generateDeepLink } from '../lib/utils/svgo/deep-link-generator';

const prisma = new PrismaClient();

function isAmazonShortUrl(url: string | null): boolean {
  if (!url || !/^https?:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'amzn.to' || host === 'amzn.com' || host.endsWith('.amzn.to') || host.endsWith('.amzn.com');
  } catch {
    return false;
  }
}

function looksLikeAmazonUrl(url: string): boolean {
  try {
    return /amazon\.com|amzn\.to|amzn\.com/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isValidAmazonDeepLink(appDeeplinkUrl: string | null): boolean {
  if (!appDeeplinkUrl || !appDeeplinkUrl.startsWith('com.amazon.mobile.shopping.web://')) return false;
  try {
    const pathPart = appDeeplinkUrl.replace(/^com\.amazon\.mobile\.shopping\.web:\/\/amazon\.com/, '') || '/';
    const path = pathPart.split('?')[0];
    return (
      /^\/dp\/[A-Z0-9]{10}(\/|$)/.test(path) ||
      /^\/gp\/product\/[A-Z0-9]{10}(\/|$)/.test(path) ||
      /^\/product\/[A-Z0-9]{10}(\/|$)/.test(path)
    );
  } catch {
    return false;
  }
}

function canBuildDeepLinkFromUrl(url: string): boolean {
  const deep = generateDeepLink('amazon', url);
  return !!(deep && isValidAmazonDeepLink(deep));
}

async function main() {
  console.log('Loading svgo_links...\n');
  const links = await prisma.svgoLink.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      code: true,
      platform: true,
      originalUrl: true,
      resolvedUrl: true,
      fallbackUrl: true,
      appDeeplinkUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
  const total = links.length;

  const byPlatform: Record<string, number> = {};
  let amazonTotal = 0;
  let amazonWithValidStoredDeepLink = 0;
  let amazonWithDeepLinkFromStoredUrls = 0;
  let amazonOnlyShortUrl = 0;
  let amazonNoWayToDeepLink = 0;
  let mislabeledAmazon = 0; // platform !== 'amazon' but URL looks like Amazon
  let inactive = 0;
  const problematic: Array<{ code: string; platform: string; reason: string }> = [];

  for (const link of links) {
    if (!link.isActive) inactive++;

    const urls = [link.fallbackUrl, link.resolvedUrl, link.originalUrl].filter(
      (u): u is string => !!u && /^https?:\/\//.test(u)
    );
    const isAmazonByPlatform = link.platform === 'amazon';
    const isAmazonByUrl = urls.some(looksLikeAmazonUrl);
    const isAmazon = isAmazonByPlatform || isAmazonByUrl;

    byPlatform[link.platform] = (byPlatform[link.platform] ?? 0) + 1;
    if (isAmazonByUrl && !isAmazonByPlatform) mislabeledAmazon++;

    if (!isAmazon) continue;
    amazonTotal++;

    const hasValidStored = !!(
      link.appDeeplinkUrl && isValidAmazonDeepLink(link.appDeeplinkUrl)
    );
    if (hasValidStored) amazonWithValidStoredDeepLink++;

    const canBuildFromStored = urls.some(canBuildDeepLinkFromUrl);
    if (canBuildFromStored) amazonWithDeepLinkFromStoredUrls++;

    const hasShortUrl = urls.some(isAmazonShortUrl);
    if (hasShortUrl) amazonOnlyShortUrl++;

    // After our fixes: interstitial if stored deep link, or buildable from stored URLs, or amzn.to (resolved at redirect).
    const willShowInterstitial = hasValidStored || canBuildFromStored || (hasShortUrl && isAmazon);
    if (!willShowInterstitial) {
      amazonNoWayToDeepLink++;
      problematic.push({
        code: link.code,
        platform: link.platform,
        reason:
          'Amazon link but no stored deep link, no full product URL in fallback/resolved/original, and no amzn.to to resolve at redirect.',
      });
    }
  }

  console.log('=== svgo_links summary ===');
  console.log('Total links:', total);
  console.log('By platform:', JSON.stringify(byPlatform, null, 2));
  console.log('Inactive:', inactive);
  console.log('');
  console.log('=== Amazon links (platform=amazon or URL looks like Amazon) ===');
  console.log('Amazon-related links:', amazonTotal);
  console.log('  - With valid stored appDeeplinkUrl:', amazonWithValidStoredDeepLink);
  console.log('  - Can build deep link from fallbackUrl/resolvedUrl/originalUrl:', amazonWithDeepLinkFromStoredUrls);
  console.log('  - Have amzn.to / amzn.com in stored URLs (resolved at redirect):', amazonOnlyShortUrl);
  console.log('  - Mislabeled: URL is Amazon but platform != "amazon":', mislabeledAmazon);
  console.log('  - At risk (no way to show interstitial with current logic):', amazonNoWayToDeepLink);
  console.log('');
  if (problematic.length > 0) {
    console.log('=== Links that may NOT show "Open in Amazon app" interstitial ===');
    problematic.forEach((p) => console.log(`  ${p.code} (platform=${p.platform}): ${p.reason}`));
    console.log('');
  }

  // Optional: inspect one link by code (e.g. npx tsx scripts/analyze-svgo-links.ts hM0biLLj)
  const sampleCode = process.argv[2];
  if (sampleCode) {
    const sample = links.find((l) => l.code === sampleCode);
    if (sample) {
      console.log('=== Sample row for code', sampleCode, '===');
      console.log('  platform:', sample.platform);
      console.log('  isActive:', sample.isActive);
      console.log('  originalUrl:', sample.originalUrl?.slice(0, 80) + (sample.originalUrl && sample.originalUrl.length > 80 ? '...' : ''));
      console.log('  resolvedUrl:', sample.resolvedUrl?.slice(0, 80) + (sample.resolvedUrl && sample.resolvedUrl.length > 80 ? '...' : ''));
      console.log('  fallbackUrl:', sample.fallbackUrl?.slice(0, 80) + (sample.fallbackUrl && sample.fallbackUrl.length > 80 ? '...' : ''));
      console.log('  appDeeplinkUrl:', sample.appDeeplinkUrl ? sample.appDeeplinkUrl.slice(0, 60) + '...' : 'null');
      console.log('  Stored URL is amzn.to?', [sample.originalUrl, sample.resolvedUrl, sample.fallbackUrl].some(isAmazonShortUrl));
      console.log('  Can build deep link from stored URLs?', [sample.fallbackUrl, sample.resolvedUrl, sample.originalUrl].some((u) => u && canBuildDeepLinkFromUrl(u)));
    } else {
      console.log('No link found with code:', sampleCode);
    }
  }
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
