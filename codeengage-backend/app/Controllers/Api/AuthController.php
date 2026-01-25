<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;
use App\Helpers\ValidationHelper;
use App\Exceptions\ValidationException;
use App\Exceptions\UnauthorizedException;
use App\Exceptions\NotFoundException;

class AuthController
{
    private PDO $db;
    private UserRepository $userRepository;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->userRepository = new UserRepository($db);
    }

    public function login(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['email', 'password']);
            ValidationHelper::validateEmail($input['email']);

            // Rate limiting check
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            if (!$this->checkLoginAttempts($ip)) {
                ApiResponse::error('Too many login attempts. Please try again later.', 429);
            }

            $user = $this->userRepository->findByEmail($input['email']);
            if (!$user || !$user->verifyPassword($input['password'])) {
                $this->recordLoginAttempt($ip, null, false);
                ApiResponse::error('Invalid email or password', 401);
            }

            // Successful login
            $this->recordLoginAttempt($ip, $user->getId(), true);
            $this->userRepository->updateLastActive($user->getId());

            // Create session
            session_start();
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user->getId();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

            // Generate JWT token for API
            $token = $this->generateJwtToken($user);

            ApiResponse::success([
                'user' => $user->toArray(),
                'token' => $token,
                'session_id' => session_id(),
                'csrf_token' => $_SESSION['csrf_token']
            ], 'Login successful');

        } catch (ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Login failed');
        }
    }

    public function register(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['username', 'email', 'password']);
            ValidationHelper::validateEmail($input['email']);
            ValidationHelper::validatePassword($input['password']);
            ValidationHelper::validateLength($input['username'], 3, 50, 'username');

            // Check rate limiting for registration
            $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
            if (!$this->checkRegistrationAttempts($ip)) {
                ApiResponse::error('Too many registration attempts. Please try again later.', 429);
            }

            $user = $this->userRepository->create($input);

            // Auto-login after registration
            session_start();
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user->getId();
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

            $token = $this->generateJwtToken($user);

            ApiResponse::success([
                'user' => $user->toArray(),
                'token' => $token,
                'session_id' => session_id(),
                'csrf_token' => $_SESSION['csrf_token']
            ], 'Registration successful');

        } catch (ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Registration failed');
        }
    }

    public function logout(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        session_start();
        
        // Destroy session
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();

        ApiResponse::success(null, 'Logout successful');
    }

    public function me(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $user = $this->getCurrentUser();
        if (!$user) {
            ApiResponse::error('Not authenticated', 401);
        }

        ApiResponse::success($user->toArray());
    }

    public function refresh(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $user = $this->getCurrentUser();
        if (!$user) {
            ApiResponse::error('Not authenticated', 401);
        }

        // Generate new token
        $token = $this->generateJwtToken($user);

        ApiResponse::success([
            'token' => $token,
            'user' => $user->toArray()
        ], 'Token refreshed');
    }

    public function forgotPassword(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['email']);
            ValidationHelper::validateEmail($input['email']);

            $user = $this->userRepository->findByEmail($input['email']);
            if (!$user) {
                // Always return success to prevent email enumeration
                ApiResponse::success(null, 'If the email exists, a reset link has been sent');
            }

            // Generate reset token
            $resetToken = bin2hex(random_bytes(32));
            $resetExpiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Store reset token (you'd want a dedicated table for this)
            $this->storePasswordResetToken($user->getId(), $resetToken, $resetExpiry);

            // Send email (implementation depends on your email service)
            $this->sendPasswordResetEmail($user->getEmail(), $resetToken);

            ApiResponse::success(null, 'If the email exists, a reset link has been sent');

        } catch (ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        }
    }

    public function resetPassword(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['token', 'password']);
            ValidationHelper::validatePassword($input['password']);

            $resetData = $this->validatePasswordResetToken($input['token']);
            if (!$resetData) {
                ApiResponse::error('Invalid or expired reset token', 400);
            }

            $user = $this->userRepository->findById($resetData['user_id']);
            if (!$user) {
                ApiResponse::error('Invalid reset token', 400);
            }

            // Update password
            $this->userRepository->update($user->getId(), ['password' => $input['password']]);
            
            // Clear reset token
            $this->clearPasswordResetToken($resetData['user_id']);

            ApiResponse::success(null, 'Password reset successful');

        } catch (ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        }
    }

    private function getCurrentUser(): ?\App\Models\User
    {
        // Check session first
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!empty($_SESSION['user_id'])) {
            return $this->userRepository->findById($_SESSION['user_id']);
        }

        // Check JWT token
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            try {
                $payload = $this->validateJwtToken($matches[1]);
                if ($payload && isset($payload['user_id'])) {
                    return $this->userRepository->findById($payload['user_id']);
                }
            } catch (\Exception $e) {
                // Token is invalid
            }
        }

        return null;
    }

    private function generateJwtToken(\App\Models\User $user): string
    {
        $config = require __DIR__ . '/../../config/auth.php';
        $secret = $config['jwt']['secret'];
        $algorithm = $config['jwt']['algorithm'];
        $ttl = $config['jwt']['ttl'];

        $payload = [
            'user_id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'iat' => time(),
            'exp' => time() + $ttl
        ];

        // Simple JWT implementation (use a proper library in production)
        $header = json_encode(['typ' => 'JWT', 'alg' => $algorithm]);
        $payload = json_encode($payload);
        
        $headerEncoded = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
        $payloadEncoded = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, $secret, true);
        $signatureEncoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        
        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
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

    private function checkLoginAttempts(string $ip): bool
    {
        // Check last 15 minutes
        $sql = "SELECT COUNT(*) as attempts FROM login_attempts 
                WHERE ip_address = :ip AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE) 
                AND success = FALSE";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':ip' => $ip]);
        $attempts = (int)$stmt->fetch()['attempts'];

        return $attempts < 5; // Allow 5 failed attempts per 15 minutes
    }

    private function checkRegistrationAttempts(string $ip): bool
    {
        // Check last hour
        $sql = "SELECT COUNT(*) as attempts FROM login_attempts 
                WHERE ip_address = :ip AND attempt_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':ip' => $ip]);
        $attempts = (int)$stmt->fetch()['attempts'];

        return $attempts < 3; // Allow 3 registrations per hour
    }

    private function recordLoginAttempt(string $ip, ?int $userId, bool $success): void
    {
        $sql = "INSERT INTO login_attempts (user_id, ip_address, success, user_agent) 
                VALUES (:user_id, :ip, :success, :user_agent)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':ip' => $ip,
            ':success' => $success ? 1 : 0,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    }

    private function storePasswordResetToken(int $userId, string $token, string $expiry): void
    {
        // This would typically use a separate password_resets table
        // For now, we'll use the audit_logs table
        $sql = "INSERT INTO audit_logs (action_type, entity_type, entity_id, new_values, ip_address) 
                VALUES ('password_reset', 'user', :user_id, :new_values, :ip)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':new_values' => json_encode(['token' => $token, 'expiry' => $expiry]),
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    }

    private function validatePasswordResetToken(string $token): ?array
    {
        $sql = "SELECT * FROM audit_logs 
                WHERE action_type = 'password_reset' 
                AND JSON_EXTRACT(new_values, '$.token') = :token
                AND JSON_EXTRACT(new_values, '$.expiry') > NOW()
                ORDER BY created_at DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':token' => $token]);
        $result = $stmt->fetch();

        if (!$result) {
            return null;
        }

        $newValues = json_decode($result['new_values'], true);
        return [
            'user_id' => $result['entity_id'],
            'token' => $newValues['token'],
            'expiry' => $newValues['expiry']
        ];
    }

    private function clearPasswordResetToken(int $userId): void
    {
        $sql = "DELETE FROM audit_logs 
                WHERE action_type = 'password_reset' AND entity_id = :user_id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
    }

    private function sendPasswordResetEmail(string $email, string $token): void
    {
        // Implementation depends on your email service
        // This is a placeholder for email sending logic
        
        $resetUrl = "https://yourdomain.com/reset-password?token={$token}";
        $subject = "Password Reset - CodeEngage";
        $message = "Click here to reset your password: {$resetUrl}";
        
        // In production, use a proper email service like SendGrid, Mailgun, etc.
        error_log("Password reset email sent to {$email}: {$resetUrl}");
    }
}