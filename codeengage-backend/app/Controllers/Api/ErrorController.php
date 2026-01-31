<?php

namespace App\Controllers\Api;

use PDO;
use App\Helpers\ApiResponse;
use App\Helpers\SecurityHelper;
use App\Services\LoggerService;

class ErrorController
{
    private PDO $db;
    private LoggerService $logger;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->logger = new LoggerService();
    }

    /**
     * Handle frontend error reports
     */
    public function report(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            // Get JSON input
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                ApiResponse::error('Invalid JSON input', 400);
            }

            // Validate required fields
            $required = ['message'];
            foreach ($required as $field) {
                if (empty($input[$field])) {
                    ApiResponse::error("Missing required field: {$field}", 400);
                }
            }

            // Sanitize input
            $errorData = $this->sanitizeErrorData($input);

            // Log the error
            $this->logFrontendError($errorData);

            // Store in database if we have an errors table
            $this->storeErrorInDatabase($errorData);

            // Return success response
            ApiResponse::success(['message' => 'Error reported successfully']);

        } catch (\Exception $e) {
            // Log the error logging failure
            $this->logger->error('Failed to process frontend error report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'input' => $input ?? []
            ]);

            // Don't expose internal errors to frontend
            ApiResponse::error('Failed to process error report', 500);
        }
    }

    /**
     * Get error statistics (admin only)
     */
    public function stats(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        // Check admin permissions (you would implement this based on your auth system)
        if (!$this->isAdmin()) {
            ApiResponse::error('Admin access required', 403);
        }

        try {
            $stats = $this->getErrorStatistics();
            ApiResponse::success($stats);

        } catch (\Exception $e) {
            $this->logger->error('Failed to get error statistics', [
                'error' => $e->getMessage()
            ]);
            ApiResponse::error('Failed to get statistics', 500);
        }
    }

    /**
     * Sanitize error data to prevent injection
     */
    private function sanitizeErrorData(array $data): array
    {
        $sanitized = [];

        // Basic fields
        $sanitized['message'] = substr(trim($data['message']), 0, 1000);
        $sanitized['stack'] = isset($data['stack']) ? substr(trim($data['stack']), 0, 5000) : null;
        
        // Context data
        $sanitized['context'] = [];
        if (isset($data['context']) && is_array($data['context'])) {
            $context = $data['context'];
            
            // Sanitize specific context fields
            $sanitized['context']['type'] = substr($context['type'] ?? '', 0, 100);
            $sanitized['context']['filename'] = substr($context['filename'] ?? '', 0, 500);
            $sanitized['context']['lineno'] = is_numeric($context['lineno'] ?? '') ? (int)$context['lineno'] : null;
            $sanitized['context']['colno'] = is_numeric($context['colno'] ?? '') ? (int)$context['colno'] : null;
            $sanitized['context']['userAgent'] = substr($context['userAgent'] ?? '', 0, 500);
            $sanitized['context']['url'] = substr($context['url'] ?? '', 0, 1000);
            $sanitized['context']['timestamp'] = $context['timestamp'] ?? date('Y-m-d H:i:s');
            $sanitized['context']['userId'] = is_numeric($context['userId'] ?? '') ? (int)$context['userId'] : null;
            $sanitized['context']['sessionId'] = substr($context['sessionId'] ?? '', 0, 100);
        }

        // Add server context
        $sanitized['server_context'] = [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
            'request_id' => $this->getOrCreateRequestId(),
            'timestamp' => date('Y-m-d H:i:s')
        ];

        return $sanitized;
    }

    /**
     * Log frontend error to structured logs
     */
    private function logFrontendError(array $errorData): void
    {
        $this->logger->error('Frontend Error Report', [
            'message' => $errorData['message'],
            'type' => $errorData['context']['type'] ?? 'unknown',
            'user_id' => $errorData['context']['userId'] ?? null,
            'session_id' => $errorData['context']['sessionId'] ?? null,
            'url' => $errorData['context']['url'] ?? null,
            'filename' => $errorData['context']['filename'] ?? null,
            'line' => $errorData['context']['lineno'] ?? null,
            'stack' => $errorData['stack'] ?? null,
            'request_id' => $errorData['server_context']['request_id'],
            'ip' => $errorData['server_context']['ip']
        ]);
    }

    /**
     * Store error in database for analytics
     */
    private function storeErrorInDatabase(array $errorData): void
    {
        try {
            // Check if frontend_errors table exists
            $tableCheck = $this->db->query("
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'frontend_errors'
            ")->fetch()['count'];

            if ($tableCheck == 0) {
                // Create table if it doesn't exist
                $this->createErrorsTable();
            }

            // Insert error record
            $stmt = $this->db->prepare("
                INSERT INTO frontend_errors (
                    message, stack, error_type, user_id, session_id, 
                    url, filename, line_number, user_agent, ip_address, 
                    request_id, created_at
                ) VALUES (
                    :message, :stack, :error_type, :user_id, :session_id,
                    :url, :filename, :line_number, :user_agent, :ip_address,
                    :request_id, NOW()
                )
            ");

            $stmt->execute([
                ':message' => $errorData['message'],
                ':stack' => $errorData['stack'],
                ':error_type' => $errorData['context']['type'] ?? 'unknown',
                ':user_id' => $errorData['context']['userId'],
                ':session_id' => $errorData['context']['sessionId'],
                ':url' => $errorData['context']['url'],
                ':filename' => $errorData['context']['filename'],
                ':line_number' => $errorData['context']['lineno'],
                ':user_agent' => $errorData['context']['userAgent'],
                ':ip_address' => $errorData['server_context']['ip'],
                ':request_id' => $errorData['server_context']['request_id']
            ]);

        } catch (\Exception $e) {
            // Log database error but don't fail the request
            $this->logger->error('Failed to store frontend error in database', [
                'error' => $e->getMessage(),
                'error_data' => $errorData
            ]);
        }
    }

    /**
     * Create frontend_errors table if it doesn't exist
     */
    private function createErrorsTable(): void
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS frontend_errors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message TEXT NOT NULL,
                stack LONGTEXT,
                error_type VARCHAR(100) DEFAULT 'unknown',
                user_id INT NULL,
                session_id VARCHAR(100) NULL,
                url VARCHAR(1000) NULL,
                filename VARCHAR(500) NULL,
                line_number INT NULL,
                user_agent VARCHAR(500) NULL,
                ip_address VARCHAR(45) NULL,
                request_id VARCHAR(64) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_error_type (error_type),
                INDEX idx_user_id (user_id),
                INDEX idx_session_id (session_id),
                INDEX idx_created_at (created_at),
                INDEX idx_request_id (request_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";

        $this->db->exec($sql);
    }

    /**
     * Get error statistics for admin dashboard
     */
    private function getErrorStatistics(): array
    {
        try {
            $tableCheck = $this->db->query("
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name = 'frontend_errors'
            ")->fetch()['count'];

            if ($tableCheck == 0) {
                return [
                    'total_errors' => 0,
                    'recent_24h' => 0,
                    'top_errors' => [],
                    'by_type' => [],
                    'by_hour' => []
                ];
            }

            // Total errors
            $total = $this->db->query("SELECT COUNT(*) as count FROM frontend_errors")->fetch()['count'];

            // Recent 24 hours
            $recent = $this->db->query("
                SELECT COUNT(*) as count 
                FROM frontend_errors 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ")->fetch()['count'];

            // Top errors
            $topErrors = $this->db->query("
                SELECT message, COUNT(*) as count 
                FROM frontend_errors 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY message 
                ORDER BY count DESC 
                LIMIT 10
            ")->fetchAll(PDO::FETCH_ASSOC);

            // By type
            $byType = $this->db->query("
                SELECT error_type, COUNT(*) as count 
                FROM frontend_errors 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY error_type 
                ORDER BY count DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            // By hour (last 24 hours)
            $byHour = $this->db->query("
                SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as count 
                FROM frontend_errors 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                GROUP BY HOUR(created_at) 
                ORDER BY hour
            ")->fetchAll(PDO::FETCH_ASSOC);

            return [
                'total_errors' => (int)$total,
                'recent_24h' => (int)$recent,
                'top_errors' => $topErrors,
                'by_type' => $byType,
                'by_hour' => $byHour
            ];

        } catch (\Exception $e) {
            $this->logger->error('Failed to get error statistics', [
                'error' => $e->getMessage()
            ]);
            return [
                'error' => 'Failed to retrieve statistics'
            ];
        }
    }

    /**
     * Check if current user is admin
     */
    private function isAdmin(): bool
    {
        // This would depend on your authentication system
        // For now, return false (implement based on your auth)
        return false;
    }

    /**
     * Get or create request ID for tracking
     */
    private function getOrCreateRequestId(): string
    {
        $requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? null;
        
        if (!$requestId) {
            $requestId = uniqid('req_', true);
        }
        
        return $requestId;
    }
}