/**
 * Test redirect logic for client requirement: mobile should try to open Amazon app first,
 * then fall back to product page in browser after 2.5s if app doesn't open.
 * Run: npx tsx scripts/test-redirect-logic.ts
 */

function isValidAmazonDeepLink(appDeeplinkUrl: string | null): boolean {
  if (!appDeeplinkUrl || !appDeeplinkUrl.startsWith('com.amazon.mobile.shopping.web://')) return false;
  try {
    const pathPart = appDeeplinkUrl.replace(/^com\.amazon\.mobile\.shopping\.web:\/\/amazon\.com/, '') || '/';
    const path = pathPart.split('?')[0];
    return /^\/dp\/[A-Z0-9]{10}(\/|$)/.test(path) ||
           /^\/gp\/product\/[A-Z0-9]{10}(\/|$)/.test(path) ||
           /^\/product\/[A-Z0-9]{10}(\/|$)/.test(path);
  } catch {
    return false;
  }
}

function buildMobileRedirectScript(appDeepLink: string | null, finalFallback: string): string {
  return `
  var appLink = ${appDeepLink ? JSON.stringify(appDeepLink) : 'null'};
  var webLink = ${JSON.stringify(finalFallback)};
  if (appLink) {
    try { window.location.replace(appLink); } catch (e) { }
    setTimeout(function() { try { window.location.replace(webLink); } catch (e) { } }, 2500);
  } else if (webLink) {
    window.location.replace(webLink);
  }
`;
}

function runTests() {
  const webUrl = 'https://www.amazon.com/dp/B0G4BHD73S';
  const validDeepLink = 'com.amazon.mobile.shopping.web://amazon.com/dp/B0G4BHD73S';
  const invalidDeepLink = 'com.amazon.mobile.shopping.web://amazon.com/3ZiwVUG';

  let passed = 0;
  let failed = 0;

  // 1. Valid deep link should be recognized
  if (isValidAmazonDeepLink(validDeepLink)) {
    console.log('PASS: Valid /dp/ASIN deep link is valid');
    passed++;
  } else {
    console.log('FAIL: Valid deep link was rejected');
    failed++;
  }

  // 2. Invalid (amzn.to-style) deep link should be rejected
  if (!isValidAmazonDeepLink(invalidDeepLink)) {
    console.log('PASS: Invalid path /3ZiwVUG is rejected');
    passed++;
  } else {
    console.log('FAIL: Invalid deep link was accepted');
    failed++;
  }

  // 3. Mobile + Amazon + valid deep link => script must try app first and have setTimeout fallback
  const hasValidAppDeepLink = true;
  const appDeepLink = validDeepLink;
  const finalFallback = webUrl;
  const script = buildMobileRedirectScript(appDeepLink, finalFallback);
  if (script.includes('window.location.replace(appLink)') && script.includes('setTimeout') && script.includes('2500') && script.includes(validDeepLink)) {
    console.log('PASS: Mobile redirect script tries app first and has 2.5s fallback to web');
    passed++;
  } else {
    console.log('FAIL: Mobile script missing app attempt or setTimeout fallback');
    failed++;
  }

  // 4. Mobile + no valid app link => script should only redirect to web
  const scriptNoApp = buildMobileRedirectScript(null, webUrl);
  if (!scriptNoApp.includes('com.amazon.mobile') && scriptNoApp.includes('window.location.replace(webLink)')) {
    console.log('PASS: When no app link, script redirects to web only');
    passed++;
  } else {
    console.log('FAIL: No-app case should not contain app scheme');
    failed++;
  }

  console.log('\n---');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
