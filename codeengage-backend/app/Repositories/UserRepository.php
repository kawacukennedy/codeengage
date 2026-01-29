<?php

namespace App\Repositories;

use PDO;
use App\Models\User;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Helpers\ValidationHelper;

class UserRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?User
    {
        return User::findById($this->db, $id);
    }

    public function findByUsername(string $username): ?User
    {
        return User::findByUsername($this->db, $username);
    }

    public function findByEmail(string $email): ?User
    {
        return User::findByEmail($this->db, $email);
    }

    public function create(array $data): User
    {
        $user = new User($this->db);
        $user->setUsername($data['username']);
        $user->setEmail($data['email']);
        $user->setDisplayName($data['display_name'] ?? $data['username']);
        $user->setBio($data['bio'] ?? null);
        $user->setPreferences($data['preferences'] ?? ['theme' => 'dark', 'editor_mode' => 'default']);

        ValidationHelper::validateRequired($data, ['username', 'email']);
        ValidationHelper::validateEmail($data['email']);
        ValidationHelper::validateLength($data['username'], 3, 50, 'username');

        // Check availability
        if ($this->findByUsername($data['username'])) {
            throw new ValidationException(['username' => 'Username already exists']);
        }
        if ($this->findByEmail($data['email'])) {
            throw new ValidationException(['email' => 'Email already exists']);
        }

        // Handle Password
        if (isset($data['password_hash'])) {
            $user->setPasswordHash($data['password_hash']);
        } else {
            ValidationHelper::validateRequired($data, ['password']);
            ValidationHelper::validatePassword($data['password']);
            $user->setPassword($data['password']);
        }

        if (!$user->save()) {
            throw new \Exception('Failed to create user');
        }

        return $user;
    }

    public function update(int $id, array $data): User
    {
        $user = $this->findById($id);
        if (!$user) {
            throw new NotFoundException('User');
        }

        if (isset($data['username'])) {
            ValidationHelper::validateLength($data['username'], 3, 50, 'username');
            $existingUser = $this->findByUsername($data['username']);
            if ($existingUser && $existingUser->getId() !== $id) {
                throw new ValidationException(['username' => 'Username already exists']);
            }
            $user->setUsername($data['username']);
        }

        if (isset($data['email'])) {
            ValidationHelper::validateEmail($data['email']);
            $existingUser = $this->findByEmail($data['email']);
            if ($existingUser && $existingUser->getId() !== $id) {
                throw new ValidationException(['email' => 'Email already exists']);
            }
            $user->setEmail($data['email']);
        }

        if (isset($data['password'])) {
            ValidationHelper::validatePassword($data['password']);
            $user->setPassword($data['password']);
        }

        if (isset($data['display_name'])) {
            ValidationHelper::validateLength($data['display_name'], 1, 100, 'display_name');
            $user->setDisplayName($data['display_name']);
        }

        if (isset($data['bio'])) {
            ValidationHelper::validateLength($data['bio'], 0, 1000, 'bio');
            $user->setBio($data['bio']);
        }

        if (isset($data['preferences'])) {
            if (!is_array($data['preferences'])) {
                throw new ValidationException(['preferences' => 'Preferences must be an array']);
            }
            $user->setPreferences($data['preferences']);
        }

        if (isset($data['avatar_url'])) {
            ValidationHelper::validateLength($data['avatar_url'], 0, 500, 'avatar_url');
            $user->setAvatarUrl($data['avatar_url']);
        }

        if (!$user->save()) {
            throw new \Exception('Failed to update user');
        }

        return $user;
    }

    public function delete(int $id): bool
    {
        $user = $this->findById($id);
        if (!$user) {
            throw new NotFoundException('User');
        }

        return $user->delete();
    }

    public function findMany(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT * FROM users WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (username LIKE :search OR display_name LIKE :search OR bio LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($filters['achievement_points_min'])) {
            $sql .= " AND achievement_points >= :achievement_points_min";
            $params[':achievement_points_min'] = $filters['achievement_points_min'];
        }

        $sql .= " ORDER BY achievement_points DESC, username ASC";

        if ($limit > 0) {
            $sql .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        if ($limit > 0) {
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        }
        $stmt->execute();

        $users = [];
        while ($data = $stmt->fetch()) {
            $users[] = User::fromData($this->db, $data);
        }

        return $users;
    }

    public function count(array $filters = []): int
    {
        $sql = "SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (username LIKE :search OR display_name LIKE :search OR bio LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($filters['achievement_points_min'])) {
            $sql .= " AND achievement_points >= :achievement_points_min";
            $params[':achievement_points_min'] = $filters['achievement_points_min'];
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return (int)$stmt->fetch()['total'];
    }

    public function updateLastActive(int $userId): bool
    {
        $sql = "UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $userId]);
    }

    public function verifyEmail(int $userId): bool
    {
        $sql = "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $userId]);
    }

    public function getLeaderboard(int $limit = 10): array
    {
        $sql = "SELECT * FROM users 
                WHERE deleted_at IS NULL AND achievement_points > 0 
                ORDER BY achievement_points DESC, created_at ASC 
                LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $users = [];
        while ($data = $stmt->fetch()) {
            $users[] = User::fromData($this->db, $data);
        }

        return $users;
    }

    public function findSnippetsByUser(int $userId, array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT s.*, u.username as author_name 
                FROM snippets s 
                JOIN users u ON s.author_id = u.id 
                WHERE s.author_id = :user_id AND s.deleted_at IS NULL";
        
        $params = [':user_id' => $userId];

        if (!empty($filters['visibility'])) {
            $sql .= " AND s.visibility = :visibility";
            $params[':visibility'] = $filters['visibility'];
        }

        $sql .= " ORDER BY s.created_at DESC LIMIT :limit OFFSET :offset";
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();

        // Note: Ideally use Snippet::fromData, but we'd need to import Snippet model
        // For now returning raw array which is compatible with most frontend needs
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countSnippetsByUser(int $userId, array $filters = []): int
    {
        $sql = "SELECT COUNT(*) FROM snippets WHERE author_id = :user_id AND deleted_at IS NULL";
        $params = [':user_id' => $userId];

        if (!empty($filters['visibility'])) {
            $sql .= " AND visibility = :visibility";
            $params[':visibility'] = $filters['visibility'];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int)$stmt->fetchColumn();
    }

    public function getUserStats(int $userId): array
    {
        $stats = [
            'total_snippets' => 0,
            'total_views' => 0,
            'total_stars' => 0,
            'achievement_points' => 0
        ];

        // Snippet Stats
        $sql = "SELECT 
                    COUNT(*) as total_snippets,
                    SUM(view_count) as total_views,
                    SUM(star_count) as total_stars
                FROM snippets 
                WHERE author_id = ? AND deleted_at IS NULL";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $snippetStats = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($snippetStats) {
            $stats['total_snippets'] = (int)$snippetStats['total_snippets'];
            $stats['total_views'] = (int)$snippetStats['total_views'];
            $stats['total_stars'] = (int)$snippetStats['total_stars'];
        }

        // Get user achievement points (separate query or from user object)
        $user = $this->findById($userId);
        if ($user) {
            $stats['achievement_points'] = $user->getAchievementPoints();
            // Could add rank/level logic here
        }

        return $stats;
    }

    public function getAchievements(int $userId, int $limit = 50): array
    {
return \App\Models\Achievement::findByUser($this->db, $userId, $limit);
    }

    public function getTotalAchievementPoints(): int
    {
        $sql = "SELECT SUM(achievement_points) FROM users WHERE deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return (int) $stmt->fetchColumn();
    }

    public function getActiveUsersCount(int $days): int
    {
        $sql = "
            SELECT COUNT(DISTINCT id) 
            FROM users 
            WHERE last_active_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            AND deleted_at IS NULL
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':days' => $days]);
        
        return (int) $stmt->fetchColumn();
    }

    public function getVersionsSince(int $snippetId, string $sinceDate): array
    {
        $sql = "
            SELECT * FROM snippet_versions 
            WHERE snippet_id = :snippet_id AND created_at >= :since_date
            ORDER BY created_at DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':snippet_id' => $snippetId,
            ':since_date' => $sinceDate
        ]);
        
