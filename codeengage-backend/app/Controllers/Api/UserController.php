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

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid user ID');
        }

        try {
            $user = $this->userRepository->findById($id);
            if (!$user) {
                ApiResponse::error('User not found', 404);
            }

            $filters = [
                'author_id' => $id,
                'user_id' => $this->auth->optional()?->getId(),
                'search' => $_GET['search'] ?? null,
                'language' => $_GET['language'] ?? null,
                'visibility' => $_GET['visibility'] ?? null
            ];

            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);

            $snippets = $this->userRepository->findSnippetsByUser($id, $filters, $limit, $offset);
            $total = $this->userRepository->countSnippetsByUser($id, $filters);

            ApiResponse::paginated($snippets, $total, $offset / $limit + 1, $limit);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch user snippets');
        }
    }

    public function achievements(string $method, array $params): void
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

            $limit = (int)($_GET['limit'] ?? 50);
            $achievements = $this->userRepository->getAchievements($id, $limit);

            ApiResponse::success(array_map(fn($a) => $a->toArray(), $achievements));

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch achievements');
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

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid user ID');
        }

        try {
            $currentUser = $this->auth->handle();
            
            if ($id !== $currentUser->getId()) {
                ApiResponse::error('Cannot view other users stats', 403);
            }

            // Calculate user statistics
            $snippets = $this->userRepository->findSnippetsByUser($id);
            $achievements = $this->userRepository->getAchievements($id);

            $stats = [
                'total_snippets' => count($snippets),
                'public_snippets' => count(array_filter($snippets, fn($s) => $s->getVisibility() === 'public')),
                'private_snippets' => count(array_filter($snippets, fn($s) => $s->getVisibility() === 'private')),
                'total_views' => array_sum(array_map(fn($s) => $s->getViewCount(), $snippets)),
                'total_stars' => array_sum(array_map(fn($s) => $s->getStarCount(), $snippets)),
                'total_achievements' => count($achievements),
                'achievement_points' => $currentUser->getAchievementPoints(),
                'languages_used' => array_unique(array_map(fn($s) => $s->getLanguage(), $snippets)),
                'join_date' => $currentUser->getCreatedAt()->format('Y-m-d'),
                'last_active' => $currentUser->getLastActiveAt()?->format('Y-m-d H:i:s')
            ];

            ApiResponse::success($stats);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch user statistics');
        }
    }
}