# SVGO.to - Complete Test Checklist

## ✅ Core Requirements Testing

### 1. User Authentication ✅
- [ ] User can sign in using Clerk (shared with main SV project)
- [ ] User can sign up using Clerk
- [ ] Existing SV users can access SVGO automatically
- [ ] Unauthenticated users are redirected to sign-in page
- [ ] Authenticated users can access protected routes

**Test Steps:**
1. Open http://localhost:3000
2. Click "Sign In"
3. Sign in with existing Clerk account
4. Verify redirect to `/links` page
5. Sign out and verify redirect to home page

### 2. Create Short Link ✅
- [ ] URL validation works (rejects invalid URLs)
- [ ] Amazon affiliate URLs are resolved correctly
- [ ] Walmart affiliate URLs are resolved correctly
- [ ] ASIN is extracted from Amazon URLs
- [ ] itemId is extracted from Walmart URLs
- [ ] Platform is detected correctly
- [ ] Short code is generated (base62, 8 characters)
- [ ] Deep link is created for Amazon
- [ ] Label is auto-generated (e.g., "Amazon • B0ABC123")
- [ ] Tags are auto-generated
- [ ] Link is saved to database

**Test URLs:**
- Amazon: `https://amzn.to/4jwjE3Z`
- Walmart: `https://walmrt.us/492e4TB`
- Invalid: `not-a-url` (should fail validation)

**Test Steps:**
1. Sign in to the app
2. Navigate to `/create`
3. Paste Amazon URL and click "Create Link"
4. Verify success modal shows short link
5. Verify link is copied to clipboard
6. Repeat with Walmart URL

### 3. Deduplication ✅
- [ ] Same user + same platform + same product ID = returns existing link
- [ ] Different user + same product = creates new link
- [ ] Same user + different product = creates new link

**Test Steps:**
1. Create a link for Amazon product
2. Try to create the same link again
3. Verify it returns the existing short link (not creating duplicate)
4. Sign in as different user and create same link
5. Verify new link is created (different code)

### 4. Redirect Handler (`/:code`) ✅
- [ ] Desktop: Immediate redirect to fallback URL
- [ ] Mobile: Shows smart redirect page
- [ ] Mobile: Attempts app deep link
- [ ] Mobile: Shows fallback buttons after 1 second
- [ ] Mobile: "Open in App" button works
- [ ] Mobile: "Continue in Browser" button works
- [ ] Click is tracked when link is accessed
- [ ] Invalid code redirects to home page
- [ ] Inactive links redirect to home page

**Test Steps:**
1. Create a short link
2. Open it on desktop browser
3. Verify immediate redirect to Amazon
4. Open it on mobile device (or use browser dev tools mobile mode)
5. Verify smart redirect page appears
6. Verify click is tracked in database

### 5. Click Tracking ✅
- [ ] Click increments daily counter
- [ ] Same day = increment existing record
- [ ] New day = create new daily record
- [ ] Click tracking works for all link accesses

**Test Steps:**
1. Create a link and access it multiple times
2. Check database (via Prisma Studio): `npm run db:studio`
3. Verify `svgo_daily_clicks` table has records
4. Verify clicks increment correctly

### 6. Analytics Endpoint ✅
- [ ] Free users see max 7 days of analytics
- [ ] Paid users see max 30 days of analytics
- [ ] Analytics endpoint returns correct data format
- [ ] Unauthorized users cannot access analytics
- [ ] Users cannot access other users' analytics

**Test Steps:**
1. As free user, create link and track clicks
2. Access `/api/svgo/{code}/clicks?range=30`
3. Verify response is limited to 7 days (or available days)
4. Create subscription (or manually set in database)
5. Verify paid users can see 30 days

### 7. Link History Page (`/links`) ✅
- [ ] Shows all user's links
- [ ] Links are sorted by creation date (newest first)
- [ ] Search works (by label, code, tags, product ID, URL)
- [ ] Copy button copies short link to clipboard
- [ ] "Test" button opens link in new tab
- [ ] Shows platform badge
- [ ] Shows label
- [ ] Shows creation date
- [ ] Shows product ID if available

**Test Steps:**
1. Create multiple links (different platforms)
2. Navigate to `/links`
3. Verify all links appear
4. Test search with different queries
5. Test copy functionality
6. Test "Test" button

### 8. Platform Detection ✅
- [ ] Amazon URLs detected correctly
- [ ] Walmart URLs detected correctly
- [ ] Costco URLs detected correctly
- [ ] Home Depot URLs detected correctly
- [ ] Lowe's URLs detected correctly
- [ ] Unknown URLs default to "other"

