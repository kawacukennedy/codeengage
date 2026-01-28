<?php

namespace App\Services;

use App\Models\User;
use App\Helpers\ApiResponse;

class AuthService
{
    private $userModel;
    private $config;

    public function __construct($pdo, $config)
    {
        $this->userModel = new User($pdo);
        $this->config = $config;
    }

    public function register(array $data)
    {
        // Validation (Basic)
        if (empty($data['email']) || empty($data['password']) || empty($data['username'])) {
            ApiResponse::error('Missing required fields', 422);
        }

        if ($this->userModel->findByEmail($data['email'])) {
            ApiResponse::error('Email already exists', 409);
        }

        // Hash password
        $data['password_hash'] = password_hash($data['password'], PASSWORD_ARGON2ID);
        
        $userId = $this->userModel->create($data);
        
        return $this->login($data['email'], $data['password']);
    }

    public function login($email, $password)
    {
        $user = $this->userModel->findByEmail($email);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            ApiResponse::error('Invalid credentials', 401);
        }

        // Session-based auth (Simpler for this task)
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = 'member'; // Default
        
        // Remove sensitive data
        unset($user['password_hash']);
        
        return [
            'user' => $user,
            'session_id' => session_id()
        ];
    }

    public function logout()
    {
        session_destroy();
        return true;
    }

    public function me()
    {
        if (!isset($_SESSION['user_id'])) {
            ApiResponse::error('Unauthenticated', 401);
        }
        
        $user = $this->userModel->findById($_SESSION['user_id']);
        if (!$user) {
            session_destroy();
            ApiResponse::error('User not found', 404);
        }
        
        unset($user['password_hash']);
        return $user;
    }
}