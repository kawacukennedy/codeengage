<?php

namespace App\Middleware;

use App\Repositories\CollaborationRepository;
use App\Repositories\SnippetRepository;
use App\Helpers\ApiResponse;
use App\Exceptions\UnauthorizedException;
use App\Exceptions\NotFoundException;

class CollaborationMiddleware
{
    private CollaborationRepository $collaborationRepository;
    private SnippetRepository $snippetRepository;
    private \PDO $db;

    public function __construct(\PDO $db)
    {
        $this->db = $db;
        $this->collaborationRepository = new CollaborationRepository($db);
        $this->snippetRepository = new SnippetRepository($db);
    }

    public function handle(string $method, string $uri, array $params, callable $next): void
    {
        // Extract session token from request
        $sessionToken = $this->extractSessionToken($uri, $method);
        
        if ($sessionToken) {
            try {
                $session = $this->validateSession($sessionToken);
                $this->enrichRequest($session);
            } catch (\Exception $e) {
                ApiResponse::error('Invalid collaboration session', 401);
                return;
            }
        }

        $next();
    }

    private function extractSessionToken(string $uri, string $method): ?string
    {
        // Check Authorization header for Bearer token
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_AUTHORIZATION'] ?? null;
        if ($authHeader && preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            return $matches[1];
        }

        // Check query parameter
        if (isset($_GET['session_token'])) {
            return $_GET['session_token'];
        }

        // Check POST data
        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input && isset($input['session_token'])) {
                return $input['session_token'];
            }
        }

        // Check URL path parameter
        if (preg_match('/\/collaboration\/sessions\/([^\/]+)/', $uri, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function validateSession(string $sessionToken): array
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        
        if (!$session) {
            throw new UnauthorizedException('Invalid collaboration session token');
        }

        // Check if session is expired (24 hours inactivity)
        $lastActivity = new \DateTime($session['last_activity']);
        $now = new \DateTime();
        $diff = $now->diff($lastActivity);
        
        if ($diff->h > 24 || ($diff->d > 0)) {
            throw new UnauthorizedException('Collaboration session expired');
        }

        // Update last activity
        $this->collaborationRepository->update($session['id'], [
            'last_activity' => date('Y-m-d H:i:s')
        ]);

        return $session;
    }

    private function enrichRequest(array $session): void
    {
        // Store session in global context
        $_SESSION['collaboration_session'] = $session;
        
        // Add user info to request context
        $participants = json_decode($session['participants'], true) ?: [];
        if (!empty($participants)) {
            $_SESSION['collaboration_participants'] = $participants;
        }

        // Add cursor positions to request context
        $cursorPositions = json_decode($session['cursor_positions'], true) ?: [];
        if (!empty($cursorPositions)) {
            $_SESSION['collaboration_cursors'] = $cursorPositions;
        }
    }

    public function requireSession(): array
    {
        if (!isset($_SESSION['collaboration_session'])) {
            throw new UnauthorizedException('Collaboration session required');
        }

        return $_SESSION['collaboration_session'];
    }

    public function requireSnippetAccess(int $snippetId, int $userId): bool
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        
        if (!$snippet) {
            throw new NotFoundException('Snippet not found');
        }

        // Check if user is the owner
        if ($snippet->getAuthorId() === $userId) {
            return true;
        }

        // Check if snippet is public
        if ($snippet->getVisibility() === 'public') {
            return true;
        }

        // Check if user has an active collaboration session for this snippet
        $activeSession = $this->collaborationRepository->findBySnippet($snippetId);
        if ($activeSession) {
            $participants = json_decode($activeSession['participants'], true) ?: [];
            return in_array($userId, $participants);
        }

        return false;
    }

    public function createSession(int $snippetId, int $userId): array
    {
        // Check if user has access to snippet
        if (!$this->requireSnippetAccess($snippetId, $userId)) {
            throw new UnauthorizedException('Access denied to snippet');
        }

        // Check if session already exists
        $existingSession = $this->collaborationRepository->findBySnippet($snippetId);
        
        if ($existingSession) {
            $participants = json_decode($existingSession['participants'], true) ?: [];
            
            // Add user if not already in session
            if (!in_array($userId, $participants)) {
                $participants[] = $userId;
                $this->collaborationRepository->update($existingSession['id'], [
                    'participants' => json_encode($participants),
                    'last_activity' => date('Y-m-d H:i:s')
                ]);
            }
            
            return $existingSession;
        }

        // Create new session
        $sessionToken = $this->generateSessionToken();
        $sessionData = [
            'snippet_id' => $snippetId,
            'session_token' => $sessionToken,
            'participants' => json_encode([$userId]),
            'cursor_positions' => json_encode([]),
            'last_activity' => date('Y-m-d H:i:s')
        ];

        $newSession = $this->collaborationRepository->create($sessionData);
        
        return $newSession;
    }

    public function updateCursorPosition(int $userId, int $line, int $ch): bool
    {
        $session = $this->requireSession();
        $sessionId = $session['id'];
        
        $cursorPositions = json_decode($session['cursor_positions'], true) ?: [];
        $cursorPositions[$userId] = ['line' => $line, 'ch' => $ch, 'updated_at' => time()];
        
        return $this->collaborationRepository->update($sessionId, [
            'cursor_positions' => json_encode($cursorPositions),
            'last_activity' => date('Y-m-d H:i:s')
        ]);
    }

    public function addParticipant(int $userId): bool
    {
        $session = $this->requireSession();
        $sessionId = $session['id'];
        
        $participants = json_decode($session['participants'], true) ?: [];
        
        if (!in_array($userId, $participants)) {
            $participants[] = $userId;
            return $this->collaborationRepository->update($sessionId, [
                'participants' => json_encode($participants),
                'last_activity' => date('Y-m-d H:i:s')
            ]);
        }
        
        return true;
    }

    public function removeParticipant(int $userId): bool
    {
        $session = $this->requireSession();
        $sessionId = $session['id'];
        
        $participants = json_decode($session['participants'], true) ?: [];
        $key = array_search($userId, $participants);
        
        if ($key !== false) {
            unset($participants[$key]);
            $participants = array_values($participants); // Re-index array
            
            // Remove user's cursor position
            $cursorPositions = json_decode($session['cursor_positions'], true) ?: [];
            unset($cursorPositions[$userId]);
            
            return $this->collaborationRepository->update($sessionId, [
                'participants' => json_encode($participants),
                'cursor_positions' => json_encode($cursorPositions),
                'last_activity' => date('Y-m-d H:i:s')
            ]);
        }
        
        return true;
    }

    public function getSessionParticipants(): array
    {
        $session = $this->requireSession();
        return json_decode($session['participants'], true) ?: [];
    }

    public function getSessionCursors(): array
    {
        $session = $this->requireSession();
        return json_decode($session['cursor_positions'], true) ?: [];
    }

    public function broadcastUpdate(string $type, array $data): void
    {
        $session = $this->requireSession();
        $participants = json_decode($session['participants'], true) ?: [];
        
        // Store update in session for polling
        $updates = $this->getSessionUpdates();
        $updates[] = [
            'type' => $type,
            'data' => $data,
            'timestamp' => time(),
            'session_token' => $session['session_token']
        ];
        
        // Keep only last 100 updates per session
        if (count($updates) > 100) {
            $updates = array_slice($updates, -100);
        }
        
        $this->storeSessionUpdates($session['session_token'], $updates);
    }

    private function getSessionUpdates(): array
    {
        // This would be implemented using cache or temporary storage
        return [];
    }

    private function storeSessionUpdates(string $sessionToken, array $updates): void
    {
        // This would store updates in cache or temporary storage
        // Using APCu or file-based storage for session updates
        if (function_exists('apcu_store')) {
            apcu_store("collab_updates_{$sessionToken}", $updates, 300);
        }
    }

    public function getUpdates(string $sessionToken, int $lastKnownUpdate = 0): array
    {
        $updates = [];
        
        if (function_exists('apcu_fetch')) {
            $stored = apcu_fetch("collab_updates_{$sessionToken}");
            if ($stored) {
                foreach ($stored as $update) {
                    if ($update['timestamp'] > $lastKnownUpdate) {
                        $updates[] = $update;
                    }
                }
            }
        }
        
        return $updates;
    }

    private function generateSessionToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function cleanupExpiredSessions(): int
    {
        return $this->collaborationRepository->cleanupExpired();
    }

    public function getSessionStats(): array
    {
        return [
            'active_sessions' => $this->collaborationRepository->getActiveSessionsCount(),
            'active_participants' => $this->collaborationRepository->getActiveParticipantsCount(),
            'top_snippets' => $this->collaborationRepository->getMostCollaboratedSnippets(5),
            'top_collaborators' => $this->collaborationRepository->getTopCollaborators(5)
        ];
    }

    public function endSession(string $sessionToken): bool
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        
        if (!$session) {
            return false;
        }

        // Clean up session data
        if (function_exists('apcu_delete')) {
            apcu_delete("collab_updates_{$sessionToken}");
        }

        return $this->collaborationRepository->delete($session['id']);
    }

    public function handleConflict(array $operation1, array $operation2): array
    {
        // Simple conflict resolution strategy
        if ($operation1['timestamp'] > $operation2['timestamp']) {
            return $operation1;
        }
        
        return $operation2;
    }

    public function applyOperation(string $code, array $operation): string
    {
        switch ($operation['type']) {
            case 'insert':
                $lines = explode("\n", $code);
                array_splice($lines, $operation['line'], 0, $operation['text']);
                return implode("\n", $lines);
                
            case 'delete':
                $lines = explode("\n", $code);
                array_splice($lines, $operation['line'], $operation['length'] ?? 1);
                return implode("\n", $lines);
                
            case 'replace':
                $lines = explode("\n", $code);
                $lines[$operation['line']] = $operation['text'];
                return implode("\n", $lines);
                
            default:
                return $code;
        }
    }

    public function transformOperation(array $op1, array $op2): array
    {
        // Operational transformation for real-time collaboration
        // This is a simplified version
        
        if ($op1['line'] < $op2['line']) {
            return $op1;
        }
        
        if ($op1['line'] > $op2['line']) {
            if ($op2['type'] === 'insert' || $op2['type'] === 'delete') {
                $op1['line'] += ($op2['length'] ?? 1);
            }
            return $op1;
        }
        
        // Same line - need more sophisticated transformation
        return $this->handleSameLineConflict($op1, $op2);
    }

    private function handleSameLineConflict(array $op1, array $op2): array
    {
        // For same-line conflicts, use character position
        if (isset($op1['ch']) && isset($op2['ch'])) {
            if ($op1['ch'] < $op2['ch']) {
                return $op1;
            }
            if ($op1['ch'] > $op2['ch']) {
                $op1['ch'] += strlen($op2['text'] ?? '');
                return $op1;
            }
        }
        
        // Fallback: prioritize later operation
        return $op1['timestamp'] > $op2['timestamp'] ? $op1 : $op2;
    }
}