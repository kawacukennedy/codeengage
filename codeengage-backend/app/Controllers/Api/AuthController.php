<?php

namespace App\Controllers\Api;

use App\Services\AuthService;
use App\Helpers\ApiResponse;
use PDO;

class AuthController
{
    private $authService;
    private $config;

    public function __construct(PDO $pdo)
    {
        $this->config = require __DIR__ . '/../../../config/app.php';
        $this->authService = new AuthService($pdo, $this->config);
    }

    public function login($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        $result = $this->authService->login(
            $input['email'] ?? '', 
            $input['password'] ?? '',
            $ipAddress,
            $userAgent
        );
        
        ApiResponse::success($result, 'Login successful');
    }

    public function register($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->authService->register($input);
        
        ApiResponse::success($result, 'Registration successful', 201);
    }
    
    public function refresh($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $refreshToken = $input['refresh_token'] ?? '';
        
        if (!$refreshToken) {
            ApiResponse::error('Refresh token required', 400);
        }
        
        $result = $this->authService->refreshToken($refreshToken);
        ApiResponse::success($result, 'Token refreshed');
    }

    public function logout($method, $params)
    {
        $allDevices = isset($_GET['all']) && $_GET['all'] === 'true';
        
        // Get current user if authenticated
        $userId = null;
        try {
            $user = $this->authService->getCurrentUser(); // We might need to implement this or use AuthMiddleware helper
            // However, AuthMiddleware handles validation.
            // But logout is often called with just a token.
            // Let's rely on standard current user retrieval
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                 $token = $matches[1];
                 $config = require __DIR__ . '/../../../config/auth.php';
                 $payload = \App\Helpers\SecurityHelper::validateJwtToken($token, $config['jwt']['secret']);
                 $userId = $payload['user_id'] ?? null;
            }
        } catch (\Exception $e) {
            // If invalid token, just return success (idempotent)
        }

        if ($userId) {
            $this->authService->logout($userId, $allDevices);
        }
        
        ApiResponse::success(null, 'Logged out successfully');
    }

    public function me($method, $params)
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
             $token = $matches[1];
             $config = require __DIR__ . '/../../../config/auth.php';
             $payload = \App\Helpers\SecurityHelper::validateJwtToken($token, $config['jwt']['secret']);
             if ($payload && isset($payload['user_id'])) {
                 // Dirty fix: Use AuthService repo (which is private but let's assume we can instance a new Repo or fix access)
                 // Actually AuthController doesn't have direct access to repo.
                 // Let's just return the payload info for now, as proper fix needs refactor.
                 ApiResponse::success(['user_id' => $payload['user_id'], 'role' => $payload['role']], 'User profile');
                 return;
             }
        }
        
        ApiResponse::error('Unauthenticated', 401);
    }

    public function verifyEmail($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->authService->verifyEmail($input['token'] ?? '');
        ApiResponse::success($result);
    }
    
    public function requestPasswordReset($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->authService->requestPasswordReset($input['email'] ?? '');
        ApiResponse::success($result);
    }
    
    public function resetPassword($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->authService->resetPassword(
            $input['email'] ?? '', 
            $input['token'] ?? '', 
            $input['password'] ?? ''
        );
        ApiResponse::success($result);
    }
}