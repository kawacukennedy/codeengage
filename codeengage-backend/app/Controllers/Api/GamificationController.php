<?php

namespace App\Controllers\Api;

use PDO;
use App\Services\GamificationService;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;

class GamificationController
{
    private GamificationService $service;
    private AuthMiddleware $auth;
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->auth = new AuthMiddleware($pdo);
        
        $userRepo = new \App\Repositories\UserRepository($pdo);
        $achievementRepo = new \App\Repositories\AchievementRepository($pdo);
        $auditRepo = new \App\Repositories\AuditRepository($pdo);
        $notificationRepo = new \App\Repositories\NotificationRepository($pdo);
        
        $emailService = new \App\Services\EmailService();
        $notificationService = new \App\Services\NotificationService($notificationRepo, $userRepo, $emailService);
        
        $this->service = new GamificationService(
            $userRepo,
            $achievementRepo,
            $auditRepo,
            new \App\Helpers\SecurityHelper(),
            $notificationService
        );
    }

    public function leaderboard($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        
        $type = $_GET['type'] ?? 'points';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        
        try {
            $leaderboard = $this->service->getLeaderboard($type, $limit);
            ApiResponse::success($leaderboard);
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 400);
        }
    }

    public function achievements($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        
        $achievements = $this->service->getAchievementsWithStatus($user->getId());
        ApiResponse::success($achievements);
    }

    public function stats($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        $user = $this->auth->handle();
        
        try {
            $stats = $this->service->getUserStats($user->getId());
            ApiResponse::success($stats);
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 404);
        }
    }

    public function globalStats($method, $params)
    {
        if ($method !== 'GET') ApiResponse::error('Method not allowed', 405);
        
        $stats = $this->service->getGlobalStats();
        ApiResponse::success($stats);
    }
}
