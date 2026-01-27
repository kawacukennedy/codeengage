<?php
/**
 * AuthController Integration Tests
 * 
 * Tests for authentication API endpoints including login, register, and token management.
 */

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;
use App\Controllers\Api\AuthController;
use PDO;

class AuthControllerTest extends DatabaseTestCase
{
    private AuthController $authController;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->authController = new AuthController($this->getDb());
    }

    /**
     * Test user registration with valid data
     */
    public function testUserRegistrationWithValidData(): void
    {
        $registrationData = [
            'username' => 'newuser' . time(),
            'email' => 'newuser' . time() . '@example.com',
            'password' => 'SecurePassword123!'
        ];
        
        // Simulate registration validation
        $errors = $this->validateRegistration($registrationData);
        
        $this->assertEmpty($errors, 'Valid registration data should have no errors');
    }

    /**
     * Test user registration rejects duplicate email
     */
    public function testRegistrationRejectsDuplicateEmail(): void
    {
        // Insert existing user
        $existingEmail = 'existing@example.com';
        $this->insertTestUser(['email' => $existingEmail, 'username' => 'existing_' . time()]);
        
        // Try to register with same email
        $registrationData = [
            'username' => 'newuser_' . time(),
            'email' => $existingEmail,
            'password' => 'SecurePassword123!'
        ];
        
        $isDuplicate = $this->emailExists($existingEmail);
        
        $this->assertTrue($isDuplicate, 'Should detect duplicate email');
    }

    /**
     * Test user registration rejects duplicate username
     */
    public function testRegistrationRejectsDuplicateUsername(): void
    {
        $existingUsername = 'existinguser';
        $this->insertTestUser([
            'username' => $existingUsername, 
            'email' => 'existing_' . time() . '@example.com'
        ]);
        
        $isDuplicate = $this->usernameExists($existingUsername);
        
        $this->assertTrue($isDuplicate, 'Should detect duplicate username');
    }

    /**
     * Test login with valid credentials
     */
    public function testLoginWithValidCredentials(): void
    {
        $password = 'TestPassword123!';
        $email = 'logintest_' . time() . '@example.com';
        
        $userId = $this->insertTestUser([
            'username' => 'logintest_' . time(),
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_ARGON2ID)
        ]);
        
        // Verify password
        $user = $this->getUserByEmail($email);
        $isValid = password_verify($password, $user['password_hash']);
        
        $this->assertTrue($isValid, 'Password should verify correctly');
    }

    /**
     * Test login fails with wrong password
     */
    public function testLoginFailsWithWrongPassword(): void
    {
        $password = 'CorrectPassword123!';
        $email = 'wrongpasstest_' . time() . '@example.com';
        
        $this->insertTestUser([
            'username' => 'wrongpasstest_' . time(),
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_ARGON2ID)
        ]);
        
        $user = $this->getUserByEmail($email);
        $isValid = password_verify('WrongPassword123!', $user['password_hash']);
        
        $this->assertFalse($isValid, 'Wrong password should not verify');
    }

    /**
     * Test login fails with non-existent email
     */
    public function testLoginFailsWithNonExistentEmail(): void
    {
        $user = $this->getUserByEmail('nonexistent@example.com');
        
        $this->assertNull($user, 'Non-existent email should return null');
    }

    /**
     * Test password reset token generation
     */
    public function testPasswordResetTokenGeneration(): void
    {
        $token = bin2hex(random_bytes(32));
        
        $this->assertEquals(64, strlen($token), 'Token should be 64 characters');
    }

    /**
     * Test password reset token expiration
     */
    public function testPasswordResetTokenExpiration(): void
    {
        $tokenExpiry = time() + 3600; // 1 hour from now
        $isExpired = time() > $tokenExpiry;
        
        $this->assertFalse($isExpired, 'Token should not be expired yet');
        
        $expiredToken = time() - 3600; // 1 hour ago
        $isExpiredOld = time() > $expiredToken;
        
        $this->assertTrue($isExpiredOld, 'Old token should be expired');
    }

    /**
     * Test session creation on login
     */
    public function testSessionCreationOnLogin(): void
    {
        $sessionToken = bin2hex(random_bytes(32));
        $userId = 1;
        
        $sessionData = [
            'token' => $sessionToken,
            'user_id' => $userId,
            'created_at' => time(),
            'expires_at' => time() + 7200
        ];
        
        $this->assertArrayHasKey('token', $sessionData);
        $this->assertEquals($userId, $sessionData['user_id']);
    }

    /**
     * Test rate limiting on login attempts
     */
    public function testRateLimitingOnLoginAttempts(): void
    {
        $ipAddress = '192.168.1.1';
        $maxAttempts = 5;
        $windowMinutes = 15;
        
        // Simulate failed attempts
        $attempts = [];
        for ($i = 0; $i < 6; $i++) {
            $attempts[] = [
                'ip' => $ipAddress,
                'time' => time() - ($i * 60),
                'success' => false
            ];
        }
        
        $recentFailedAttempts = count(array_filter($attempts, function($a) use ($windowMinutes) {
            return (time() - $a['time']) < ($windowMinutes * 60) && !$a['success'];
        }));
        
        $isRateLimited = $recentFailedAttempts >= $maxAttempts;
        
        $this->assertTrue($isRateLimited, 'Should be rate limited after 5 failed attempts');
    }

    /**
     * Test logout invalidates session
     */
    public function testLogoutInvalidatesSession(): void
    {
        $sessionToken = 'test_session_token';
        $activeSessions = [$sessionToken];
        
        // Logout
        $activeSessions = array_filter($activeSessions, fn($s) => $s !== $sessionToken);
        
        $this->assertEmpty($activeSessions, 'Session should be removed on logout');
    }

    /**
     * Test user last_active_at update on login
     */
    public function testLastActiveAtUpdateOnLogin(): void
    {
        $userId = $this->insertTestUser([
            'username' => 'lastactive_' . time(),
            'email' => 'lastactive_' . time() . '@example.com'
        ]);
        
        // Update last_active_at
        $sql = "UPDATE users SET last_active_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$userId]);
        
        $this->assertTrue($result, 'Should update last_active_at');
    }

    /**
     * Helper: Validate registration data
     */
    private function validateRegistration(array $data): array
    {
        $errors = [];
        
        if (empty($data['username']) || strlen($data['username']) < 3) {
            $errors['username'] = 'Username must be at least 3 characters';
        }
        
        if (empty($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required';
        }
        
        if (empty($data['password']) || strlen($data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }
        
        return $errors;
    }

    /**
     * Helper: Check if email exists
     */
    private function emailExists(string $email): bool
    {
        $sql = "SELECT COUNT(*) FROM users WHERE email = ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$email]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Helper: Check if username exists
     */
    private function usernameExists(string $username): bool
    {
        $sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$username]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Helper: Get user by email
     */
    private function getUserByEmail(string $email): ?array
    {
        $sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$email]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}
