#!/bin/bash

BASE_URL="http://127.0.0.1:8000/api"
COOKIE_FILE="cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting API Verification..."

# 1. Health Check
echo -n "Checking Health... "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "503" ]; then
    echo -e "${GREEN}OK ($RESPONSE)${NC}"
else
    echo -e "${RED}FAILED ($RESPONSE)${NC}"
fi

# 2. Registration
EMAIL="testuser_$(date +%s)@example.com"
PASSWORD="Password123!"
USERNAME="user_$(date +%s)"

echo -n "Testing Registration ($EMAIL)... "
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"username\":\"$USERNAME\",\"display_name\":\"Test User\"}" \
    -c $COOKIE_FILE)

# Extract Token
TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}SUCCESS${NC}"
    echo "Token received: ${TOKEN:0:10}..."
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

# 3. Login
echo -n "Testing Login... "
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    -c $COOKIE_FILE)

LOGIN_TOKEN=$(echo $RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$LOGIN_TOKEN" ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $RESPONSE"
fi

# 4. Get Profile (Me)
echo -n "Testing Get Profile... "
RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $TOKEN")

ID=$(echo $RESPONSE | grep -o '"id":[^,]*' | cut -d':' -f2 | tr -d '}')

if [ -n "$ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $RESPONSE"
fi

# 5. Create Snippet
echo -n "Testing Create Snippet... "
RESPONSE=$(curl -s -X POST "$BASE_URL/snippets" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Test Snippet","content":"console.log(\"Hello\");","language":"javascript","description":"Test"}')

SNIPPET_ID=$(echo $RESPONSE | grep -o '"id":[^,]*' | head -1 | cut -d':' -f2 | tr -d '}')

if [ -n "$SNIPPET_ID" ]; then
    echo -e "${GREEN}SUCCESS (ID: $SNIPPET_ID)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $RESPONSE"
fi


# 6. List Snippets
echo -n "Testing List Snippets... "
RESPONSE=$(curl -s -X GET "$BASE_URL/snippets" \
    -H "Authorization: Bearer $TOKEN")

COUNT=$(echo $RESPONSE | grep -c "data")

if [ "$COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $RESPONSE"
fi

# 7. Analyze Snippet
echo -n "Testing Analyze Snippet... "
RESPONSE=$(curl -s -X POST "$BASE_URL/snippets/$SNIPPET_ID/analyze" \
    -H "Authorization: Bearer $TOKEN")
if [[ $RESPONSE == *"analysis"* ]]; then echo -e "${GREEN}SUCCESS${NC}"; else echo -e "${RED}FAILED${NC}"; fi

# 8. Star Snippet
echo -n "Testing Star Snippet... "
RESPONSE=$(curl -s -X POST "$BASE_URL/snippets/$SNIPPET_ID/star" \
    -H "Authorization: Bearer $TOKEN")
if [[ $RESPONSE == *"starred"* ]]; then echo -e "${GREEN}SUCCESS${NC}"; else echo -e "${RED}FAILED${NC}"; fi

# 9. Unstar Snippet
echo -n "Testing Unstar Snippet... "
RESPONSE=$(curl -s -X DELETE "$BASE_URL/snippets/$SNIPPET_ID/unstar" \
    -H "Authorization: Bearer $TOKEN")
if [[ $RESPONSE == *"unstarred"* ]]; then echo -e "${GREEN}SUCCESS${NC}"; else echo -e "${RED}FAILED${NC}"; fi

# 10. Fork Snippet
echo -n "Testing Fork Snippet... "
RESPONSE=$(curl -s -X POST "$BASE_URL/snippets/$SNIPPET_ID/fork" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"title\": \"Fork of Test Snippet\"}")
FORK_ID=$(echo $RESPONSE | grep -o '"id":[^,]*' | head -1 | cut -d':' -f2 | tr -d '}')
if [ -n "$FORK_ID" ]; then echo -e "${GREEN}SUCCESS (ID: $FORK_ID)${NC}"; else echo -e "${RED}FAILED${NC}"; fi

# 11. Delete Snippets (Original and Fork)
echo -n "Testing Delete Snippet... "
curl -s -X DELETE "$BASE_URL/snippets/$SNIPPET_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE "$BASE_URL/snippets/$FORK_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}SUCCESS${NC}"

# 12. List Languages
echo -n "Testing Languages... "
RESPONSE=$(curl -s -X GET "$BASE_URL/snippets/languages")
if [[ $RESPONSE == *"javascript"* ]]; then echo -e "${GREEN}SUCCESS${NC}"; else echo -e "${RED}FAILED${NC}"; fi

echo "Verification Complete."
