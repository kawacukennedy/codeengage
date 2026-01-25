<?php

namespace App\Models;

use PDO;

class CollaborationSession
{
    private PDO $db;
    private ?int $id = null;
    private ?int $snippetId = null;
    private ?string $sessionToken = null;
    private ?array $participants = null;
    private ?array $cursorPositions = null;
    private ?\DateTime $lastActivity = null;
    private ?\DateTime $createdAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->participants = [];
        $this->cursorPositions = [];
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getSnippetId(): ?int { return $this->snippetId; }
    public function getSessionToken(): ?string { return $this->sessionToken; }
    public function getParticipants(): ?array { return $this->participants; }
    public function getCursorPositions(): ?array { return $this->cursorPositions; }
    public function getLastActivity(): ?\DateTime { return $this->lastActivity; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }

    // Setters
    public function setSnippetId(int $snippetId): self { $this->snippetId = $snippetId; return $this; }
    public function setSessionToken(string $sessionToken): self { $this->sessionToken = $sessionToken; return $this; }
    public function setParticipants(array $participants): self { $this->participants = $participants; return $this; }
    public function setCursorPositions(array $cursorPositions): self { $this->cursorPositions = $cursorPositions; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO collaboration_sessions (snippet_id, session_token, participants, cursor_positions, last_activity) 
                VALUES (:snippet_id, :session_token, :participants, :cursor_positions, :last_activity)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':snippet_id' => $this->snippetId,
            ':session_token' => $this->sessionToken,
            ':participants' => json_encode($this->participants),
            ':cursor_positions' => json_encode($this->cursorPositions),
            ':last_activity' => $this->lastActivity?->format('Y-m-d H:i:s') ?: date('Y-m-d H:i:s')
        ]);
    }

    private function update(): bool
    {
        $sql = "UPDATE collaboration_sessions SET 
                participants = :participants,
                cursor_positions = :cursor_positions,
                last_activity = :last_activity
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':participants' => json_encode($this->participants),
            ':cursor_positions' => json_encode($this->cursorPositions),
            ':last_activity' => $this->lastActivity?->format('Y-m-d H:i:s')
        ]);
    }

    public function addParticipant(int $userId): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        if (!in_array($userId, $this->participants)) {
            $this->participants[] = $userId;
            return $this->update();
        }
        
        return true;
    }

    public function removeParticipant(int $userId): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $key = array_search($userId, $this->participants);
        if ($key !== false) {
            unset($this->participants[$key]);
            $this->participants = array_values($this->participants); // Re-index array
            return $this->update();
        }
        
        return true;
    }

    public function updateCursorPosition(int $userId, array $position): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $this->cursorPositions[$userId] = $position;
        $this->lastActivity = new \DateTime();
        
        return $this->update();
    }

    public function isActive(): bool
    {
        if ($this->lastActivity === null) {
            return false;
        }
        
        $now = new \DateTime();
        $interval = $now->diff($this->lastActivity);
        return $interval->h < 24; // Active if less than 24 hours old
    }

    public static function findByToken(PDO $db, string $token): ?self
    {
        $sql = "SELECT * FROM collaboration_sessions WHERE session_token = :token";
        $stmt = $db->prepare($sql);
        $stmt->execute([':token' => $token]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findBySnippet(PDO $db, int $snippetId): array
    {
        $sql = "SELECT * FROM collaboration_sessions WHERE snippet_id = :snippet_id ORDER BY last_activity DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        
        $sessions = [];
        while ($data = $stmt->fetch()) {
            $sessions[] = self::fromData($db, $data);
        }
        
        return $sessions;
    }

    public static function cleanupOld(PDO $db): int
    {
        $sql = "DELETE FROM collaboration_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR)";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        
        return $stmt->rowCount();
    }

    public static function fromData(PDO $db, array $data): self
    {
        $session = new self($db);
        
        $session->id = (int)$data['id'];
        $session->snippetId = (int)$data['snippet_id'];
        $session->sessionToken = $data['session_token'];
        $session->participants = $data['participants'] ? json_decode($data['participants'], true) : [];
        $session->cursorPositions = $data['cursor_positions'] ? json_decode($data['cursor_positions'], true) : [];
        $session->lastActivity = new \DateTime($data['last_activity']);
        $session->createdAt = new \DateTime($data['created_at']);
        
        return $session;
    }

    public function delete(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "DELETE FROM collaboration_sessions WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }
}