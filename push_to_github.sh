#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/kawacukennedy/temperature_mqtt_final.git"
COMMIT_MSG="deploy: system code, dashboard web interface, and hosting configurations"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}[1/5]${NC} Checking git repository..."
if [ ! -d .git ]; then
    git init
    echo -e "${GREEN}  -> Initialized new git repository${NC}"
fi

echo -e "${YELLOW}[2/5]${NC} Setting remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
echo -e "${GREEN}  -> Remote set to $REPO_URL${NC}"

echo -e "${YELLOW}[3/5]${NC} Staging all files..."
git add -A
echo -e "${GREEN}  -> Files staged${NC}"

echo -e "${YELLOW}[4/5]${NC} Committing..."
git commit -m "$COMMIT_MSG" 2>/dev/null || echo -e "  -> Nothing new to commit (already up to date)"

echo -e "${YELLOW}[5/5]${NC} Pushing to main..."
git push -u origin main

echo ""
echo -e "${GREEN}=== Push complete ===${NC}"
echo "Repo: $REPO_URL"
