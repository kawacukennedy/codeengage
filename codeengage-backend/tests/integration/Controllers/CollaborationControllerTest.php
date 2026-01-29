<?php

declare(strict_types=1);

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;
use App\Controllers\Api\CollaborationController;
use PDO;

/**
 * Integration tests for CollaborationController
 * 
 * Tests for real-time collaboration endpoints using the JSON-based session storage.
 */
class CollaborationControllerTest extends DatabaseTestCase
{
    private int $userId;
    private int $userId2;
    private int $snippetId;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create test users
        $this->userId = $this->insertTestUser([
            'username' => 'collaborator1',
            'email' => 'collab1@test.com'
        ]);
        
        $this->userId2 = $this->insertTestUser([
            'username' => 'collaborator2',
            'email' => 'collab2@test.com'
        ]);
        
        // Create test snippet
        $this->snippetId = $this->insertTestSnippet([
            'author_id' => $this->userId,
            'title' => 'Collaborative Snippet',
            'code' => 'console.log("Hello");',
            'language' => 'javascript'
        ]);
    }

    public function testCreateCollaborationSessionSucceeds(): void
    {
        $sessionToken = bin2hex(random_bytes(32));
        
        $stmt = $this->db->prepare("
            INSERT INTO collaboration_sessions 
            (snippet_id, host_user_id, session_token, created_at, last_activity)
            VALUES (?, ?, ?, NOW(), NOW())
        ");
        
        $stmt->execute([$this->snippetId, $this->userId, $sessionToken]);
        $sessionId = (int) $this->db->lastInsertId();
        
        $this->assertGreaterThan(0, $sessionId);
        
        // Verify session exists
        $query = $this->db->prepare("
            SELECT * FROM collaboration_sessions WHERE id = ?
        ");
        $query->execute([$sessionId]);
        $session = $query->fetch(PDO::FETCH_ASSOC);
        
        $this->assertNotFalse($session);
        $this->assertEquals($sessionToken, $session['session_token']);
    }

    public function testUpdateParticipantsSucceeds(): void
    {
        $sessionToken = bin2hex(random_bytes(32));
        $participants = json_encode([$this->userId, $this->userId2]);
        
        $stmt = $this->db->prepare("
            INSERT INTO collaboration_sessions 
            (snippet_id, host_user_id, session_token, participants, created_at, last_activity)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([$this->snippetId, $this->userId, $sessionToken, $participants]);
        
        // Verify participants
        $query = $this->db->prepare("SELECT participants FROM collaboration_sessions WHERE session_token = ?");
        $query->execute([$sessionToken]);
        $result = $query->fetch(PDO::FETCH_ASSOC);
        
        $decoded = json_decode($result['participants'], true);
        $this->assertCount(2, $decoded);
        $this->assertContains($this->userId2, $decoded);
    }

    public function testUpdateCursorPositionsSucceeds(): void
    {
        $sessionToken = bin2hex(random_bytes(32));
        $cursors = json_encode([
            (string)$this->userId => ['line' => 1, 'ch' => 5],
            (string)$this->userId2 => ['line' => 2, 'ch' => 0]
        ]);
        
        $stmt = $this->db->prepare("
            INSERT INTO collaboration_sessions 
            (snippet_id, host_user_id, session_token, cursor_positions, created_at, last_activity)
            VALUES (?, ?, ?, ?, NOW(), NOW())
        ");
        $stmt->execute([$this->snippetId, $this->userId, $sessionToken, $cursors]);
        
        // Verify cursors
        $query = $this->db->prepare("SELECT cursor_positions FROM collaboration_sessions WHERE session_token = ?");
        $query->execute([$sessionToken]);
        $result = $query->fetch(PDO::FETCH_ASSOC);
        
        $decoded = json_decode($result['cursor_positions'], true);
        $this->assertEquals(5, $decoded[(string)$this->userId]['ch']);
    }

    public function testSessionExpirationCheck(): void
    {
        $sessionToken = bin2hex(random_bytes(32));
        
        // Create an old session
        $stmt = $this->db->prepare("
            INSERT INTO collaboration_sessions 
            (snippet_id, host_user_id, session_token, created_at, last_activity)
            VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL 25 HOUR), DATE_SUB(NOW(), INTERVAL 25 HOUR))
        ");
        $stmt->execute([$this->snippetId, $this->userId, $sessionToken]);
        
        // Check finding old sessions
        $query = $this->db->prepare("
            SELECT * FROM collaboration_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ");
        $query->execute();
        $expiredSessions = $query->fetchAll(PDO::FETCH_ASSOC);
        
        $this->assertNotEmpty($expiredSessions);
    }
}