**Test URLs:**
- Amazon: `https://amzn.to/4jwjE3Z`, `https://amazon.com/dp/B0ABC123`
- Walmart: `https://walmrt.us/492e4TB`, `https://walmart.com/ip/product/123`
- Costco: `https://costco.com/...`
- Home Depot: `https://homedepot.com/...`
- Lowe's: `https://lowes.com/...`

### 9. Deep Link Generation ✅
- [ ] Amazon deep links are generated correctly
- [ ] Deep link format: `com.amazon.mobile.shopping.web://amazon.com/...`
- [ ] Walmart deep links are null (not implemented in v1)
- [ ] Other platforms deep links are null

**Test Steps:**
1. Create Amazon link
2. Check database for `appDeeplinkUrl` field
3. Verify it matches expected format

### 10. URL Resolution ✅
- [ ] Shortened URLs (amzn.to, walmrt.us) are resolved to final URLs
- [ ] Redirects are followed (up to 5 redirects)
- [ ] Final URL is stored correctly

**Test Steps:**
1. Create link with shortened URL
2. Verify `resolvedUrl` in database is the final Amazon/Walmart URL
3. Verify `originalUrl` stores the shortened URL

## 📱 Mobile Testing

### Mobile App Deep Linking
- [ ] Amazon app opens when deep link is accessed on Android
- [ ] Amazon app opens when deep link is accessed on iOS
- [ ] Fallback to browser works if app is not installed
- [ ] Fallback buttons appear after 1 second

**Test Steps:**
1. Create Amazon link
2. Access on real mobile device with Amazon app installed
3. Verify app opens
4. Access on device without Amazon app
5. Verify fallback to browser works

## 🔒 Security Testing

- [ ] API endpoints require authentication
- [ ] Users cannot access other users' links
- [ ] Users cannot access other users' analytics
- [ ] Redirect handler is public (for sharing)
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection (React escapes by default)

## ⚡ Performance Testing

- [ ] Link creation is fast (< 2 seconds)
- [ ] Redirect handler responds quickly (< 500ms)
- [ ] Link history page loads quickly
- [ ] Search is responsive

## 🐛 Edge Cases

- [ ] Very long URLs are handled
- [ ] Special characters in URLs are handled
- [ ] Invalid product IDs don't break the system
- [ ] Missing product IDs still create links
- [ ] Empty search returns all results
- [ ] Invalid date ranges are handled gracefully

## 📊 Database Verification

Run these checks in Prisma Studio (`npm run db:studio`):

- [ ] `svgo_links` table exists
- [ ] `svgo_daily_clicks` table exists
- [ ] Foreign key to `users.id` works correctly
- [ ] Indexes are created for performance
- [ ] Unique constraint on `code` works

## ✅ Acceptance Test URLs

### Test 1: Amazon Link
**Input:** `https://amzn.to/4jwjE3Z`
**Expected:**
- ✅ Resolves to final Amazon URL
- ✅ ASIN extracted
- ✅ Deep link created
- ✅ Opens Amazon app on mobile

### Test 2: Walmart Link
**Input:** `https://walmrt.us/492e4TB`
**Expected:**
- ✅ Resolves to final Walmart URL
- ✅ itemId extracted
- ✅ No deep link (web redirect only)

### Test 3: Deduplication
**Steps:**
1. Create link for same product
2. Create again as same user
**Expected:**
- ✅ Returns existing link (same code)
- ✅ No duplicate created

### Test 4: Click Tracking
**Steps:**
1. Access link 5 times on same day
2. Access 3 times next day
**Expected:**
- ✅ First day: 1 record with 5 clicks
- ✅ Second day: 1 record with 3 clicks

### Test 5: Analytics
**Steps:**
1. Free user requests analytics
2. Paid user requests analytics
**Expected:**
- ✅ Free: Max 7 days
- ✅ Paid: Max 30 days

## 🎯 Definition of Done

All acceptance tests must pass:
- [x] User can create SVGO links from affiliate URLs
- [x] Amazon links open in native app on mobile
- [x] Walmart links redirect to web (no app link in v1)
- [x] Links fallback correctly if app doesn't open
- [x] Click tracking works per day
- [x] Link history is searchable
- [x] Users can find links without re-pasting URLs
- [x] Free users see 7 days of analytics
- [x] Paid users see 30 days of analytics
- [x] Deduplication prevents duplicate links

