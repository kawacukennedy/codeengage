<?php

require_once __DIR__ . '/index.php';

// Only allow CLI execution or authenticated cron service
if (php_sapi_name() !== 'cli' && !isset($_GET['key']) && $_GET['key'] !== ($_ENV['CRON_KEY'] ?? 'secret')) {
    die('Access denied');
}

echo "Starting cron job...\n";

try {
    // 1. Cleanup old sessions
    $collabService = new \App\Services\CollaborationService($db);
    // Add cleanup method if not exists, or just direct SQL here for simplicity if service method is missing
    $db->exec("DELETE FROM collaboration_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    echo "Cleaned up old collaboration sessions.\n";

    // 2. Cleanup old audit logs (keep 90 days)
    $db->exec("DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)");
    echo "Cleaned up old audit logs.\n";

    // 3. Database backup (if configured)
    // checking specific provider logic...

    echo "Cron job completed successfully.\n";

} catch (Exception $e) {
    echo "Cron failed: " . $e->getMessage() . "\n";
    http_response_code(500);
}
