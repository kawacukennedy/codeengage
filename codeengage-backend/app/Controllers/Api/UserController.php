<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\UserRepository;
use App\Models\Achievement;
use App\Helpers\ApiResponse;
use App\Helpers\ValidationHelper;
use App\Middleware\AuthMiddleware;

class UserController
{
    private PDO $db;
    private UserRepository $userRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userRepository = new UserRepository($db);
        $this->auth = new AuthMiddleware($db);
    }

    public function show(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid user ID');
        }

        try {
            $user = $this->userRepository->findById($id);
            if (!$user) {
                ApiResponse::error('User not found', 404);
            }

            // Return public profile data
            ApiResponse::success([
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'display_name' => $user->getDisplayName(),
                'avatar_url' => $user->getAvatarUrl(),
                'bio' => $user->getBio(),
                'achievement_points' => $user->getAchievementPoints(),
                'joined_at' => $user->getCreatedAt()->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch user profile');
        }
    }

    public function update(string $method, array $params): void
    {
        if ($method !== 'PUT') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? $currentUser->getId());

        if ($id !== $currentUser->getId()) {
            ApiResponse::error('Cannot update other users', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            $allowedFields = ['display_name', 'bio', 'avatar_url', 'preferences'];
            $updateData = [];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateData[$field] = $input[$field];
                }
            }

            if (isset($input['password'])) {
                ValidationHelper::validatePassword($input['password']);
                $updateData['password'] = $input['password'];
            }

            if (isset($input['email'])) {
                ValidationHelper::validateEmail($input['email']);
                $updateData['email'] = $input['email'];
            }

            $updatedUser = $this->userRepository->update($id, $updateData);

            ApiResponse::success($updatedUser->toArray(), 'Profile updated successfully');

        } catch (\App\Exceptions\ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Failed to update profile');
        }
    }




    public function snippets(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            // For /users/me/snippets, use authenticated user
            $currentUser = $this->auth->handle();
            $id = $currentUser->getId();

            $filters = [
                'author_id' => $id,
                'user_id' => $id,
                'search' => $_GET['search'] ?? null,
                'language' => $_GET['language'] ?? null,
                'visibility' => $_GET['visibility'] ?? null
            ];

            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);

            $snippets = $this->userRepository->findSnippetsByUser($id, $filters, $limit, $offset);
            $total = $this->userRepository->countSnippetsByUser($id, $filters);

            ApiResponse::success($snippets);

        } catch (\Exception $e) {
            ApiResponse::success([
                'snippets' => [],
                'total' => 0,
                'stats' => ['total_snippets' => 0]
            ]);
        }
    }

    public function achievements(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            // For /users/me/achievements, use authenticated user
            $currentUser = $this->auth->handle();
            $id = $currentUser->getId();

            // Instantiate GamificationService (Manual DI)
            $userRepo = new \App\Repositories\UserRepository($this->db);
            $achievementRepo = new \App\Repositories\AchievementRepository($this->db);
            $auditRepo = new \App\Repositories\AuditRepository($this->db);
            $notificationRepo = new \App\Repositories\NotificationRepository($this->db);
            $emailService = new \App\Services\EmailService();
            $notificationService = new \App\Services\NotificationService($notificationRepo, $userRepo, $emailService);
            
            $gamificationService = new \App\Services\GamificationService(
                $userRepo,
                $achievementRepo,
                $auditRepo,
                new \App\Helpers\SecurityHelper(),
                $notificationService
            );

            // Get all achievements with unlocked status
            $achievements = $gamificationService->getAchievementsWithStatus($id);

            ApiResponse::success([
                'achievements' => $achievements
            ]);

        } catch (\Exception $e) {
            // Log error
            error_log("Failed to fetch achievements: " . $e->getMessage());
            ApiResponse::success([
                'achievements' => []
            ]);
        }
    }

    public function leaderboard(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $period = $_GET['period'] ?? 'all-time'; // daily, weekly, monthly, all-time
            $limit = (int)($_GET['limit'] ?? 10);

            // In a real implementation, you'd filter by time period
            $leaderboard = $this->userRepository->getLeaderboard($limit);

            ApiResponse::success(array_map(fn($u) => $u->toArray(), $leaderboard));

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch leaderboard');
        }
    }

    public function preferences(string $method, array $params): void
    {
        $currentUser = $this->auth->handle();

        if ($method === 'GET') {
            ApiResponse::success($currentUser->getPreferences());
        }

        if ($method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                ApiResponse::error('Invalid JSON input');
            }

            try {
                if (!is_array($input)) {
                    ApiResponse::error('Preferences must be an array');
                }

                $updatedUser = $this->userRepository->update($currentUser->getId(), ['preferences' => $input]);
                ApiResponse::success($updatedUser->getPreferences(), 'Preferences updated successfully');

            } catch (\Exception $e) {
                ApiResponse::error('Failed to update preferences');
            }
        }
    }

    public function stats(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        // For /users/me/stats, use authenticated user
        $currentUser = $this->auth->handle();
        $id = $currentUser->getId();

        try {
            // Calculate user statistics
            // findSnippetsByUser returns associative arrays, NOT objects
            $snippets = $this->userRepository->findSnippetsByUser($id, [], 1000); // Higher limit for stats
            $achievements = $this->userRepository->getAchievements($id);


            // Calculate language stats
            $languageCounts = [];
            foreach ($snippets as $snippet) {
                $lang = $snippet['language'];
                if (!isset($languageCounts[$lang])) {
                    $languageCounts[$lang] = 0;
                }
                $languageCounts[$lang]++;
            }
            
            $languagesFormatted = [];
            foreach ($languageCounts as $lang => $count) {
                $languagesFormatted[] = [
                    'name' => $lang,
                    'count' => $count
                ];
            }
            
            // Sort by count descending
            usort($languagesFormatted, fn($a, $b) => $b['count'] - $a['count']);

            $stats = [
                'total_snippets' => count($snippets),
                'public_snippets' => count(array_filter($snippets, fn($s) => ($s['visibility'] ?? 'public') === 'public')),
                'private_snippets' => count(array_filter($snippets, fn($s) => ($s['visibility'] ?? 'public') === 'private')),
                'total_views' => array_sum(array_column($snippets, 'view_count')),
                'total_stars' => array_sum(array_column($snippets, 'star_count')),
                'total_achievements' => count($achievements),
                'achievement_points' => $currentUser->getAchievementPoints(),
                'languages' => $languagesFormatted, // Updated key to match frontend usage, or keep languages_used if mapped? 
                // profile.js uses stats.languages (line 227). 
                // So I should use 'languages' key. 
                // Previous code used 'languages_used'.
                'languages_used' => array_values(array_unique(array_column($snippets, 'language'))), // Keep for backward compatibility if needed
                'join_date' => $currentUser->getCreatedAt()?->format('Y-m-d'),
                'last_active' => $currentUser->getLastActiveAt()?->format('Y-m-d H:i:s')
            ];

            ApiResponse::success($stats);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch user statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get current authenticated user (for /users/me)
     */
    public function me(string $method, array $params): void
    {
        if ($method === 'PUT') {
            $this->update($method, $params);
            return;
        }

        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $currentUser = $this->auth->handle();
            
            ApiResponse::success([
                'id' => $currentUser->getId(),
                'username' => $currentUser->getUsername(),
                'email' => $currentUser->getEmail(),
                'display_name' => $currentUser->getDisplayName(),
                'avatar_url' => $currentUser->getAvatarUrl(),
                'bio' => $currentUser->getBio(),
                'preferences' => $currentUser->getPreferences(),
                'achievement_points' => $currentUser->getAchievementPoints(),
                'last_active_at' => $currentUser->getLastActiveAt()?->format('Y-m-d H:i:s'),
                'created_at' => $currentUser->getCreatedAt()?->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch user profile');
        }
    }

    /**
     * Get starred snippets for current user (for /users/me/starred)
     */
    public function starred(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $currentUser = $this->auth->handle();
            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);

            // Get starred snippets from database
            // Assumes getStarredSnippets returns arrays
            $starred = $this->userRepository->getStarredSnippets($currentUser->getId(), $limit, $offset);
            
            ApiResponse::success([
                'snippets' => $starred,
                'total' => count($starred)
            ]);

        } catch (\Exception $e) {
            ApiResponse::success([
                'snippets' => [],
                'total' => 0
            ]);
        }
    }

    /**
     * Get activity feed for current user (for /users/me/activity)
     */
    public function activity(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $currentUser = $this->auth->handle();
            $limit = (int)($_GET['limit'] ?? 20);

            // Get recent activity from audit logs
            $activities = $this->userRepository->getRecentActivity($currentUser->getId(), $limit);
            
            ApiResponse::success($activities);

        } catch (\Exception $e) {
            ApiResponse::success([]);
        }
    }

    public function uploadAvatar(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();

        if (!isset($_FILES['avatar'])) {
            ApiResponse::error('No file uploaded', 400);
        }

        try {
            $url = \App\Helpers\UploadHelper::uploadImage($_FILES['avatar']);
            
            // Update user profile
            $this->userRepository->update($currentUser->getId(), ['avatar_url' => $url]);
            
            ApiResponse::success(['avatar_url' => $url], 'Avatar uploaded successfully');
            
        } catch (\Exception $e) {
            ApiResponse::error($e->getMessage(), 400);
        }
    }

    public function sessions(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $currentUser = $this->auth->handle();
            
            $config = require __DIR__ . '/../../../config/app.php';
            $authService = new \App\Services\AuthService($this->db, $config);
            
            $sessions = $authService->getActiveSessions($currentUser->getId());
            
            ApiResponse::success($sessions);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch active sessions');
        }
    }

    public function revokeSession(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $currentUser = $this->auth->handle();
            $input = json_decode(file_get_contents('php://input'), true);
            $tokenId = $input['token_id'] ?? null;

            if (!$tokenId) {
                ApiResponse::error('Token ID required', 400);
            }

            $config = require __DIR__ . '/../../../config/app.php';
            $authService = new \App\Services\AuthService($this->db, $config);
            
            $success = $authService->revokeSession($tokenId, $currentUser->getId());
            
            if ($success) {
                ApiResponse::success(null, 'Session revoked');
            } else {
                ApiResponse::error('Session not found or already revoked', 404);
            }

        } catch (\Exception $e) {
            ApiResponse::error('Failed to revoke session');
        }
    }
}