return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserRoles(int $userId): array
    {
        $sql = "
            SELECT r.name, r.description 
            FROM roles r 
            JOIN user_roles ur ON r.id = ur.role_id 
            WHERE ur.user_id = :user_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function getUserPermissions(int $userId): array
    {
        $sql = "
            SELECT DISTINCT p.name 
            FROM permissions p 
            JOIN role_permissions rp ON p.id = rp.permission_id 
            JOIN user_roles ur ON rp.role_id = ur.role_id 
            WHERE ur.user_id = :user_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function getRecentLoginAttempts(string $ipAddress, int $timeWindowSeconds = 300): array
    {
        $sql = "
            SELECT * FROM login_attempts 
            WHERE ip_address = :ip_address 
            AND attempt_time >= DATE_SUB(NOW(), INTERVAL :seconds SECOND)
            ORDER BY attempt_time DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':ip_address' => $ipAddress,
            ':seconds' => $timeWindowSeconds
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function recordLoginAttempt(array $attemptData): bool
    {
        $sql = "
            INSERT INTO login_attempts (
                user_id, ip_address, user_agent, success, attempt_time
            ) VALUES (
                :user_id, :ip_address, :user_agent, :success, :attempt_time
            )
        ";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':user_id' => $attemptData['user_id'] ?? null,
            ':ip_address' => $attemptData['ip_address'],
            ':user_agent' => $attemptData['user_agent'] ?? null,
            ':success' => $attemptData['success'] ?? false,
            ':attempt_time' => $attemptData['attempt_time'] ?? date('Y-m-d H:i:s')
        ]);
    }

    public function searchByDisplayName(string $query, int $limit = 10): array
    {
        $sql = "
            SELECT * FROM users 
            WHERE deleted_at IS NULL 
            AND (username LIKE :query OR display_name LIKE :query)
            ORDER BY achievement_points DESC, username ASC 
            LIMIT :limit
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':query' => "%{$query}%",
            ':limit' => $limit
        ]);
        
        $users = [];
        while ($data = $stmt->fetch()) {
            $user = User::fromData($this->db, $data);
            $users[] = $user->toArray();
        }
        
        return $users;
    }

    public function isMemberOfOrganization(int $userId, int $organizationId): bool
    {
        $sql = "
            SELECT 1 FROM organization_members
            WHERE user_id = :user_id AND organization_id = :organization_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':organization_id' => $organizationId
        ]);
        
        return $stmt->fetch() !== false;
    }

    public function findByPasswordResetToken(string $token): ?array
    {
        $sql = "
            SELECT u.* FROM users u
            JOIN audit_logs al ON u.id = al.entity_id
            WHERE al.action_type = 'password_reset'
            AND JSON_EXTRACT(al.new_values, '$.token') = :token
            AND JSON_EXTRACT(al.new_values, '$.expiry') > NOW()
            ORDER BY al.created_at DESC
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':token' => $token]);
        $data = $stmt->fetch();
        
        return $data ? User::fromData($this->db, $data)->toArray() : null;
    }

    /**
     * Get starred snippets for a user
     */
    public function getStarredSnippets(int $userId, int $limit = 20, int $offset = 0): array
    {
        try {
            // Check if snippet_stars table exists first
            $checkTable = $this->db->query("SHOW TABLES LIKE 'snippet_stars'");
            if ($checkTable->rowCount() === 0) {
                return [];
            }

            $sql = "
                SELECT s.* FROM snippets s
                JOIN snippet_stars ss ON s.id = ss.snippet_id
                WHERE ss.user_id = :user_id
                AND s.deleted_at IS NULL
                ORDER BY ss.created_at DESC
                LIMIT :limit OFFSET :offset
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $snippets = [];
            while ($row = $stmt->fetch()) {
                $snippets[] = \App\Models\Snippet::fromData($this->db, $row);
            }
            
            return $snippets;
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Get recent activity for a user
     */
    public function getRecentActivity(int $userId, int $limit = 20): array
    {
        try {
            // Check if audit_logs table exists first
            $checkTable = $this->db->query("SHOW TABLES LIKE 'audit_logs'");
            if ($checkTable->rowCount() === 0) {
                return [];
            }

            $sql = "
                SELECT 
                    action_type as type,
                    entity_type,
                    entity_id,
                    CASE 
                        WHEN action_type = 'snippet_created' THEN 'Created a new snippet'
                        WHEN action_type = 'snippet_updated' THEN 'Updated a snippet'
                        WHEN action_type = 'snippet_deleted' THEN 'Deleted a snippet'
                        WHEN action_type = 'snippet_starred' THEN 'Starred a snippet'
                        WHEN action_type = 'login' THEN 'Logged in'
                        WHEN action_type = 'register' THEN 'Created account'
                        ELSE action_type
                    END as description,
                    created_at
                FROM audit_logs
                WHERE actor_id = :user_id
                ORDER BY created_at DESC
                LIMIT :limit
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            return [];
        }
    }
}