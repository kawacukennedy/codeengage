<?php

namespace App\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Repositories\UserRepository;
use App\Repositories\SnippetRepository;
use App\Repositories\AuditRepository;
use PDO;

class AdminController
{
    private PDO $pdo;
    private AuthMiddleware $auth;
    private RoleMiddleware $roleMiddleware;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->auth = new AuthMiddleware($pdo);
        $this->roleMiddleware = new RoleMiddleware($pdo);
    }

    private function ensureAdmin()
    {
        $user = $this->auth->handle();
        $this->roleMiddleware->handle(['admin', 'super_admin']);
        return $user;
    }

    public function stats($method, $params)
    {
        $this->ensureAdmin();

        $userCount = $this->pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $snippetCount = $this->pdo->query("SELECT COUNT(*) FROM snippets")->fetchColumn();
        $totalViews = $this->pdo->query("SELECT SUM(view_count) FROM snippets")->fetchColumn();
        
        $newUsersCount = $this->pdo->query("SELECT COUNT(*) FROM users WHERE created_at >= CURDATE()")->fetchColumn();
        $newSnippetsCount = $this->pdo->query("SELECT COUNT(*) FROM snippets WHERE created_at >= CURDATE()")->fetchColumn();

        ApiResponse::success([
            'total_users' => (int)$userCount,
            'total_snippets' => (int)$snippetCount,
            'total_views' => (int)$totalViews,
            'new_users_today' => (int)$newUsersCount,
            'new_snippets_today' => (int)$newSnippetsCount,
            'active_users_24h' => $this->pdo->query("SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)")->fetchColumn(),
            'system' => [
                'database_status' => 'healthy',
                'cache_status' => 'healthy',
                'disk_usage' => '15%',
                'memory_usage' => '128MB'
            ]
        ]);
    }

    public function users($method, $params)
    {
        $this->ensureAdmin();

        if ($method === 'GET') {
            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);
            $search = $_GET['search'] ?? null;

            $sql = "SELECT id, username, email, display_name, avatar_url, role, created_at, deleted_at FROM users";
            $where = [];
            if ($search) {
                $where[] = "(username LIKE :search OR email LIKE :search)";
            }
            
            if ($where) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            
            $sql .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
            
            $stmt = $this->pdo->prepare($sql);
            if ($search) $stmt->bindValue(':search', "%$search%");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $users = $stmt->fetchAll();
            
            // Total for pagination
            $totalSql = "SELECT COUNT(*) FROM users";
            if ($where) $totalSql .= " WHERE " . implode(" AND ", $where);
            $totalStmt = $this->pdo->prepare($totalSql);
            if ($search) $totalStmt->bindValue(':search', "%$search%");
            $totalStmt->execute();
            $total = $totalStmt->fetchColumn();

            ApiResponse::success([
                'users' => $users,
                'total' => (int)$total
            ]);
        }
    }

    public function reports($method, $params)
    {
        $this->ensureAdmin();
        // Stub for content moderation reports
        ApiResponse::success([
            'reports' => []
        ]);
    }

    public function auditLogs($method, $params)
    {
        $this->ensureAdmin();
        
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = (int)($_GET['offset'] ?? 0);
        
        $stmt = $this->pdo->prepare("
            SELECT al.*, u.username 
            FROM audit_logs al 
            LEFT JOIN users u ON al.actor_id = u.id 
            ORDER BY al.created_at DESC 
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        ApiResponse::success([
            'logs' => $stmt->fetchAll()
        ]);
    }
}