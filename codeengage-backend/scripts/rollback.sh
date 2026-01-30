#!/bin/bash

# Simple rollback script for git-based deployments

if [ -z "$1" ]; then
    echo "Usage: ./rollback.sh <commit-hash>"
    echo "Recent commits:"
    git log --oneline -n 5
    exit 1
fi

COMMIT=$1

echo "Rolling back to $COMMIT..."

# 1. Maintenance mode on
# touch ../storage/maintenance.flag

# 2. Checkout
git checkout $COMMIT

# 3. Clear cache
rm -rf ../storage/cache/*

# 4. Restart services (if applicable)
# service php-fpm restart

echo "Rollback completed. Please verify the application."
