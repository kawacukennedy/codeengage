#!/bin/bash

# Load env variables
if [ -f ../config/.env ]; then
    export $(cat ../config/.env | grep -v '#' | awk '/=/ {print $1}')
fi

BACKUP_DIR="../storage/backups"
mkdir -p $BACKUP_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="backup_$TIMESTAMP.sql"

echo "Starting backup to $BACKUP_DIR/$FILENAME..."

if [ "$DB_CONNECTION" = "sqlite" ]; then
    cp "$DB_DATABASE" "$BACKUP_DIR/backup_$TIMESTAMP.sqlite"
else
    mysqldump -u "$DB_USERNAME" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_DATABASE" > "$BACKUP_DIR/$FILENAME"
fi

# Keep only last 7 days
find $BACKUP_DIR -type f -name "backup_*" -mtime +7 -delete

echo "Backup completed."
