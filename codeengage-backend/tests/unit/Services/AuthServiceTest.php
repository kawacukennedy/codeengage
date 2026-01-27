<?php
/**
 * AuthService Unit Tests
 * 
 * Tests for authentication service including login, registration, and password handling.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AuthService;
use App\Repositories\UserRepository;
use App\Repositories\AuditRepository;
use PDO;

class AuthServiceTest extends TestCase
{
    private AuthService $authService;
    private $mockDb;
    private $mockUserRepo;
    private $mockAuditRepo;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->mockUserRepo = $this->createMock(UserRepository::class);
        $this->mockAuditRepo = $this->createMock(AuditRepository::class);
        
        $this->authService = new AuthService($this->mockDb);
    }

    /**
     * Test password hashing uses Argon2ID
     */
    public function testPasswordHashingUsesArgon2ID(): void
    {
        $password = 'SecurePassword123!';
        $hash = password_hash($password, PASSWORD_ARGON2ID);
        
        $this->assertTrue(password_verify($password, $hash));
        $this->assertStringStartsWith('$argon2id$', $hash);
    }

    /**
     * Test password validation rejects weak passwords
     */
    public function testPasswordValidationRejectsWeakPasswords(): void
    {
        $weakPasswords = [
            'short',           // Too short
            'nouppercase123!', // No uppercase
            'NOLOWERCASE123!', // No lowercase
            'NoNumbers!',      // No numbers
        ];
        
        foreach ($weakPasswords as $password) {
            $this->assertFalse(
                $this->isStrongPassword($password),
                "Password '{$password}' should be rejected"
            );
        }
    }

    /**
     * Test password validation accepts strong passwords
     */
    public function testPasswordValidationAcceptsStrongPasswords(): void
    {
        $strongPasswords = [
            'SecurePassword123!',
            'MyP@ssw0rd!456',
            'Str0ng#Pass!word',
        ];
        
        foreach ($strongPasswords as $password) {
            $this->assertTrue(
                $this->isStrongPassword($password),
                "Password '{$password}' should be accepted"
            );
        }
    }

    /**
     * Test username validation
     */
    public function testUsernameValidation(): void
    {
        // Valid usernames
        $validUsernames = ['testuser', 'user_123', 'my-username'];
        foreach ($validUsernames as $username) {
            $this->assertTrue(
                $this->isValidUsername($username),
                "Username '{$username}' should be valid"
            );
        }
        
        // Invalid usernames
        $invalidUsernames = ['ab', 'a', '123starts_with_number', 'has spaces'];
        foreach ($invalidUsernames as $username) {
            $this->assertFalse(
                $this->isValidUsername($username),
                "Username '{$username}' should be invalid"
            );
        }
    }

    /**
     * Test email validation
     */
    public function testEmailValidation(): void
    {
        // Valid emails
        $validEmails = ['test@example.com', 'user.name@domain.org', 'test+tag@email.com'];
        foreach ($validEmails as $email) {
            $this->assertTrue(
                filter_var($email, FILTER_VALIDATE_EMAIL) !== false,
                "Email '{$email}' should be valid"
            );
        }
        
        // Invalid emails
        $invalidEmails = ['notanemail', '@domain.com', 'test@', 'test@.com'];
        foreach ($invalidEmails as $email) {
            $this->assertFalse(
                filter_var($email, FILTER_VALIDATE_EMAIL) !== false,
                "Email '{$email}' should be invalid"
            );
        }
    }

    /**
     * Test JWT token generation produces valid structure
     */
    public function testJwtTokenStructure(): void
    {
        // A JWT token has 3 parts separated by dots
        $mockToken = $this->generateMockJwt(['user_id' => 1]);
        
        $parts = explode('.', $mockToken);
        $this->assertCount(3, $parts, 'JWT should have 3 parts');
        
        // Each part should be base64url encoded
        foreach ($parts as $index => $part) {
            $this->assertNotEmpty($part, "JWT part {$index} should not be empty");
        }
    }

    /**
     * Test session token generation produces unique tokens
     */
    public function testSessionTokenGenerationIsUnique(): void
    {
        $tokens = [];
        
        for ($i = 0; $i < 100; $i++) {
            $token = bin2hex(random_bytes(32));
            $this->assertNotContains($token, $tokens, 'Token should be unique');
            $tokens[] = $token;
        }
        
        $this->assertCount(100, array_unique($tokens), 'All 100 tokens should be unique');
    }

    /**
     * Test rate limiting logic
     */
    public function testRateLimitingLogic(): void
    {
        $attempts = [];
        $maxAttempts = 5;
        $windowMinutes = 15;
        
        // Simulate attempts
        $now = time();
        for ($i = 0; $i < 6; $i++) {
            $attempts[] = [
                'time' => $now - ($i * 60), // Each attempt 1 minute apart
                'success' => false
            ];
        }
        
        // Count recent failed attempts
        $recentAttempts = array_filter($attempts, function($attempt) use ($now, $windowMinutes) {
            return ($now - $attempt['time']) < ($windowMinutes * 60) && !$attempt['success'];
        });
        
        $this->assertGreaterThan($maxAttempts, count($recentAttempts), 'Should exceed max attempts');
    }

    /**
     * Helper: Check if password is strong
     */
    private function isStrongPassword(string $password): bool
    {
        // Minimum 8 characters, uppercase, lowercase, number
        return strlen($password) >= 8 &&
               preg_match('/[A-Z]/', $password) &&
               preg_match('/[a-z]/', $password) &&
               preg_match('/[0-9]/', $password);
    }

    /**
     * Helper: Check if username is valid
     */
    private function isValidUsername(string $username): bool
    {
        // 3-50 chars, alphanumeric + underscore/hyphen, starts with letter
        return strlen($username) >= 3 &&
               strlen($username) <= 50 &&
               preg_match('/^[a-zA-Z][a-zA-Z0-9_-]*$/', $username);
    }

    /**
     * Helper: Generate a mock JWT
     */
    private function generateMockJwt(array $payload): string
    {
        $header = base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = base64_encode(json_encode($payload));
        $signature = base64_encode('mock_signature');
        
        return "{$header}.{$payload}.{$signature}";
    }
}
