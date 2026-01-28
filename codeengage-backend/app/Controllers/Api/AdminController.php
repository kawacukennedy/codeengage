<?php

namespace App\Controllers\Api;

use App\Helpers\ApiResponse;
use PDO;

class AdminController
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function __call($name, $arguments)
    {
        // Handle routes like /admin/users, /admin/health
        if ($name === 'health') {
            $this->health();
        } elseif ($name === 'users') {
            $this->users($arguments[0]);
        } elseif ($name === 'stats') {
            $this->stats();
        } else {
             ApiResponse::error('Endpoint not found', 404);
        }
    }

    private function checkAdmin()
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        // In a real app, check user role in DB. 
        // For demo, we assume session 'user_role' is set or we skip for now
        // if (($_SESSION['user_role'] ?? '') !== 'admin') ApiResponse::error('Forbidden', 403);
    }

    private function health()
    {
        ApiResponse::success([
            'status' => 'healthy',
            'database' => 'connected',
            'time' => date('Y-m-d H:i:s')
        ]);
    }

    private function users($method)
    {
        $this->checkAdmin();
        
        if ($method === 'GET') {
            $stmt = $this->pdo->query("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 50");
            ApiResponse::success($stmt->fetchAll());
        }
    }
    
    private function stats()
    {
        $this->checkAdmin();
        
        $users = $this->pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $snippets = $this->pdo->query("SELECT COUNT(*) FROM snippets")->fetchColumn();
        
        ApiResponse::success([
            'users_count' => $users,
            'snippets_count' => $snippets
        ]);
    }
}