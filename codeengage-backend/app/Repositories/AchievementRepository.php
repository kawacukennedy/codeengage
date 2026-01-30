<?php

namespace App\Repositories;

use PDO;
use App\Models\Achievement;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

class AchievementRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?Achievement
    {
        return Achievement::findById($this->db, $id);
    }

    public function create(array $data): array
    {
        if (empty($data['user_id']) || empty($data['badge_type'])) {
            throw new ValidationException('User ID and badge type are required');
        }

        $sql = "
            INSERT INTO achievements (
                user_id, badge_type, badge_name, badge_description, 
                badge_icon, points_awarded, metadata
            ) VALUES (
                :user_id, :badge_type, :badge_name, :badge_description,
                :badge_icon, :points_awarded, :metadata
            )
        ";

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':user_id' => $data['user_id'],
            ':badge_type' => $data['badge_type'],
            ':badge_name' => $data['badge_name'],
            ':badge_description' => $data['badge_description'] ?? null,
            ':badge_icon' => $data['badge_icon'] ?? null,
            ':points_awarded' => $data['points_awarded'] ?? 0,
            ':metadata' => $data['metadata'] ?? json_encode([])
        ]);

        if (!$result) {
            throw new \Exception('Failed to create achievement');
        }

        $id = $this->db->lastInsertId();
        
        $sql = "SELECT * FROM achievements WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function findByUser(int $userId, int $limit = 50): array
    {
        return Achievement::findByUser($this->db, $userId, $limit);
    }

    public function findByUserAndType(int $userId, string $badgeType): ?array
    {
        $sql = "
            SELECT * FROM achievements 
            WHERE user_id = :user_id AND badge_type = :badge_type
            ORDER BY earned_at DESC
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':badge_type' => $badgeType
        ]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function hasEarned(int $userId, string $badgeType): bool
    {
        $sql = "
            SELECT 1 FROM achievements 
            WHERE user_id = :user_id AND badge_type = :badge_type
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':badge_type' => $badgeType
        ]);
        
        return $stmt->fetch() !== false;
    }

    public function findByType(string $badgeType, int $limit = 20): array
    {
        $sql = "
            SELECT a.*, u.username, u.display_name
            FROM achievements a
            JOIN users u ON a.user_id = u.id
            WHERE a.badge_type = :badge_type
            ORDER BY a.earned_at DESC
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':badge_type' => $badgeType,
            ':limit' => $limit
        ]);

        $achievements = [];
        while ($data = $stmt->fetch()) {
            $achievements[] = Achievement::fromData($this->db, $data);
        }

        return $achievements;
    }

    public function getRecent(int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT a.*, u.username, u.display_name
            FROM achievements a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.earned_at DESC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $achievements = [];
        while ($data = $stmt->fetch()) {
            $achievements[] = Achievement::fromData($this->db, $data);
        }

        return $achievements;
    }

    public function getTopAchievers(int $limit = 10): array
    {
        $sql = "
            SELECT 
                u.id,
                u.username,
                u.display_name,
                u.achievement_points,
                COUNT(a.id) as achievement_count,
                SUM(a.points_awarded) as total_achievement_points
            FROM users u
            LEFT JOIN achievements a ON u.id = a.user_id
            GROUP BY u.id, u.username, u.display_name, u.achievement_points
            HAVING achievement_count > 0
            ORDER BY total_achievement_points DESC, achievement_count DESC
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getMostPopularAchievement(): array
    {
        $sql = "
            SELECT 
                badge_type,
                badge_name,
                badge_icon,
                COUNT(*) as count,
                SUM(points_awarded) as total_points
            FROM achievements
            GROUP BY badge_type, badge_name, badge_icon
            ORDER BY count DESC
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    public function getStatistics(?int $days = 30): array
    {
        $sql = "
            SELECT 
                COUNT(*) as total_achievements,
                COUNT(DISTINCT user_id) as unique_users,
                SUM(points_awarded) as total_points_awarded,
                AVG(points_awarded) as avg_points_per_achievement,
                COUNT(DISTINCT badge_type) as unique_badge_types
            FROM achievements
        ";

        $params = [];
        if ($days) {
            $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                $sql .= " WHERE earned_at >= :cutoff";
                $params[':cutoff'] = date('Y-m-d H:i:s', strtotime("-{$days} days"));
            } else {
                $sql .= " WHERE earned_at >= DATE_SUB(NOW(), INTERVAL :days DAY)";
                $params[':days'] = $days;
            }
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getAchievementTypeDistribution(): array
    {
        $sql = "
            SELECT 
                badge_type,
                badge_name,
                badge_icon,
                COUNT(*) as count,
                SUM(points_awarded) as total_points,
                AVG(points_awarded) as avg_points
            FROM achievements
            GROUP BY badge_type, badge_name, badge_icon
            ORDER BY count DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUserAchievementCount(int $userId): int
    {
        $sql = "SELECT COUNT(*) FROM achievements WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return (int) $stmt->fetchColumn();
    }

    public function getUserTotalPoints(int $userId): int
    {
        $sql = "
            SELECT COALESCE(SUM(points_awarded), 0) as total_points
            FROM achievements WHERE user_id = :user_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        
        return (int) $stmt->fetchColumn();
    }

    public function count(): int
    {
        $sql = "SELECT COUNT(*) FROM achievements";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return (int) $stmt->fetchColumn();
    }

    public function search(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT a.*, u.username, u.display_name
            FROM achievements a
            JOIN users u ON a.user_id = u.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['user_id'])) {
            $sql .= " AND a.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (!empty($filters['badge_type'])) {
            $sql .= " AND a.badge_type = :badge_type";
            $params[':badge_type'] = $filters['badge_type'];
        }

        if (!empty($filters['min_points'])) {
            $sql .= " AND a.points_awarded >= :min_points";
            $params[':min_points'] = $filters['min_points'];
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND a.earned_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND a.earned_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY a.earned_at DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $achievements = [];
        while ($data = $stmt->fetch()) {
            $achievements[] = Achievement::fromData($this->db, $data);
        }

        return $achievements;
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM achievements WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function deleteByUser(int $userId): bool
    {
        $sql = "DELETE FROM achievements WHERE user_id = :user_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':user_id' => $userId]);
    }
}