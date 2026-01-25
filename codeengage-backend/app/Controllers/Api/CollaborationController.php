<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\SnippetRepository;
use App\Models\CollaborationSession;
use App\Helpers\ApiResponse;
use App\Helpers\ValidationHelper;
use App\Helpers\SecurityHelper;
use App\Middleware\AuthMiddleware;

class CollaborationController
{
    private PDO $db;
    private SnippetRepository $snippetRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->snippetRepository = new SnippetRepository($db);
        $this->auth = new AuthMiddleware($db);
    }

    public function sessions(string $method, array $params): void
    {
        if ($method === 'POST') {
            $this->createSession();
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    public function session(string $method, array $params): void
    {
        $token = $params[0] ?? null;
        if (!$token) {
            ApiResponse::error('Session token required');
        }

        switch ($method) {
            case 'GET':
                $this->joinSession($token);
                break;
            case 'POST':
                $this->pushUpdate($token);
                break;
            case 'DELETE':
                $this->endSession($token);
                break;
            default:
                ApiResponse::error('Method not allowed', 405);
        }
    }

    private function createSession(): void
    {
        $currentUser = $this->auth->handle();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['snippet_id']);

            $snippet = $this->snippetRepository->findById((int)$input['snippet_id']);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check if user can collaborate on this snippet
            if (!$this->canCollaborate($snippet, $currentUser)) {
                ApiResponse::error('Cannot collaborate on this snippet', 403);
            }

            // Generate session token
            $sessionToken = SecurityHelper::generateSecureToken(32);

            $session = new CollaborationSession($this->db);
            $session->setSnippetId((int)$input['snippet_id']);
            $session->setSessionToken($sessionToken);
            $session->addParticipant($currentUser->getId());

            if (!$session->save()) {
                ApiResponse::error('Failed to create collaboration session');
            }

            ApiResponse::success([
                'session_token' => $sessionToken,
                'snippet_id' => $session->getSnippetId(),
                'participants' => $session->getParticipants(),
                'created_at' => $session->getCreatedAt()->format('Y-m-d H:i:s')
            ], 'Collaboration session created');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to create collaboration session');
        }
    }

    private function joinSession(string $token): void
    {
        try {
            $session = CollaborationSession::findByToken($this->db, $token);
            if (!$session) {
                ApiResponse::error('Collaboration session not found', 404);
            }

            if (!$session->isActive()) {
                ApiResponse::error('Collaboration session has expired', 410);
            }

            $currentUser = $this->auth->handle();
            $snippet = $this->snippetRepository->findById($session->getSnippetId());
            
            if (!$this->canCollaborate($snippet, $currentUser)) {
                ApiResponse::error('Cannot join this collaboration session', 403);
            }

            // Add current user to participants
            $session->addParticipant($currentUser->getId());
            $session->save();

            ApiResponse::success([
                'session_token' => $token,
                'snippet_id' => $session->getSnippetId(),
                'participants' => $session->getParticipants(),
                'cursor_positions' => $session->getCursorPositions(),
                'last_activity' => $session->getLastActivity()->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to join collaboration session');
        }
    }

    private function pushUpdate(string $token): void
    {
        $currentUser = $this->auth->handle();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            $session = CollaborationSession::findByToken($this->db, $token);
            if (!$session) {
                ApiResponse::error('Collaboration session not found', 404);
            }

            if (!$session->isActive()) {
                ApiResponse::error('Collaboration session has expired', 410);
            }

            // Add current user to participants if not already there
            $session->addParticipant($currentUser->getId());

            // Process different types of updates
            switch ($input['type'] ?? 'message') {
                case 'cursor':
                    $this->handleCursorUpdate($session, $currentUser->getId(), $input['position'] ?? []);
                    break;
                case 'text_change':
                    $this->handleTextChange($session, $currentUser->getId(), $input['change'] ?? []);
                    break;
                case 'selection':
                    $this->handleSelectionChange($session, $currentUser->getId(), $input['selection'] ?? []);
                    break;
                case 'message':
                    $this->handleChatMessage($session, $currentUser->getId(), $input['message'] ?? '');
                    break;
            }

            $session->save();

            ApiResponse::success(['updated_at' => date('Y-m-d H:i:s')]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to process update');
        }
    }

    private function endSession(string $token): void
    {
        try {
            $session = CollaborationSession::findByToken($this->db, $token);
            if (!$session) {
                ApiResponse::error('Collaboration session not found', 404);
            }

            $currentUser = $this->auth->handle();
            $snippet = $this->snippetRepository->findById($session->getSnippetId());
            
            if (!$this->canCollaborate($snippet, $currentUser)) {
                ApiResponse::error('Cannot end this collaboration session', 403);
            }

            // Remove user from participants
            $session->removeParticipant($currentUser->getId());
            $session->save();

            // If no more participants, delete the session
            if (empty($session->getParticipants())) {
                $session->delete();
            }

            ApiResponse::success(null, 'Left collaboration session');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to end collaboration session');
        }
    }

    public function updates(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $token = $params[0] ?? null;
        if (!$token) {
            ApiResponse::error('Session token required');
        }

        try {
            $session = CollaborationSession::findByToken($this->db, $token);
            if (!$session) {
                ApiResponse::error('Collaboration session not found', 404);
            }

            if (!$session->isActive()) {
                ApiResponse::error('Collaboration session has expired', 410);
            }

            $since = $_GET['since'] ?? null;
            $updates = $this->getUpdatesSince($session, $since);

            ApiResponse::success([
                'updates' => $updates,
                'session_id' => $token,
                'participants' => $session->getParticipants(),
                'last_activity' => $session->getLastActivity()->format('Y-m-d H:i:s')
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch updates');
        }
    }

    private function handleCursorUpdate($session, int $userId, array $position): void
    {
        $cursorPositions = $session->getCursorPositions() ?? [];
        $cursorPositions[$userId] = $position;
        $session->setCursorPositions($cursorPositions);
    }

    private function handleTextChange($session, int $userId, array $change): void
    {
        // Store text change in session metadata
        // In a real implementation, you'd store this in a separate table
        $metadata = $session->getMetadata() ?? [];
        if (!isset($metadata['text_changes'])) {
            $metadata['text_changes'] = [];
        }
        
        $metadata['text_changes'][] = [
            'user_id' => $userId,
            'change' => $change,
            'timestamp' => time()
        ];
        
        $session->setMetadata($metadata);
    }

    private function handleSelectionChange($session, int $userId, array $selection): void
    {
        $cursorPositions = $session->getCursorPositions() ?? [];
        if (!isset($cursorPositions[$userId])) {
            $cursorPositions[$userId] = [];
        }
        $cursorPositions[$userId]['selection'] = $selection;
        $session->setCursorPositions($cursorPositions);
    }

    private function handleChatMessage($session, int $userId, string $message): void
    {
        $metadata = $session->getMetadata() ?? [];
        if (!isset($metadata['chat_messages'])) {
            $metadata['chat_messages'] = [];
        }
        
        $metadata['chat_messages'][] = [
            'user_id' => $userId,
            'message' => $message,
            'timestamp' => time()
        ];
        
        $session->setMetadata($metadata);
    }

    private function getUpdatesSince($session, $since): array
    {
        $updates = [];
        $metadata = $session->getMetadata() ?? [];
        $timestamp = $since ? strtotime($since) : 0;

        // Get cursor updates
        $cursorPositions = $session->getCursorPositions() ?? [];
        foreach ($cursorPositions as $userId => $position) {
            if (isset($position['timestamp']) && $position['timestamp'] > $timestamp) {
                $updates[] = [
                    'type' => 'cursor',
                    'user_id' => $userId,
                    'position' => $position,
                    'timestamp' => $position['timestamp']
                ];
            }
        }

        // Get text changes
        if (isset($metadata['text_changes'])) {
            foreach ($metadata['text_changes'] as $change) {
                if ($change['timestamp'] > $timestamp) {
                    $updates[] = [
                        'type' => 'text_change',
                        'user_id' => $change['user_id'],
                        'change' => $change['change'],
                        'timestamp' => $change['timestamp']
                    ];
                }
            }
        }

        // Get chat messages
        if (isset($metadata['chat_messages'])) {
            foreach ($metadata['chat_messages'] as $message) {
                if ($message['timestamp'] > $timestamp) {
                    $updates[] = [
                        'type' => 'chat_message',
                        'user_id' => $message['user_id'],
                        'message' => $message['message'],
                        'timestamp' => $message['timestamp']
                    ];
                }
            }
        }

        // Sort by timestamp
        usort($updates, fn($a, $b) => $a['timestamp'] - $b['timestamp']);

        return $updates;
    }

    private function canCollaborate($snippet, $user): bool
    {
        // Owner can always collaborate
        if ($user->getId() === $snippet->getAuthorId()) {
            return true;
        }

        // Public snippets allow collaboration
        if ($snippet->getVisibility() === 'public') {
            return true;
        }

        // Organization snippets require membership
        if ($snippet->getVisibility() === 'organization') {
            // Simplified check - in real implementation, check org membership
            return true;
        }

        return false;
    }

    public function cleanup(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        // This would typically be a cron job
        try {
            $deletedCount = CollaborationSession::cleanupOld($this->db);
            ApiResponse::success(['deleted_sessions' => $deletedCount], 'Cleanup completed');

        } catch (\Exception $e) {
            ApiResponse::error('Cleanup failed');
        }
    }
}