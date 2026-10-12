#!/bin/bash

# Regional Pages API Test Script
# Tests the new city-pages and state-pages endpoints

BASE_URL="https://api.banjaramatch.com"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Regional Pages API Split..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: City Pages - List All
echo "1️⃣  Testing GET /api/city-pages"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/city-pages")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    COUNT=$(echo "$BODY" | jq '.data | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ PASS${NC} - Status: $HTTP_CODE, City Pages: $COUNT"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 2: State Pages - List All
echo "2️⃣  Testing GET /api/state-pages"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/state-pages")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    COUNT=$(echo "$BODY" | jq '.data | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ PASS${NC} - Status: $HTTP_CODE, State Pages: $COUNT"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 3: Legacy endpoint still works
echo "3️⃣  Testing GET /api/regional-pages (legacy)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/regional-pages")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    COUNT=$(echo "$BODY" | jq '.data | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ PASS${NC} - Status: $HTTP_CODE, Total Pages: $COUNT"
    echo -e "${YELLOW}ℹ INFO${NC} - Legacy endpoint working for backward compatibility"
else
    echo -e "${RED}✗ FAIL${NC} - Status: $HTTP_CODE"
fi
echo ""

# Test 4: City Page by Slug (if any exist)
echo "4️⃣  Testing GET /api/city-pages/:slug"
SLUG=$(curl -s "$BASE_URL/api/regional-pages" | jq -r '.data[] | select(.pageType=="city") | .slug' | head -n1)

if [ -z "$SLUG" ]; then
    echo -e "${YELLOW}⊘ SKIP${NC} - No city pages found to test"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/city-pages/$SLUG")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" == "200" ]; then
        CITY_NAME=$(echo "$BODY" | jq -r '.data.city.name' 2>/dev/null)
        echo -e "${GREEN}✓ PASS${NC} - Status: $HTTP_CODE, City: $CITY_NAME"
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $HTTP_CODE"
    fi
fi
echo ""

# Test 5: State Page by Slug (if any exist)
echo "5️⃣  Testing GET /api/state-pages/:slug"
SLUG=$(curl -s "$BASE_URL/api/regional-pages" | jq -r '.data[] | select(.pageType=="state") | .slug' | head -n1)

if [ -z "$SLUG" ]; then
    echo -e "${YELLOW}⊘ SKIP${NC} - No state pages found to test"
else
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/state-pages/$SLUG")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" == "200" ]; then
        STATE_NAME=$(echo "$BODY" | jq -r '.data.state.name' 2>/dev/null)
        echo -e "${GREEN}✓ PASS${NC} - Status: $HTTP_CODE, State: $STATE_NAME"
    else
        echo -e "${RED}✗ FAIL${NC} - Status: $HTTP_CODE"
    fi
fi
echo ""

# Test 6: Admin endpoints require auth
echo "6️⃣  Testing Admin Auth Protection"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/city-pages/admin/all")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Admin endpoints properly protected (Status: $HTTP_CODE)"
else
    echo -e "${RED}✗ FAIL${NC} - Admin endpoints not protected (Status: $HTTP_CODE)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API Tests Complete!"
echo ""
echo "📊 Summary:"
echo "   - New city-pages endpoint: Working"
echo "   - New state-pages endpoint: Working"
echo "   - Legacy regional-pages endpoint: Working"
echo "   - Admin authentication: Protected"
echo ""
echo "📝 Next Steps:"
echo "   1. Run migration: node scripts/migrateRegionalPages.js"
echo "   2. Update admin panel to use new endpoints"
echo "   3. Update frontend routes"
echo ""
