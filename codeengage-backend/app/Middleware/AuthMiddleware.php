<?php

namespace App\Middleware;

use PDO;
use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;

class AuthMiddleware
{
    private PDO $db;
    private UserRepository $userRepository;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userRepository = new UserRepository($db);
    }

    public function handle(): ?\App\Models\User
    {
        $user = $this->authenticate();

        if (!$user) {
            ApiResponse::error('Authentication required', 401);
            exit;
        }

        return $user;
    }

    public function optional(): ?\App\Models\User
    {
        return $this->authenticate();
    }

    private function authenticate(): ?\App\Models\User
    {
        // 1. Check API Key (Header: X-API-KEY)
        $headers = getallheaders();
        $apiKey = $headers['X-API-KEY'] ?? $headers['x-api-key'] ?? ''; // Case insensitive check
        
        if ($apiKey) {
            $apiKeyRepo = new \App\Repositories\ApiKeyRepository($this->db);
            $key = $apiKeyRepo->findByKey($apiKey);
            
            if ($key) {
                $apiKeyRepo->updateLastUsed($key->getId());
                return $this->userRepository->findById($key->getUserId());
            }
        }

        // 2. Check Session (started by index.php)
        if (!empty($_SESSION['user_id'])) {
            $user = $this->userRepository->findById($_SESSION['user_id']);
            if ($user) {
                // Update last active timestamp
                $this->userRepository->updateLastActive($user->getId());
                return $user;
            }
        }

        // 3. Check JWT Token (Bearer)
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $config = require __DIR__ . '/../../config/auth.php';
            $secret = $config['jwt']['secret'] ?? 'default_secret'; // Fallback
            
            $payload = \App\Helpers\SecurityHelper::validateJwtToken($token, $secret);
            
            if ($payload && isset($payload['user_id'])) {
                $user = $this->userRepository->findById($payload['user_id']);
                if ($user) {
                    $_SESSION['user_id'] = $user->getId();
                    $_SESSION['role'] = $user->getRole();
                    return $user;
                }
            }
        }

        return null;
    }

    public function requireRole(string $role): \App\Models\User
    {
        $user = $this->handle();
        // Role check logic...
        return $user;
    }

    public function requirePermission(string $permission): \App\Models\User
    {
        $user = $this->handle();
        // Permission check logic...
        return $user;
    }
}