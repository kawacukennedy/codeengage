<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\UserRepository;
use App\Repositories\SnippetRepository;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class AdminController
{
    private PDO $db;
    private UserRepository $userRepository;
    private SnippetRepository $snippetRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userRepository = new UserRepository($db);
        $this->snippetRepository = new SnippetRepository($db);
        $this->auth = new AuthMiddleware($db);
    }

    public function index(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->requireRole('admin');

        try {
            // Get system statistics
            $stats = $this->getSystemStats();

            ApiResponse::success([
                'stats' => $stats,
                'recent_users' => $this->userRepository->findMany([], 10),
                'recent_snippets' => $this->snippetRepository->findMany(['visibility' => 'public'], 10),
                'system_health' => $this->getSystemHealth()
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to load admin dashboard');
        }
    }

    public function users(string $method, array $params): void
    {
        $currentUser = $this->auth->requireRole('admin');

        switch ($method) {
            case 'GET':
                $this->getUsers();
                break;
            case 'PUT':
                $this->updateUser($params[0] ?? 0);
                break;
            case 'DELETE':
                $this->deleteUser($params[0] ?? 0);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    }

    public function auditLogs(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->requireRole('admin');

        try {
            $filters = [
                'action_type' => $_GET['action_type'] ?? null,
                'entity_type' => $_GET['entity_type'] ?? null,
                'actor_id' => $_GET['actor_id'] ?? null,
                'date_from' => $_GET['date_from'] ?? null,
                'date_to' => $_GET['date_to'] ?? null
            ];

            $limit = (int)($_GET['limit'] ?? 100);
            $offset = (int)($_GET['offset'] ?? 0);

            $logs = $this->getAuditLogs($filters, $limit, $offset);
            $total = $this->countAuditLogs($filters);

            ApiResponse::paginated($logs, $total, $offset / $limit + 1, $limit);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch audit logs');
        }
    }

    public function moderation(string $method, array $params): void
    {
        $currentUser = $this->auth->requireRole('admin');

        switch ($method) {
            case 'GET':
                $this->getModerationQueue();
                break;
            case 'POST':
                $this->moderateSnippet($params[0] ?? 0);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    }

    public function cache(string $method, array $params): void
    {
        $currentUser = $this->auth->requireRole('admin');

        if ($method === 'DELETE') {
            $this->clearCache();
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    private function getUsers(): void
    {
        $filters = [
            'search' => $_GET['search'] ?? null,
            'achievement_points_min' => $_GET['achievement_points_min'] ?? null
        ];

        $limit = (int)($_GET['limit'] ?? 50);
        $offset = (int)($_GET['offset'] ?? 0);

        $users = $this->userRepository->findMany($filters, $limit, $offset);
        $total = $this->userRepository->count($filters);

        ApiResponse::paginated($users, $total, $offset / $limit + 1, $limit);
    }

    private function updateUser(int $userId): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            $allowedFields = ['display_name', 'bio', 'achievement_points', 'deleted_at'];
            $updateData = [];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateData[$field] = $input[$field];
                }
            }

            $user = $this->userRepository->update($userId, $updateData);

            ApiResponse::success($user->toArray(), 'User updated successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to update user');
        }
    }

    private function deleteUser(int $userId): void
    {
        try {
            $this->userRepository->delete($userId);
            ApiResponse::success(null, 'User deleted successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to delete user');
        }
    }

    private function getSystemStats(): array
    {
        return [
            'total_users' => $this->countTableRows('users'),
            'total_snippets' => $this->countTableRows('snippets'),
            'public_snippets' => $this->countTableRows('snippets', 'visibility = "public"'),
            'private_snippets' => $this->countTableRows('snippets', 'visibility = "private"'),
            'total_collaboration_sessions' => $this->countTableRows('collaboration_sessions'),
            'active_sessions_last_hour' => $this->countTableRows('collaboration_sessions', 'last_activity > DATE_SUB(NOW(), INTERVAL 1 HOUR)'),
            'total_code_analyses' => $this->countTableRows('code_analyses'),
            'total_achievements' => $this->countTableRows('achievements'),
            'storage_size' => $this->getStorageSize(),
            'last_backup' => $this->getLastBackupTime(),
            'system_uptime' => $this->getSystemUptime()
        ];
    }

    private function getSystemHealth(): array
    {
        return [
            'database' => $this->checkDatabaseHealth(),
            'cache' => $this->checkCacheHealth(),
            'storage' => $this->checkStorageHealth(),
            'memory_usage' => $this->getMemoryUsage(),
            'disk_usage' => $this->getDiskUsage()
        ];
    }

    private function getAuditLogs(array $filters, int $limit, int $offset): array
    {
        $sql = "SELECT al.*, u.username as actor_name 
                 FROM audit_logs al 
                 LEFT JOIN users u ON al.actor_id = u.id 
                 WHERE 1=1";

        $params = [];
        
        if (!empty($filters['action_type'])) {
            $sql .= " AND al.action_type = :action_type";
            $params[':action_type'] = $filters['action_type'];
        }
        
        if (!empty($filters['entity_type'])) {
            $sql .= " AND al.entity_type = :entity_type";
            $params[':entity_type'] = $filters['entity_type'];
        }
        
        if (!empty($filters['actor_id'])) {
            $sql .= " AND al.actor_id = :actor_id";
            $params[':actor_id'] = $filters['actor_id'];
        }
        
        if (!empty($filters['date_from'])) {
            $sql .= " AND al.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $sql .= " AND al.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    private function countAuditLogs(array $filters): int
    {
        $sql = "SELECT COUNT(*) as total FROM audit_logs WHERE 1=1";
        $params = [];
        
        if (!empty($filters['action_type'])) {
            $sql .= " AND action_type = :action_type";
            $params[':action_type'] = $filters['action_type'];
        }
        
        if (!empty($filters['entity_type'])) {
            $sql .= " AND entity_type = :entity_type";
            $params[':entity_type'] = $filters['entity_type'];
        }
        
        if (!empty($filters['actor_id'])) {
            $sql .= " AND actor_id = :actor_id";
            $params[':actor_id'] = $filters['actor_id'];
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $sql .= " AND created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return (int)$stmt->fetch()['total'];
    }

    private function getModerationQueue(): void
    {
        // Get reports, flagged content, etc.
        $sql = "SELECT s.*, u.username as author_name 
                 FROM snippets s 
                 LEFT JOIN users u ON s.author_id = u.id 
                 WHERE s.deleted_at IS NULL 
                 AND (s.report_count > 0 OR s.moderation_flag = 1)
                 ORDER BY s.created_at DESC
                 LIMIT 50";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        ApiResponse::success($stmt->fetchAll());
    }

    private function moderateSnippet(int $snippetId): void
    {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            $action = $input['action'] ?? 'approve';
            
            $sql = "UPDATE snippets SET moderation_flag = 0, moderated_by = :moderator_id, moderated_at = NOW() 
                     WHERE id = :id";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':moderator_id' => $this->auth->handle()->getId(),
                ':id' => $snippetId
            ]);

            ApiResponse::success(null, "Snippet {$action}d successfully");

        } catch (\Exception $e) {
            ApiResponse::error('Failed to moderate snippet');
        }
    }

    private function clearCache(): void
    {
        try {
            $cleared = 0;
            
            // Clear APCu cache if available
            if (function_exists('apcu_clear')) {
                \apcu_clear();
                $cleared++;
            }
            
            // Clear file cache
            $cacheDir = __DIR__ . '/../../storage/cache';
            if (is_dir($cacheDir)) {
                $files = glob($cacheDir . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        unlink($file);
                        $cleared++;
                    }
                }
            }

            ApiResponse::success(['files_cleared' => $cleared], 'Cache cleared successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to clear cache');
        }
    }

    private function countTableRows(string $table, string $where = '1=1'): int
    {
        $sql = "SELECT COUNT(*) as total FROM {$table} WHERE {$where}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return (int)$stmt->fetch()['total'];
    }

    private function getStorageSize(): array
    {
        $storageDir = __DIR__ . '/../../storage';
        $size = 0;
        
        if (is_dir($storageDir)) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($storageDir),
                RecursiveIteratorIterator::SELF_FIRST
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $size += $file->getSize();
                }
            }
        }

        return [
            'bytes' => $size,
            'human' => $this->formatBytes($size)
        ];
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }

    private function getLastBackupTime(): ?string
    {
        // This would check backup logs
        return date('Y-m-d H:i:s', strtotime('-1 day')); // Placeholder
    }

    private function getSystemUptime(): string
    {
        // This would get actual system uptime
        return '2 days, 14 hours'; // Placeholder
    }

    private function checkDatabaseHealth(): array
    {
        try {
            $stmt = $this->db->query('SELECT 1');
            $stmt->fetch();
            
            return ['status' => 'healthy', 'message' => 'Database connection OK'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'message' => $e->getMessage()];
        }
    }

    private function checkCacheHealth(): array
    {
        if (function_exists('apcu_cache_info')) {
            $info = \apcu_cache_info();
            return [
                'status' => 'healthy',
                'type' => 'APCu',
                'memory_usage' => $info['mem_usage'] ?? 'unknown'
            ];
        }
        
        return ['status' => 'disabled', 'type' => 'None'];
    }

    private function checkStorageHealth(): array
    {
        $storageDir = __DIR__ . '/../../storage';
        $writable = is_writable($storageDir);
        
        return [
            'status' => $writable ? 'healthy' : 'unhealthy',
            'writable' => $writable
        ];
    }

    private function getMemoryUsage(): array
    {
        if (function_exists('memory_get_usage')) {
            $usage = memory_get_usage(true);
            return [
                'used' => $this->formatBytes($usage),
                'peak' => $this->formatBytes(memory_get_peak_usage(true))
            ];
        }
        
        return ['used' => 'unknown', 'peak' => 'unknown'];
    }

    private function getDiskUsage(): array
    {
        $total = disk_total_space('/');
        $free = disk_free_space('/');
        $used = $total - $free;
        
        if ($total > 0) {
            return [
                'total' => $this->formatBytes($total),
                'used' => $this->formatBytes($used),
                'free' => $this->formatBytes($free),
                'percentage' => round(($used / $total) * 100, 2)
            ];
        }
        
        return ['total' => 'unknown', 'used' => 'unknown', 'free' => 'unknown'];
    }
}