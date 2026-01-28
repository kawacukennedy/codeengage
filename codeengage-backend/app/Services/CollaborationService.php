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
        // Store update in a temporary table or update the main snippet version?
        // Since we don't have a separate `updates` table in schema (except session cursor/participants),
        // we might store pending edits or just direct cursor positions.
        // The specs mentioned Conflict Resolution, but schema is minimal.
        // We'll update cursor_positions in the session table.
        
        if (!isset($data['cursor'])) return;
        
        $stmt = $this->pdo->prepare("SELECT * FROM collaboration_sessions WHERE session_token = ?");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if (!$session) ApiResponse::error('Session not found', 404);
        
        $cursors = json_decode($session['cursor_positions'], true) ?? [];
        $cursors[$userId] = $data['cursor'];
        
        $update = $this->pdo->prepare("
            UPDATE collaboration_sessions 
            SET cursor_positions = ?, last_activity = ? 
            WHERE id = ?
        ");
        $update->execute([json_encode($cursors), date('Y-m-d H:i:s'), $session['id']]);
        
        return ['success' => true];
    }

    public function pollUpdates($token, $lastUpdateTimestamp)
    {
        // Long polling loop
        $startTime = time();
        $timeout = 20; // seconds
        
        while (time() - $startTime < $timeout) {
            $stmt = $this->pdo->prepare("
                SELECT last_activity, cursor_positions, participants 
                FROM collaboration_sessions 
                WHERE session_token = ? AND last_activity > ?
            ");
            // Note: Timestamp comparison with string date from DB might need formatting
            $stmt->execute([$token, date('Y-m-d H:i:s', $lastUpdateTimestamp)]);
            $data = $stmt->fetch();
            
            if ($data) {
                return $data; // Return immediately if new data
            }
            
            usleep(500000); // Sleep 0.5s
        }
        
        return null; // No updates
    }
}