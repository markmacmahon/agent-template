#!/bin/bash
set -e

# Migration script to duplicate this repository to luzia/luzia-nexo
# This preserves all git history but creates an independent repository

echo "🚀 Starting migration to luzia/luzia-nexo..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if new repo exists
echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"
echo "Please ensure you've created an empty repository at:"
echo "  https://github.com/luzia/luzia-nexo"
echo ""
read -p "Have you created the empty repository? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Please create the repository first, then run this script again.${NC}"
    exit 1
fi

# Step 2: Create temporary bare clone
echo -e "${BLUE}Step 2: Creating bare clone...${NC}"
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
git clone --bare https://github.com/markmacmahon/agent-template.git
cd agent-template.git

# Step 3: Mirror-push to new repo
echo -e "${BLUE}Step 3: Pushing to luzia/luzia-nexo...${NC}"
git push --mirror https://github.com/luzia/luzia-nexo.git

# Step 4: Clean up
echo -e "${BLUE}Step 4: Cleaning up...${NC}"
cd ../..
rm -rf "$TEMP_DIR"

# Step 5: Provide next steps
echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Clone your new repository:"
echo -e "     ${BLUE}git clone https://github.com/luzia/luzia-nexo.git${NC}"
echo ""
echo "  2. Set up your new development environment:"
echo -e "     ${BLUE}cd luzia-nexo${NC}"
echo -e "     ${BLUE}docker compose up -d db${NC}"
echo -e "     ${BLUE}make docker-migrate-db${NC}"
echo -e "     ${BLUE}make start-backend${NC}"
echo -e "     ${BLUE}make start-frontend${NC}"
echo ""
echo -e "${GREEN}Happy orchestrating! 🎉${NC}"
