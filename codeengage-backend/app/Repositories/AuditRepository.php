<?php

namespace App\Repositories;

use PDO;
use App\Helpers\ApiResponse;

class AuditRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function log(?int $actorId, string $actionType, string $entityType, ?int $entityId, ?array $oldValues = null, ?array $newValues = null): bool
    {
        $sql = "
            INSERT INTO audit_logs (
                actor_id, action_type, entity_type, entity_id, 
                old_values, new_values, ip_address, user_agent, request_id
            ) VALUES (
                :actor_id, :action_type, :entity_type, :entity_id,
                :old_values, :new_values, :ip_address, :user_agent, :request_id
            )
        ";

        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':actor_id' => $actorId,
            ':action_type' => $actionType,
            ':entity_type' => $entityType,
            ':entity_id' => $entityId,
            ':old_values' => $oldValues ? json_encode($oldValues) : null,
            ':new_values' => $newValues ? json_encode($newValues) : null,
            ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ':request_id' => $this->generateRequestId()
        ]);
    }

    public function findByEntity(string $entityType, int $entityId, ?int $limit = 50): array
    {
        $sql = "
            SELECT al.*, u.username, u.display_name
            FROM audit_logs al
            LEFT JOIN users u ON al.actor_id = u.id
            WHERE al.entity_type = :entity_type AND al.entity_id = :entity_id
            ORDER BY al.created_at DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':entity_type' => $entityType,
            ':entity_id' => $entityId,
            ':limit' => $limit
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByActor(int $actorId, ?int $limit = 50): array
    {
        $sql = "
            SELECT al.*
            FROM audit_logs al
            WHERE al.actor_id = :actor_id
            ORDER BY al.created_at DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':actor_id' => $actorId,
            ':limit' => $limit
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findByAction(string $actionType, ?int $limit = 50): array
    {
        $sql = "
            SELECT al.*, u.username, u.display_name
            FROM audit_logs al
            LEFT JOIN users u ON al.actor_id = u.id
            WHERE al.action_type = :action_type
            ORDER BY al.created_at DESC
            LIMIT :limit
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':action_type' => $actionType,
            ':limit' => $limit
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function search(array $filters = [], ?int $limit = 50, ?int $offset = 0): array
    {
        $where = [];
        $params = [];

        if (!empty($filters['actor_id'])) {
            $where[] = "al.actor_id = :actor_id";
            $params[':actor_id'] = $filters['actor_id'];
        }

        if (!empty($filters['action_type'])) {
            $where[] = "al.action_type = :action_type";
            $params[':action_type'] = $filters['action_type'];
        }

        if (!empty($filters['entity_type'])) {
            $where[] = "al.entity_type = :entity_type";
            $params[':entity_type'] = $filters['entity_type'];
        }

        if (!empty($filters['entity_id'])) {
            $where[] = "al.entity_id = :entity_id";
            $params[':entity_id'] = $filters['entity_id'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = "al.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = "al.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT al.*, u.username, u.display_name
            FROM audit_logs al
            LEFT JOIN users u ON al.actor_id = u.id
            {$whereClause}
            ORDER BY al.created_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function count(array $filters = []): int
    {
        $where = [];
        $params = [];

        if (!empty($filters['actor_id'])) {
            $where[] = "actor_id = :actor_id";
            $params[':actor_id'] = $filters['actor_id'];
        }

        if (!empty($filters['action_type'])) {
            $where[] = "action_type = :action_type";
            $params[':action_type'] = $filters['action_type'];
        }

        if (!empty($filters['entity_type'])) {
            $where[] = "entity_type = :entity_type";
            $params[':entity_type'] = $filters['entity_type'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = "created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = "created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "SELECT COUNT(*) FROM audit_logs {$whereClause}";
        $stmt = $this->db->prepare($sql);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();

        return (int) $stmt->fetchColumn();
    }

    public function cleanup(int $daysToKeep = 90): int
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            $sql = "DELETE FROM audit_logs WHERE created_at < :cutoff";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':cutoff' => date('Y-m-d H:i:s', strtotime("-{$daysToKeep} days"))]);
        } else {
            $sql = "
                DELETE FROM audit_logs 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':days' => $daysToKeep]);
        }

        return $stmt->rowCount();
    }

    public function getStats(?int $days = 30): array
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $sql = "
            SELECT 
                action_type,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM audit_logs 
            WHERE created_at >= :cutoff
            GROUP BY action_type, DATE(created_at)
            ORDER BY date DESC, count DESC
        ";

        $cutoff = ($driver === 'sqlite') 
            ? date('Y-m-d H:i:s', strtotime("-{$days} days"))
            : date('Y-m-d H:i:s', strtotime("-{$days} days")); // Simpler to use PHP date for both if possible
            
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':cutoff' => $cutoff]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function generateRequestId(): string
    {
        return bin2hex(random_bytes(16));
    }
}