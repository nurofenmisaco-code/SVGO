// app/api/svgo/create/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveUrl } from '@/lib/utils/svgo/url-resolver';
import { detectPlatform } from '@/lib/utils/svgo/platform-detector';
import { extractProductInfo } from '@/lib/utils/svgo/product-extractor';
import { generateDeepLink } from '@/lib/utils/svgo/deep-link-generator';
import { generateLabel, generateTags } from '@/lib/utils/svgo/label-generator';
import { ensureUniqueCode } from '@/lib/utils/svgo/base62';
import { createLinkSchema } from '@/lib/validators/svgo/create-link.schema';
import { getOrCreateUser } from '@/lib/utils/user';
import { authenticateRequest } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Authenticate user (supports both cookies and JWT token)
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user from shared database
    const user = await getOrCreateUser(authResult.userId, authResult.email);

    if (!user) {
      return NextResponse.json({ 
        error: 'Unable to create user. Please ensure you are signed up in the main SV project first.' 
      }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const { url } = createLinkSchema.parse(body);

    // Step 1: Resolve URL (follow redirects)
    const resolvedUrl = await resolveUrl(url);

    // Step 2: Detect platform
    const platform = detectPlatform(resolvedUrl);

    // Step 3: Extract product information
    const productInfo = extractProductInfo(resolvedUrl, platform);

    // Step 4: Check for existing link (deduplication)
    if (productInfo.merchantProductId) {
      const existingLink = await prisma.svgoLink.findFirst({
        where: {
          userId: user.id,
          platform,
          merchantProductId: productInfo.merchantProductId,
        },
      });

      if (existingLink) {
        // Return existing link
        const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://svgo.to'}/${existingLink.code}`;
        return NextResponse.json({
          shortUrl,
          platform: existingLink.platform,
          label: existingLink.label || generateLabel(platform, productInfo.merchantProductId),
          code: existingLink.code,
        });
      }
    }

    // Step 5: Generate deep link
    const appDeeplinkUrl = generateDeepLink(platform, resolvedUrl);

    // Step 6: Generate label and tags
    const label = generateLabel(platform, productInfo.merchantProductId);
    const tags = generateTags(
      platform,
      productInfo.merchantProductId,
      productInfo.merchantProductIdType,
      productInfo.productSlug
    );

    // Step 7: Generate unique short code
    const code = await ensureUniqueCode(prisma);

    // Step 8: Create link in database
    const link = await prisma.svgoLink.create({
      data: {
        userId: user.id,
        code,
        platform,
        originalUrl: url,
        resolvedUrl,
        fallbackUrl: resolvedUrl,
        appDeeplinkUrl,
        merchantProductId: productInfo.merchantProductId,
        merchantProductIdType: productInfo.merchantProductIdType,
        productSlug: productInfo.productSlug,
        label,
        tags,
      },
    });

    const shortUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://svgo.to'}/${link.code}`;

    return NextResponse.json({
      shortUrl,
      platform: link.platform,
      label: link.label,
      code: link.code,
    });
  } catch (error) {
    console.error('Error creating link:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('zod')) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create link' },
      { status: 500 }
    );
  }
}



