<?php

namespace App\Services;

use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;

class AuthService
{
    private $userRepository;
    private $config;

    public function __construct($pdo, $config)
    {
        $this->userRepository = new UserRepository($pdo);
        $this->config = $config;
    }

    public function register(array $data)
    {
        // Validation (Basic)
        if (empty($data['email']) || empty($data['password']) || empty($data['username'])) {
            ApiResponse::error('Missing required fields', 422);
        }

        if ($this->userRepository->findByEmail($data['email'])) {
            ApiResponse::error('Email already exists', 409);
        }

        // Create user via repository
        $user = $this->userRepository->create($data);
        
        // Auto-login
        // Note: Password inside $data is plain text needed for login/hashing
        // UserRepository::create hashes it, but we can't retrieve plain password from User object
        // So we pass it explicitly to login, or simpler: since we created it, we know it's valid.
        
        return $this->login($data['email'], $data['password']);
    }

    public function login($email, $password)
    {
        $user = $this->userRepository->findByEmail($email);
        
        if (!$user || !password_verify($password, $user->getPasswordHash())) {
            ApiResponse::error('Invalid credentials', 401);
        }

        // Session-based auth
        $_SESSION['user_id'] = $user->getId();
        $_SESSION['user_role'] = $user->getRole();
        
        $userArray = $user->toArray();
        unset($userArray['password_hash']);
        
        return [
            'user' => $userArray,
            'token' => session_id() // Frontend expects 'token'
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
        
        $user = $this->userRepository->findById($_SESSION['user_id']);
        if (!$user) {
            session_destroy();
            ApiResponse::error('User not found', 404);
        }
        
        return $user->toArray();
    }
}