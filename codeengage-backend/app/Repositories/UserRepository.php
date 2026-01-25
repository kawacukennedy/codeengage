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
        ValidationHelper::validateRequired($data, ['username', 'email', 'password']);
        ValidationHelper::validateEmail($data['email']);
        ValidationHelper::validateLength($data['username'], 3, 50, 'username');
        ValidationHelper::validatePassword($data['password']);

        // Check if username or email already exists
        if ($this->findByUsername($data['username'])) {
            throw new ValidationException(['username' => 'Username already exists']);
        }

        if ($this->findByEmail($data['email'])) {
            throw new ValidationException(['email' => 'Email already exists']);
        }

        $user = new User($this->db);
        $user->setUsername($data['username']);
        $user->setEmail($data['email']);
        $user->setPassword($data['password']);
        $user->setDisplayName($data['display_name'] ?? $data['username']);
        $user->setBio($data['bio'] ?? null);
        $user->setPreferences($data['preferences'] ?? ['theme' => 'dark', 'editor_mode' => 'default']);

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
        // This would typically delegate to SnippetRepository
        // For now, return empty array
        return [];
    }

    public function countSnippetsByUser(int $userId, array $filters = []): int
    {
        // This would typically delegate to SnippetRepository
        // For now, return 0
        return 0;
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
}