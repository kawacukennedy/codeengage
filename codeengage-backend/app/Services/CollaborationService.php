<?php

namespace App\Services;

use App\Helpers\ApiResponse;
use PDO;

class CollaborationService
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function createSession($snippetId, $userId)
    {
        $token = bin2hex(random_bytes(32));
        
        $stmt = $this->pdo->prepare("
            INSERT INTO collaboration_sessions (snippet_id, session_token, participants)
            VALUES (?, ?, JSON_ARRAY(?))
        ");
        
        $stmt->execute([$snippetId, $token, $userId]);
        
        return ['token' => $token];
    }

    public function joinSession($token, $userId)
    {
        // Add user to participants
        // Simple implementation: Update JSON
        $stmt = $this->pdo->prepare("SELECT * FROM collaboration_sessions WHERE session_token = ?");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) ApiResponse::error('Session not found', 404);
        
        $participants = json_decode($session['participants'], true) ?? [];
        if (!in_array($userId, $participants)) {
            $participants[] = $userId;
            $update = $this->pdo->prepare("UPDATE collaboration_sessions SET participants = ? WHERE id = ?");
            $update->execute([json_encode($participants), $session['id']]);
        }
        
        return $session;
    }

    public function pushUpdate($token, $data, $userId)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM collaboration_sessions WHERE session_token = ?");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) ApiResponse::error('Session not found', 404);
        
        $cursors = json_decode($session['cursor_positions'], true) ?? [];
        if (isset($data['cursor'])) {
            $cursors[$userId] = $data['cursor'];
        }
        
        // Store code change if provided
        $codeChange = $data['change'] ?? null;
        
        $update = $this->pdo->prepare("
            UPDATE collaboration_sessions 
            SET cursor_positions = ?, 
                last_activity = ?,
                metadata = JSON_SET(COALESCE(metadata, '{}'), '$.last_change', ?, '$.last_change_by', ?)
            WHERE id = ?
        ");
        
        $update->execute([
            json_encode($cursors), 
            date('Y-m-d H:i:s'), 
            $codeChange ? json_encode($codeChange) : null,
            $userId,
            $session['id']
        ]);
        
        return ['success' => true];
    }

    public function pollUpdates($token, $lastUpdateTimestamp)
    {
        $startTime = time();
        $timeout = 25; // seconds
        $session_id = null;

        while (time() - $startTime < $timeout) {
            $stmt = $this->pdo->prepare("
                SELECT id, last_activity, cursor_positions, participants, metadata
                FROM collaboration_sessions 
                WHERE session_token = ?
            ");
            $stmt->execute([$token]);
            $session = $stmt->fetch();
            
            if (!$session) return null;
            
            $dbLastActivity = strtotime($session['last_activity']);
            
            if ($dbLastActivity > $lastUpdateTimestamp) {
                return [
                    'last_activity' => $dbLastActivity,
                    'cursors' => json_decode($session['cursor_positions'], true),
                    'participants' => json_decode($session['participants'], true),
                    'metadata' => json_decode($session['metadata'], true)
                ];
            }
            
            usleep(1000000); // Sleep 1s
        }
        
        return null;
    }
}
}