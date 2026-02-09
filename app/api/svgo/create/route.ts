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
    // Log ALL headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = key.toLowerCase().includes('authorization') ? 'Bearer ***' : value;
    });
    console.log('[SVGO Create] All incoming headers:', Object.keys(allHeaders));
    console.log('[SVGO Create] All header values:', JSON.stringify(Object.keys(allHeaders).reduce((acc, k) => {
      acc[k] = k.toLowerCase().includes('authorization') ? 'Bearer ***' : allHeaders[k];
      return acc;
    }, {} as Record<string, string>)));
    
    // Try multiple ways to get the auth header
    const authHeaderFromRequest = request.headers.get('Authorization') || 
                                   request.headers.get('authorization') ||
                                   request.headers.get('AUTHORIZATION');
    
    // Also try to get it from the raw headers
    const headerEntries = Array.from(request.headers.entries());
    const authHeaderFromEntries = headerEntries.find(([key]) => 
      key.toLowerCase() === 'authorization'
    )?.[1];
    
    const authHeader = authHeaderFromRequest || authHeaderFromEntries;
    
    // Log for debugging
    console.log('[SVGO Create] Auth header from request.get():', authHeaderFromRequest ? 'present' : 'missing');
    console.log('[SVGO Create] Auth header from entries:', authHeaderFromEntries ? 'present' : 'missing');
    console.log('[SVGO Create] Final auth header:', authHeader ? 'present' : 'missing');
    
    // Authenticate user (supports both cookies and JWT token)
    // Create a modified request with the auth header if we found it
    let requestToAuth = request;
    if (authHeader && !request.headers.get('Authorization')) {
      // If we found the header via entries but not via get(), create a new request
      // Actually, we can't modify the request, so just pass the header value directly
      console.log('[SVGO Create] Using auth header from entries search');
    }
    
    const authResult = await authenticateRequest(request);
    if (!authResult) {
      // Return detailed error for debugging
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderFromRequest: !!authHeaderFromRequest,
          authHeaderFromEntries: !!authHeaderFromEntries,
          tokenLength: authHeader ? authHeader.length : 0,
          authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
          allHeaderKeys: Object.keys(allHeaders),
          headerCount: Object.keys(allHeaders).length,
        }
      }, { status: 401 });
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
    const { url, forceNew } = createLinkSchema.parse(body);

    // Step 1: Resolve URL (follow redirects)
    const resolvedUrl = await resolveUrl(url);

    // Step 2: Detect platform
    const platform = detectPlatform(resolvedUrl);

    // Step 3: Extract product information
    const productInfo = extractProductInfo(resolvedUrl, platform);

    // Step 4: Check for existing link (deduplication) - skip when forceNew (e.g. Link-in-Bio needs separate link per post)
    if (productInfo.merchantProductId && !forceNew) {
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
    // For Walmart, use original URL as fallback to avoid any processing issues
    const fallbackUrl = platform === 'walmart' ? url : resolvedUrl;
    
    const link = await prisma.svgoLink.create({
      data: {
        userId: user.id,
        code,
        platform,
        originalUrl: url,
        resolvedUrl,
        fallbackUrl,
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
    console.error('[SVGO Create] Error creating link:', error);
    
    if (error instanceof Error) {
      console.error('[SVGO Create] Error message:', error.message);
      console.error('[SVGO Create] Error stack:', error.stack);
      
      if (error.message.includes('zod')) {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
      
      // Return detailed error for debugging
      return NextResponse.json(
        { 
          error: 'Failed to create link',
          message: error.message,
          name: error.name,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create link',
        message: 'Unknown error',
      },
      { status: 500 }
    );
  }
}



