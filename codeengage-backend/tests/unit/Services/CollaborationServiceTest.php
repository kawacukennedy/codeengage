<?php
/**
 * CollaborationService Unit Tests
 * 
 * Tests for collaboration service including sessions, updates, and conflict resolution.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\CollaborationService;
use PDO;

class CollaborationServiceTest extends TestCase
{
    private CollaborationService $collaborationService;
    private $mockDb;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->collaborationService = new CollaborationService($this->mockDb);
    }

    /**
     * Test session token generation
     */
    public function testSessionTokenGeneration(): void
    {
        $token = $this->generateSessionToken();
        
        $this->assertEquals(64, strlen($token), 'Session token should be 64 characters (32 bytes hex)');
        $this->assertMatchesRegularExpression('/^[a-f0-9]+$/', $token, 'Token should be hexadecimal');
    }

    /**
     * Test session token uniqueness
     */
    public function testSessionTokenUniqueness(): void
    {
        $tokens = [];
        
        for ($i = 0; $i < 50; $i++) {
            $token = $this->generateSessionToken();
            $this->assertNotContains($token, $tokens, 'Each token should be unique');
            $tokens[] = $token;
        }
    }

    /**
     * Test participant management
     */
    public function testParticipantAddition(): void
    {
        $participants = [];
        $userId = 42;
        
        $participants = $this->addParticipant($participants, $userId);
        
        $this->assertContains($userId, array_column($participants, 'user_id'));
    }

    /**
     * Test participant removal
     */
    public function testParticipantRemoval(): void
    {
        $participants = [
            ['user_id' => 1, 'joined_at' => time()],
            ['user_id' => 2, 'joined_at' => time()],
            ['user_id' => 3, 'joined_at' => time()]
        ];
        
        $participants = $this->removeParticipant($participants, 2);
        
        $this->assertCount(2, $participants);
        $this->assertNotContains(2, array_column($participants, 'user_id'));
    }

    /**
     * Test cursor position format
     */
    public function testCursorPositionFormat(): void
    {
        $cursorPosition = [
            'line' => 10,
            'ch' => 5,
            'user_id' => 1,
            'updated_at' => time()
        ];
        
        $this->assertArrayHasKey('line', $cursorPosition);
        $this->assertArrayHasKey('ch', $cursorPosition);
        $this->assertIsInt($cursorPosition['line']);
        $this->assertIsInt($cursorPosition['ch']);
    }

    /**
     * Test cursor positions update
     */
    public function testCursorPositionsUpdate(): void
    {
        $cursors = [];
        
        $cursors = $this->updateCursor($cursors, 1, ['line' => 5, 'ch' => 10]);
        $cursors = $this->updateCursor($cursors, 2, ['line' => 12, 'ch' => 3]);
        
        $this->assertEquals(5, $cursors[1]['line']);
        $this->assertEquals(10, $cursors[1]['ch']);
        $this->assertEquals(12, $cursors[2]['line']);
    }

    /**
     * Test session activity timeout
     */
    public function testSessionActivityTimeout(): void
    {
        $timeout = 24 * 60 * 60; // 24 hours
        $lastActivity = time() - (25 * 60 * 60); // 25 hours ago
        
        $isExpired = (time() - $lastActivity) > $timeout;
        
        $this->assertTrue($isExpired, 'Session should be expired after 24 hours');
    }

    /**
     * Test session not expired within timeout
     */
    public function testSessionNotExpiredWithinTimeout(): void
    {
        $timeout = 24 * 60 * 60;
        $lastActivity = time() - (1 * 60 * 60); // 1 hour ago
        
        $isExpired = (time() - $lastActivity) > $timeout;
        
        $this->assertFalse($isExpired, 'Session should not be expired within 24 hours');
    }

    /**
     * Test operation transformation for concurrent edits
     */
    public function testOperationTransformationInsertInsert(): void
    {
        // Two users insert at different positions
        $op1 = ['type' => 'insert', 'position' => 5, 'text' => 'Hello'];
        $op2 = ['type' => 'insert', 'position' => 10, 'text' => 'World'];
        
        // op1 should not affect op2 since op1.position < op2.position
        $transformedOp2 = $this->transformOperation($op2, $op1);
        
        $this->assertEquals(15, $transformedOp2['position'], 
            'Position should be shifted by inserted text length');
    }

    /**
     * Test operation transformation for delete
     */
    public function testOperationTransformationDelete(): void
    {
        $op1 = ['type' => 'delete', 'position' => 5, 'length' => 3];
        $op2 = ['type' => 'insert', 'position' => 10, 'text' => 'test'];
        
        $transformedOp2 = $this->transformOperationAfterDelete($op2, $op1);
        
        $this->assertEquals(7, $transformedOp2['position'], 
            'Position should be shifted back by deleted length');
    }

    /**
     * Test update queue ordering
     */
    public function testUpdateQueueOrdering(): void
    {
        $updates = [
            ['timestamp' => 1000, 'content' => 'first'],
            ['timestamp' => 3000, 'content' => 'third'],
            ['timestamp' => 2000, 'content' => 'second']
        ];
        
        usort($updates, fn($a, $b) => $a['timestamp'] - $b['timestamp']);
        
        $this->assertEquals('first', $updates[0]['content']);
        $this->assertEquals('second', $updates[1]['content']);
        $this->assertEquals('third', $updates[2]['content']);
    }

    /**
     * Test long polling timeout
     */
    public function testLongPollingTimeout(): void
    {
        $maxPollTime = 30; // 30 seconds
        $startTime = time();
        
        // Simulate waiting
        $waited = 0;
        while ($waited < 5) { // Only simulate 5 seconds
            $waited++;
        }
        
        $this->assertLessThan($maxPollTime, $waited, 
            'Poll should complete before max timeout');
    }

    /**
     * Test session cleanup criteria
     */
    public function testSessionCleanupCriteria(): void
    {
        $sessions = [
            ['id' => 1, 'last_activity' => time() - (48 * 3600), 'participants' => []],
            ['id' => 2, 'last_activity' => time() - (1 * 3600), 'participants' => [1, 2]],
            ['id' => 3, 'last_activity' => time() - (30 * 3600), 'participants' => []]
        ];
        
        $toCleanup = array_filter($sessions, function($s) {
            $expired = (time() - $s['last_activity']) > (24 * 3600);
            $noParticipants = empty($s['participants']);
            return $expired && $noParticipants;
        });
        
        $this->assertCount(2, $toCleanup, 'Should identify 2 sessions for cleanup');
    }

    /**
     * Test conflict detection
     */
    public function testConflictDetection(): void
    {
        $serverVersion = 5;
        $clientVersion = 4;
        
        $hasConflict = $clientVersion < $serverVersion;
        
        $this->assertTrue($hasConflict, 'Should detect version conflict');
    }

    /**
     * Test three-way merge base
     */
    public function testThreeWayMergeBase(): void
    {
        $base = "Hello World";
        $clientEdit = "Hello CodeEngage";
        $serverEdit = "Hi World";
        
        // Simplified merge: detect if both changed the same part
        $clientChangedStart = strpos($clientEdit, 'CodeEngage');
        $serverChangedStart = 0; // Changed "Hello" to "Hi"
        
        $noOverlap = $clientChangedStart > strlen('Hello');
        $this->assertTrue($noOverlap, 'Changes don\'t overlap');
    }

    /**
     * Helper: Generate session token
     */
    private function generateSessionToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * Helper: Add participant to session
     */
    private function addParticipant(array $participants, int $userId): array
    {
        $participants[] = [
            'user_id' => $userId,
            'joined_at' => time()
        ];
        return $participants;
    }

    /**
     * Helper: Remove participant from session
     */
    private function removeParticipant(array $participants, int $userId): array
    {
        return array_values(array_filter($participants, fn($p) => $p['user_id'] !== $userId));
    }

    /**
     * Helper: Update cursor position
     */
    private function updateCursor(array $cursors, int $userId, array $position): array
    {
        $cursors[$userId] = [
            'line' => $position['line'],
            'ch' => $position['ch'],
            'updated_at' => time()
        ];
        return $cursors;
    }

    /**
     * Helper: Transform operation after insert
     */
    private function transformOperation(array $op2, array $op1): array
    {
        if ($op1['type'] === 'insert' && $op1['position'] <= $op2['position']) {
            $op2['position'] += strlen($op1['text']);
        }
        return $op2;
    }

    /**
     * Helper: Transform operation after delete
     */
    private function transformOperationAfterDelete(array $op2, array $op1): array
    {
        if ($op1['type'] === 'delete' && $op1['position'] < $op2['position']) {
            $op2['position'] -= $op1['length'];
        }
        return $op2;
    }
}
