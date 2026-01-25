<?php

namespace App\Repositories;

use PDO;
use App\Models\CollaborationSession;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

class CollaborationRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?CollaborationSession
    {
        return CollaborationSession::findById($this->db, $id);
    }

    public function findByToken(string $token): ?array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE cs.session_token = :token
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':token' => $token]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function findBySnippet(int $snippetId): ?array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE cs.snippet_id = :snippet_id
            ORDER BY cs.last_activity DESC
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    public function findByParticipant(int $userId): array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE JSON_CONTAINS(cs.participants, :user_id)
            ORDER BY cs.last_activity DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => json_encode($userId)]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data): array
    {
        if (empty($data['snippet_id']) || empty($data['session_token'])) {
            throw new ValidationException('Snippet ID and session token are required');
        }

        $sql = "
            INSERT INTO collaboration_sessions (
                snippet_id, session_token, participants, cursor_positions, last_activity
            ) VALUES (
                :snippet_id, :session_token, :participants, :cursor_positions, :last_activity
            )
        ";

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':snippet_id' => $data['snippet_id'],
            ':session_token' => $data['session_token'],
            ':participants' => $data['participants'] ?? json_encode([]),
            ':cursor_positions' => $data['cursor_positions'] ?? json_encode([]),
            ':last_activity' => $data['last_activity'] ?? date('Y-m-d H:i:s')
        ]);

        if (!$result) {
            throw new \Exception('Failed to create collaboration session');
        }

        $id = $this->db->lastInsertId();
        return $this->findById($id)?->toArray() ?: [];
    }

    public function update(int $id, array $data): bool
    {
        $setClause = [];
        $params = [':id' => $id];

        $allowedFields = ['participants', 'cursor_positions', 'last_activity'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $setClause[] = "{$field} = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }

        if (empty($setClause)) {
            return false;
        }

        $sql = "UPDATE collaboration_sessions SET " . implode(', ', $setClause) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM collaboration_sessions WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function deleteBySnippet(int $snippetId): bool
    {
        $sql = "DELETE FROM collaboration_sessions WHERE snippet_id = :snippet_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':snippet_id' => $snippetId]);
    }

    public function findExpired(int $timeoutSeconds = 86400): array
    {
        $sql = "
            SELECT * FROM collaboration_sessions 
            WHERE last_activity < DATE_SUB(NOW(), INTERVAL :seconds SECOND)
            ORDER BY last_activity ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':seconds' => $timeoutSeconds]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function cleanupExpired(int $timeoutSeconds = 86400): int
    {
        $sql = "
            DELETE FROM collaboration_sessions 
            WHERE last_activity < DATE_SUB(NOW(), INTERVAL :seconds SECOND)
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':seconds' => $timeoutSeconds]);
        
        return $stmt->rowCount();
    }

    public function getActiveSessionsCount(): int
    {
        $sql = "SELECT COUNT(*) FROM collaboration_sessions";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return (int) $stmt->fetchColumn();
    }

    public function getActiveParticipantsCount(): int
    {
        $sql = "
            SELECT COUNT(DISTINCT participant) 
            FROM (
                SELECT JSON_EXTRACT(participants, CONCAT('$[', idx, '].user_id')) as participant
                FROM collaboration_sessions,
                JSON_TABLE(participants, '$[*]' COLUMNS (idx FOR ORDINALITY)) AS jt
            ) AS participants
            WHERE participant IS NOT NULL
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        
        return (int) $stmt->fetchColumn();
    }

    public function getSessionsBySnippet(int $snippetId, int $limit = 10): array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE cs.snippet_id = :snippet_id
            ORDER BY cs.last_activity DESC
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':snippet_id' => $snippetId,
            ':limit' => $limit
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSessionsByUser(int $userId, int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE JSON_CONTAINS(cs.participants, :user_id)
            ORDER BY cs.last_activity DESC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => json_encode($userId),
            ':limit' => $limit,
            ':offset' => $offset
        ]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getStatistics(?int $hours = 24): array
    {
        $sql = "
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(DISTINCT snippet_id) as unique_snippets,
                AVG(
                    TIMESTAMPDIFF(SECOND, created_at, 
                    COALESCE(last_activity, created_at))
                ) as avg_session_duration_seconds,
                COUNT(DISTINCT JSON_EXTRACT(participants, '$[*].user_id')) as total_participants
            FROM collaboration_sessions
        ";

        $params = [];
        if ($hours) {
            $sql .= " WHERE created_at >= DATE_SUB(NOW(), INTERVAL :hours HOUR)";
            $params[':hours'] = $hours;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getMostCollaboratedSnippets(int $limit = 10): array
    {
        $sql = "
            SELECT 
                s.id,
                s.title,
                s.language,
                COUNT(cs.id) as session_count,
                COUNT(DISTINCT JSON_EXTRACT(cs.participants, '$[*].user_id')) as participant_count
            FROM snippets s
            LEFT JOIN collaboration_sessions cs ON s.id = cs.snippet_id
            GROUP BY s.id, s.title, s.language
            HAVING session_count > 0
            ORDER BY session_count DESC, participant_count DESC
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTopCollaborators(int $limit = 10): array
    {
        $sql = "
            SELECT 
                u.id,
                u.username,
                u.display_name,
                COUNT(DISTINCT cs.snippet_id) as collaborated_snippets,
                COUNT(cs.id) as session_count
            FROM users u
            JOIN collaboration_sessions cs ON JSON_CONTAINS(cs.participants, u.id)
            GROUP BY u.id, u.username, u.display_name
            ORDER BY session_count DESC, collaborated_snippets DESC
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function search(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT cs.*, s.title as snippet_title, s.language as snippet_language
            FROM collaboration_sessions cs
            JOIN snippets s ON cs.snippet_id = s.id
            WHERE 1=1
        ";
        $params = [];

        if (!empty($filters['snippet_id'])) {
            $sql .= " AND cs.snippet_id = :snippet_id";
            $params[':snippet_id'] = $filters['snippet_id'];
        }

        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }

        if (!empty($filters['participant_id'])) {
            $sql .= " AND JSON_CONTAINS(cs.participants, :participant_id)";
            $params[':participant_id'] = json_encode($filters['participant_id']);
        }

        if (!empty($filters['date_from'])) {
            $sql .= " AND cs.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $sql .= " AND cs.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $sql .= " ORDER BY cs.last_activity DESC LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}