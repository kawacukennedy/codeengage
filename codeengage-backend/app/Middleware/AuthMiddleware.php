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
        // Check session first
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!empty($_SESSION['user_id'])) {
            $user = $this->userRepository->findById($_SESSION['user_id']);
            if ($user) {
                // Update last active timestamp
                $this->userRepository->updateLastActive($user->getId());
                return $user;
            }
        }

        // Check JWT token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            try {
                $payload = $this->validateJwtToken($matches[1]);
                if ($payload && isset($payload['user_id'])) {
                    $user = $this->userRepository->findById($payload['user_id']);
                    if ($user) {
                        return $user;
                    }
                }
            } catch (\Exception $e) {
                // Token is invalid
            }
        }

        return null;
    }

    private function validateJwtToken(string $token): ?array
    {
        $config = require __DIR__ . '/../../config/auth.php';
        $secret = $config['jwt']['secret'];

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        // Verify signature
        $signature = base64_decode(strtr($signatureEncoded, '-_', '+/'));
        $expectedSignature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
        
        if (!hash_equals($signature, $expectedSignature)) {
            return null;
        }

        // Check expiration
        $payload = json_decode(base64_decode(strtr($payloadEncoded, '-_', '+/')), true);
        if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    public function requireRole(string $role): \App\Models\User
    {
        $user = $this->handle();

        // Check if user has required role
        // This would involve checking user_roles and role_permissions tables
        // For now, we'll implement basic role checking
        
        return $user;
    }

    public function requirePermission(string $permission): \App\Models\User
    {
        $user = $this->handle();

        // Check if user has required permission
        // This would involve checking the role_permissions table
        // For now, we'll implement basic permission checking
        
        return $user;
    }
}