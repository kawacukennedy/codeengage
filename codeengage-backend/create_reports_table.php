<?php
// Simple migration script to create reports table
require_once __DIR__ . '/app/bootstrap.php'; // Adjust based on actual entry point

$pdo = $app->getPDO(); // Hypothetical getter, adjust based on app structure

$sql = "CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
)";

try {
    $pdo->exec($sql);
    echo "Reports table created/verified.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
