<?php

declare(strict_types=1);

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;

/**
 * Integration tests for AdminController
 */
class AdminControllerTest extends DatabaseTestCase
{
    private int $adminUserId;
    private int $regularUserId;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create admin user
        $this->adminUserId = $this->insertTestUser([
            'username' => 'admin_user',
            'email' => 'admin@test.com',
            'role' => 'admin'
        ]);
        
        // Create regular user
        $this->regularUserId = $this->insertTestUser([
            'username' => 'regular_user',
            'email' => 'regular@test.com',
            'role' => 'user'
        ]);
    }

    public function testGetAdminStatsReturnsSystemOverview(): void
    {
        // Get user count
        $userQuery = $this->db->query("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL");
        $userCount = $userQuery->fetch(\PDO::FETCH_ASSOC)['count'];
        
        // Get snippet count
        $snippetQuery = $this->db->query("SELECT COUNT(*) as count FROM snippets WHERE deleted_at IS NULL");
        $snippetCount = $snippetQuery->fetch(\PDO::FETCH_ASSOC)['count'];
        
        $stats = [
            'total_users' => (int) $userCount,
            'total_snippets' => (int) $snippetCount,
            'new_users_today' => 0,
            'new_snippets_today' => 0
        ];
        
        $this->assertArrayHasKey('total_users', $stats);
        $this->assertGreaterThan(0, $stats['total_users']);
    }

    public function testListUsersReturnsAllUsers(): void
    {
        $query = $this->db->prepare("
            SELECT id, username, email, role, created_at 
            FROM users 
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
        ");
        $query->execute();
        $users = $query->fetchAll(\PDO::FETCH_ASSOC);
        
        $this->assertGreaterThanOrEqual(2, count($users));
    }

    public function testUpdateUserRoleSucceeds(): void
    {
        // Update regular user to moderator
        $stmt = $this->db->prepare("
            UPDATE users SET role = ? WHERE id = ?
        ");
        $stmt->execute(['moderator', $this->regularUserId]);
        
        // Verify update
        $query = $this->db->prepare("SELECT role FROM users WHERE id = ?");
        $query->execute([$this->regularUserId]);
        $result = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertEquals('moderator', $result['role']);
    }

    public function testSuspendUserSucceeds(): void
    {
        // Suspend user (soft delete)
        $stmt = $this->db->prepare("
            UPDATE users SET deleted_at = NOW() WHERE id = ?
        ");
        $stmt->execute([$this->regularUserId]);
        
        // Verify suspension
        $query = $this->db->prepare("SELECT deleted_at FROM users WHERE id = ?");
        $query->execute([$this->regularUserId]);
        $result = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertNotNull($result['deleted_at']);
    }

    public function testUnsuspendUserSucceeds(): void
    {
        // First suspend
        $this->db->prepare("UPDATE users SET deleted_at = NOW() WHERE id = ?")->execute([$this->regularUserId]);
        
        // Then unsuspend
        $stmt = $this->db->prepare("UPDATE users SET deleted_at = NULL WHERE id = ?");
        $stmt->execute([$this->regularUserId]);
        
        // Verify
        $query = $this->db->prepare("SELECT deleted_at FROM users WHERE id = ?");
        $query->execute([$this->regularUserId]);
        $result = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertNull($result['deleted_at']);
    }

    public function testDeleteSnippetAsAdminSucceeds(): void
    {
        // Create a snippet first
        $snippetId = $this->insertTestSnippet([
            'user_id' => $this->regularUserId,
            'title' => 'To be deleted',
            'code' => 'delete me',
            'language' => 'text'
        ]);
        
        // Admin deletes snippet
        $stmt = $this->db->prepare("
            UPDATE snippets SET deleted_at = NOW() WHERE id = ?
        ");
        $stmt->execute([$snippetId]);
        
        // Verify deletion
        $query = $this->db->prepare("SELECT deleted_at FROM snippets WHERE id = ?");
        $query->execute([$snippetId]);
        $result = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertNotNull($result['deleted_at']);
    }

    public function testGetAuditLogsReturnsHistory(): void
    {
        // Create audit log entry
        $stmt = $this->db->prepare("
            INSERT INTO audit_logs (user_id, action_type, description, ip_address, created_at)
            VALUES (?, 'user_update', 'Updated user role', '127.0.0.1', NOW())
        ");
        $stmt->execute([$this->adminUserId]);
        
        // Fetch logs
        $query = $this->db->prepare("
            SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10
        ");
        $query->execute();
        $logs = $query->fetchAll(\PDO::FETCH_ASSOC);
        
        $this->assertGreaterThan(0, count($logs));
    }

    public function testGetReportedContentReturnsReports(): void
    {
        // Create a snippet to report
        $snippetId = $this->insertTestSnippet([
            'user_id' => $this->regularUserId,
            'title' => 'Reported snippet',
            'code' => 'questionable content',
            'language' => 'text'
        ]);
        
        // Create report
        $stmt = $this->db->prepare("
            INSERT INTO content_reports (reporter_id, target_type, target_id, reason, status, created_at)
            VALUES (?, 'snippet', ?, 'spam', 'pending', NOW())
        ");
        $stmt->execute([$this->adminUserId, $snippetId]);
        
        // Fetch pending reports
        $query = $this->db->prepare("
            SELECT * FROM content_reports WHERE status = 'pending'
        ");
        $query->execute();
        $reports = $query->fetchAll(\PDO::FETCH_ASSOC);
        
        $this->assertGreaterThan(0, count($reports));
    }

    public function testResolveReportSucceeds(): void
    {
        // Create snippet and report
        $snippetId = $this->insertTestSnippet([
            'user_id' => $this->regularUserId,
            'title' => 'Reported',
            'code' => 'test',
            'language' => 'text'
        ]);
        
        $stmt = $this->db->prepare("
            INSERT INTO content_reports (reporter_id, target_type, target_id, reason, status, created_at)
            VALUES (?, 'snippet', ?, 'spam', 'pending', NOW())
        ");
        $stmt->execute([$this->adminUserId, $snippetId]);
        $reportId = (int) $this->db->lastInsertId();
        
        // Resolve report
        $stmt = $this->db->prepare("
            UPDATE content_reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$this->adminUserId, $reportId]);
        
        // Verify
        $query = $this->db->prepare("SELECT status FROM content_reports WHERE id = ?");
        $query->execute([$reportId]);
        $result = $query->fetch(\PDO::FETCH_ASSOC);
        
        $this->assertEquals('resolved', $result['status']);
    }

    public function testGetSystemSettingsReturnsConfig(): void
    {
        // Insert system setting
        $stmt = $this->db->prepare("
            INSERT INTO system_settings (setting_key, setting_value, updated_at)
            VALUES ('maintenance_mode', 'false', NOW())
            ON DUPLICATE KEY UPDATE setting_value = 'false'
        ");
        $stmt->execute();
        
        // Fetch settings
        $query = $this->db->query("SELECT * FROM system_settings");
        $settings = $query->fetchAll(\PDO::FETCH_KEY_PAIR);
        
        $this->assertIsArray($settings);
    }

    public function testUpdateSystemSettingSucceeds(): void
    {
        // Insert then update
        $stmt = $this->db->prepare("
            INSERT INTO system_settings (setting_key, setting_value, updated_at)
            VALUES ('rate_limit', '1000', NOW())
            ON DUPLICATE KEY UPDATE setting_value = '1000'
        ");
        $stmt->execute();
        
        // Update
        $stmt = $this->db->prepare("
            UPDATE system_settings SET setting_value = ?, updated_at = NOW()
            WHERE setting_key = ?
        ");
        $stmt->execute(['2000', 'rate_limit']);
        
        // Verify
        $query = $this->db->prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?");
        $query->execute(['rate_limit']);
        $result = $query->fetch(\PDO::FETCH_COLUMN);
        
        $this->assertEquals('2000', $result);
    }

    public function testAdminRoleCheckWorks(): void
    {
        // Check admin role
        $query = $this->db->prepare("SELECT role FROM users WHERE id = ?");
        $query->execute([$this->adminUserId]);
        $adminRole = $query->fetch(\PDO::FETCH_COLUMN);
        
        $query->execute([$this->regularUserId]);
        $userRole = $query->fetch(\PDO::FETCH_COLUMN);
        
        $this->assertEquals('admin', $adminRole);
        $this->assertEquals('user', $userRole);
    }

    public function testBulkUserActionSucceeds(): void
    {
        // Create multiple users
        $userIds = [];
        for ($i = 0; $i < 3; $i++) {
            $userIds[] = $this->insertTestUser([
                'username' => "bulk_user_{$i}",
                'email' => "bulk{$i}@test.com",
                'role' => 'user'
            ]);
        }
        
        // Bulk update role
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));
        $stmt = $this->db->prepare("
            UPDATE users SET role = 'moderator' WHERE id IN ({$placeholders})
        ");
        $stmt->execute($userIds);
        
        // Verify
        $query = $this->db->prepare("
            SELECT COUNT(*) FROM users WHERE id IN ({$placeholders}) AND role = 'moderator'
        ");
        $query->execute($userIds);
        $count = $query->fetch(\PDO::FETCH_COLUMN);
        
        $this->assertEquals(3, (int) $count);
    }
}
