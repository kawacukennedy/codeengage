<?php

namespace App\Controllers\Api;

use App\Services\AuthService;
use App\Helpers\ApiResponse;
use PDO;

class AuthController extends BaseController
{
    private $authService;

    public function __construct(PDO $pdo)
    {
        parent::__construct($pdo);
        $this->authService = new AuthService($pdo, $this->config);
    }

    public function login($method, $params)
    {
        $this->requirePost($method);
        $this->setResponseHeaders();

        try {
            $input = $this->getJsonInput();
            $this->requireFields($input, ['email', 'password']);
            $this->validateInput($input, [
                'email' => ['required', 'email'],
                'password' => ['required', ['min' => 6]]
            ]);

            $ipAddress = $this->getClientIp();
            $userAgent = $this->getUserAgent();
            
            $result = $this->authService->login(
                $input['email'], 
                $input['password'],
                $ipAddress,
                $userAgent
            );
            
            ApiResponse::success($result, 'Login successful');

        } catch (\Exception $e) {
            $this->handleException($e, [
                'error_type' => 'login_failed',
                'action' => 'user_login',
                'email_provided' => !empty($input['email'] ?? '')
            ], 400);
        }
    }

    public function register($method, $params)
    {
        $this->requirePost($method);
        $this->setResponseHeaders();

        try {
            $input = $this->getJsonInput();
            $this->requireFields($input, ['email', 'password', 'username']);
            $this->validateInput($input, [
                'email' => ['required', 'email'],
                'password' => ['required', ['min' => 8]],
                'username' => ['required', ['min' => 3], ['max' => 50]],
                'display_name' => [['max' => 100]]
            ]);

            $result = $this->authService->register($input);
            
            ApiResponse::success($result, 'Registration successful', 201);

        } catch (\Exception $e) {
            $this->handleException($e, [
                'error_type' => 'registration_failed',
                'action' => 'user_registration',
                'email_provided' => !empty($input['email'] ?? ''),
                'username_provided' => !empty($input['username'] ?? '')
            ], 400);
        }
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
        $userId = $this->getCurrentUserId();
        
        // Try to get user from token if not in session
        if (!$userId) {
            try {
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
        }

        if ($userId) {
            $this->authService->logout($userId, $allDevices);
        }
        
        ApiResponse::success(null, 'Logged out successfully');
    }

    public function me($method, $params)
    {
        $this->requireGet($method);
        $this->setResponseHeaders();

        try {
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            
            if (empty($authHeader)) {
                $this->handleException(new \Exception('Authorization header required'), [
                    'error_type' => 'authentication_required',
                    'action' => 'get_user_profile'
                ], 401);
            }

            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
                $config = require __DIR__ . '/../../../config/auth.php';
                $payload = \App\Helpers\SecurityHelper::validateJwtToken($token, $config['jwt']['secret']);
                
                if ($payload && isset($payload['user_id'])) {
                    // For now, return basic payload info
                    // TODO: Get full user profile from database
                    ApiResponse::success([
                        'user_id' => $payload['user_id'], 
                        'username' => $payload['username'] ?? null,
                        'role' => $payload['role'] ?? 'user',
                        'email_verified' => $payload['email_verified'] ?? false
                    ], 'User profile');
                    return;
                }
            }
            
            $this->handleException(new \Exception('Invalid or expired authentication token'), [
                'error_type' => 'authentication_failed',
                'action' => 'get_user_profile'
            ], 401);

        } catch (\Exception $e) {
            $this->handleException($e, [
                'error_type' => 'authentication_failed',
                'action' => 'get_user_profile'
            ], 401);
        }
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