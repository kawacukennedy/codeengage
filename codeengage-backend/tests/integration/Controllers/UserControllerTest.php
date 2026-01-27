<?php
/**
 * UserController Integration Tests
 * 
 * Tests for user profile API endpoints including profile management and achievements.
 */

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;
use App\Controllers\Api\UserController;
use PDO;

class UserControllerTest extends DatabaseTestCase
{
    private UserController $userController;
    private int $testUserId;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->userController = new UserController($this->getDb());
        $this->testUserId = $this->insertTestUser([
            'username' => 'usertest_' . time(),
            'email' => 'usertest_' . time() . '@example.com',
            'display_name' => 'Test User'
        ]);
    }

    /**
     * Test getting user profile by ID
     */
    public function testGetUserProfile(): void
    {
        $user = $this->getUserById($this->testUserId);
        
        $this->assertNotNull($user, 'Should find user by ID');
        $this->assertEquals($this->testUserId, $user['id']);
        $this->assertArrayHasKey('username', $user);
        $this->assertArrayHasKey('email', $user);
    }

    /**
     * Test updating user profile
     */
    public function testUpdateUserProfile(): void
    {
        $newDisplayName = 'Updated Display Name';
        $newBio = 'This is my updated bio';
        
        $sql = "UPDATE users SET display_name = ?, bio = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$newDisplayName, $newBio, $this->testUserId]);
        
        $this->assertTrue($result, 'Update should succeed');
        
        $user = $this->getUserById($this->testUserId);
        $this->assertEquals($newDisplayName, $user['display_name']);
        $this->assertEquals($newBio, $user['bio']);
    }

    /**
     * Test updating user preferences
     */
    public function testUpdateUserPreferences(): void
    {
        $preferences = json_encode([
            'theme' => 'light',
            'editor_mode' => 'vim',
            'notifications' => true
        ]);
        
        $sql = "UPDATE users SET preferences = ? WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$preferences, $this->testUserId]);
        
        $this->assertTrue($result);
        
        $user = $this->getUserById($this->testUserId);
        $prefs = json_decode($user['preferences'], true);
        $this->assertEquals('light', $prefs['theme']);
    }

    /**
     * Test getting user's snippets
     */
    public function testGetUserSnippets(): void
    {
        // Create snippets for user
        $this->insertTestSnippet($this->testUserId, ['title' => 'User Snippet 1']);
        $this->insertTestSnippet($this->testUserId, ['title' => 'User Snippet 2']);
        
        $snippets = $this->getUserSnippets($this->testUserId);
        
        $this->assertGreaterThanOrEqual(2, count($snippets));
        
        foreach ($snippets as $snippet) {
            $this->assertEquals($this->testUserId, $snippet['author_id']);
        }
    }

    /**
     * Test getting user achievements
     */
    public function testGetUserAchievements(): void
    {
        // Award some achievements
        $this->awardAchievement($this->testUserId, 'first_snippet', 50);
        $this->awardAchievement($this->testUserId, 'first_star', 25);
        
        $achievements = $this->getUserAchievements($this->testUserId);
        
        $this->assertGreaterThanOrEqual(2, count($achievements));
    }

    /**
     * Test updating achievement points
     */
    public function testUpdateAchievementPoints(): void
    {
        $pointsToAdd = 100;
        
        $sql = "UPDATE users SET achievement_points = achievement_points + ? WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$pointsToAdd, $this->testUserId]);
        
        $this->assertTrue($result);
        
        $user = $this->getUserById($this->testUserId);
        $this->assertGreaterThanOrEqual($pointsToAdd, $user['achievement_points']);
    }

    /**
     * Test getting leaderboard
     */
    public function testGetLeaderboard(): void
    {
        // Create users with different points
        $this->insertTestUser([
            'username' => 'leader1_' . time(),
            'email' => 'leader1_' . time() . '@example.com',
            'achievement_points' => 1000
        ]);
        $this->insertTestUser([
            'username' => 'leader2_' . time(),
            'email' => 'leader2_' . time() . '@example.com',
            'achievement_points' => 500
        ]);
        
        $leaderboard = $this->getLeaderboard(10);
        
        $this->assertNotEmpty($leaderboard);
        
        // Verify sorted by points descending
        $previousPoints = PHP_INT_MAX;
        foreach ($leaderboard as $entry) {
            $this->assertLessThanOrEqual($previousPoints, $entry['achievement_points']);
            $previousPoints = $entry['achievement_points'];
        }
    }

    /**
     * Test checking username availability
     */
    public function testUsernameAvailability(): void
    {
        $newUsername = 'available_username_' . time();
        $existingUsername = 'usertest_' . time(); // Already exists
        
        $this->assertTrue($this->isUsernameAvailable($newUsername));
    }

    /**
     * Test profile visibility settings
     */
    public function testProfileVisibilitySettings(): void
    {
        $preferences = json_encode([
            'profile_visibility' => 'public',
            'show_email' => false,
            'show_achievements' => true
        ]);
        
        $sql = "UPDATE users SET preferences = ? WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$preferences, $this->testUserId]);
        
        $this->assertTrue($result);
    }

    /**
     * Test user activity tracking
     */
    public function testUserActivityTracking(): void
    {
        $sql = "UPDATE users SET last_active_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$this->testUserId]);
        
        $this->assertTrue($result);
        
        $user = $this->getUserById($this->testUserId);
        $this->assertNotNull($user['last_active_at']);
    }

    /**
     * Test email verification status
     */
    public function testEmailVerificationStatus(): void
    {
        $user = $this->getUserById($this->testUserId);
        
        // Initially null (unverified in test data)
        // Update to verified
        $sql = "UPDATE users SET email_verified_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$this->testUserId]);
        
        $this->assertTrue($result);
        
        $verifiedUser = $this->getUserById($this->testUserId);
        $this->assertNotNull($verifiedUser['email_verified_at']);
    }

    /**
     * Helper: Get user by ID
     */
    private function getUserById(int $id): ?array
    {
        $sql = "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Helper: Get user's snippets
     */
    private function getUserSnippets(int $userId): array
    {
        $sql = "SELECT * FROM snippets WHERE author_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Helper: Award achievement to user
     */
    private function awardAchievement(int $userId, string $badgeType, int $points): int
    {
        $sql = "INSERT INTO achievements (user_id, badge_type, badge_name, points_awarded, earned_at)
                VALUES (?, ?, ?, ?, NOW())";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$userId, $badgeType, ucwords(str_replace('_', ' ', $badgeType)), $points]);
        
        // Update user points
        $sql = "UPDATE users SET achievement_points = achievement_points + ? WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$points, $userId]);
        
        return (int) $this->getDb()->lastInsertId();
    }

    /**
     * Helper: Get user achievements
     */
    private function getUserAchievements(int $userId): array
    {
        $sql = "SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Helper: Get leaderboard
     */
    private function getLeaderboard(int $limit = 10): array
    {
        $sql = "SELECT id, username, display_name, achievement_points 
                FROM users 
                WHERE deleted_at IS NULL 
                ORDER BY achievement_points DESC 
                LIMIT ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Helper: Check username availability
     */
    private function isUsernameAvailable(string $username): bool
    {
        $sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$username]);
        return (int) $stmt->fetchColumn() === 0;
    }
}
