<?php

namespace App\Services;

use App\Repositories\SnippetRepository;
use App\Repositories\CollaborationRepository;
use App\Repositories\AuditRepository;
use App\Helpers\SecurityHelper;
use App\Exceptions\ValidationException;
use App\Exceptions\NotFoundException;
use App\Exceptions\UnauthorizedException;

class CollaborationService
{
    private SnippetRepository $snippetRepository;
    private CollaborationRepository $collaborationRepository;
    private AuditRepository $auditRepository;
    private SecurityHelper $securityHelper;
    private array $config;

    public function __construct(
        SnippetRepository $snippetRepository,
        CollaborationRepository $collaborationRepository,
        AuditRepository $auditRepository,
        SecurityHelper $securityHelper,
        array $config = []
    ) {
        $this->snippetRepository = $snippetRepository;
        $this->collaborationRepository = $collaborationRepository;
        $this->auditRepository = $auditRepository;
        $this->securityHelper = $securityHelper;
        $this->config = array_merge([
            'session_timeout' => 86400, // 24 hours
            'max_participants' => 10,
            'cleanup_interval' => 3600 // 1 hour
        ], $config);
    }

    public function createSession(int $snippetId, int $userId): array
    {
        $snippet = $this->snippetRepository->findById($snippetId);
        if (!$snippet) {
            throw new NotFoundException('Snippet');
        }

        if ($snippet->getVisibility() === 'private' && $snippet->getAuthorId() !== $userId) {
            throw new UnauthorizedException('Cannot collaborate on private snippet');
        }

        $existingSession = $this->collaborationRepository->findBySnippet($snippetId);
        if ($existingSession) {
            if ($this->canJoinSession($existingSession, $userId)) {
                return $this->joinSession($existingSession['session_token'], $userId);
            }
            throw new ValidationException('Collaboration session already exists and cannot be joined');
        }

        $sessionToken = $this->generateSessionToken();
        $participants = [['user_id' => $userId, 'joined_at' => time()]];
        
        $sessionData = [
            'snippet_id' => $snippetId,
            'session_token' => $sessionToken,
            'participants' => json_encode($participants),
            'cursor_positions' => json_encode([]),
            'last_activity' => date('Y-m-d H:i:s')
        ];

        $session = $this->collaborationRepository->create($sessionData);

        $this->auditRepository->log(
            $userId,
            'collaboration.session_create',
            'collaboration_session',
            $session['id'],
            null,
            [
                'snippet_id' => $snippetId,
                'session_token' => $sessionToken
            ]
        );

        return $this->formatSession($session);
    }

    public function joinSession(string $sessionToken, int $userId): array
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            throw new NotFoundException('Collaboration session');
        }

        if ($this->isSessionExpired($session)) {
            throw new ValidationException('Session has expired');
        }

        $participants = json_decode($session['participants'], true) ?: [];
        
        // Check if user is already a participant
        foreach ($participants as $participant) {
            if ($participant['user_id'] === $userId) {
                return $this->formatSession($session);
            }
        }

        if (count($participants) >= $this->config['max_participants']) {
            throw new ValidationException('Session is full');
        }

        $participants[] = ['user_id' => $userId, 'joined_at' => time()];
        
        $this->collaborationRepository->update($session['id'], [
            'participants' => json_encode($participants),
            'last_activity' => date('Y-m-d H:i:s')
        ]);

        $this->auditRepository->log(
            $userId,
            'collaboration.session_join',
            'collaboration_session',
            $session['id'],
            null,
            ['session_token' => $sessionToken]
        );

        return $this->formatSession($this->collaborationRepository->findById($session['id']));
    }

    public function leaveSession(string $sessionToken, int $userId): bool
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            return false;
        }

        $participants = json_decode($session['participants'], true) ?: [];
        $updatedParticipants = array_filter($participants, function($participant) use ($userId) {
            return $participant['user_id'] !== $userId;
        });

        if (empty($updatedParticipants)) {
            // Delete session if no participants left
            $this->collaborationRepository->delete($session['id']);
        } else {
            $this->collaborationRepository->update($session['id'], [
                'participants' => json_encode(array_values($updatedParticipants)),
                'last_activity' => date('Y-m-d H:i:s')
            ]);
        }

        $this->auditRepository->log(
            $userId,
            'collaboration.session_leave',
            'collaboration_session',
            $session['id'],
            null,
            ['session_token' => $sessionToken]
        );

        return true;
    }

    public function updateCursor(string $sessionToken, int $userId, array $position): array
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            throw new NotFoundException('Collaboration session');
        }

        if (!$this->isParticipant($session, $userId)) {
            throw new UnauthorizedException('Not a participant in this session');
        }

        $cursorPositions = json_decode($session['cursor_positions'], true) ?: [];
        $cursorPositions[$userId] = [
            'line' => $position['line'] ?? 0,
            'column' => $position['column'] ?? 0,
            'updated_at' => time()
        ];

        $this->collaborationRepository->update($session['id'], [
            'cursor_positions' => json_encode($cursorPositions),
            'last_activity' => date('Y-m-d H:i:s')
        ]);

        return $cursorPositions;
    }

    public function getUpdates(string $sessionToken, int $userId, ?int $lastSeen = null): array
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            throw new NotFoundException('Collaboration session');
        }

        if (!$this->isParticipant($session, $userId)) {
            throw new UnauthorizedException('Not a participant in this session');
        }

        $updates = [
            'session' => $this->formatSession($session),
            'cursors' => json_decode($session['cursor_positions'], true) ?: [],
            'participants' => json_decode($session['participants'], true) ?: []
        ];

        // Get recent snippet updates if lastSeen is provided
        if ($lastSeen) {
            $snippetUpdates = $this->getSnippetUpdates(
                $session['snippet_id'],
                $lastSeen
            );
            $updates['snippet_updates'] = $snippetUpdates;
        }

        return $updates;
    }

    public function applyEdit(string $sessionToken, int $userId, array $edit): array
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            throw new NotFoundException('Collaboration session');
        }

        if (!$this->isParticipant($session, $userId)) {
            throw new UnauthorizedException('Not a participant in this session');
        }

        // Apply three-way merge algorithm for concurrent edits
        $conflictResolution = $this->resolveEditConflicts(
            $session['snippet_id'],
            $edit,
            $userId
        );

        if ($conflictResolution['has_conflicts']) {
            return [
                'success' => false,
                'conflicts' => $conflictResolution['conflicts'],
                'message' => 'Edit conflicts detected'
            ];
        }

        // Apply the edit to the snippet
        $updatedSnippet = $this->applyEditToSnippet($session['snippet_id'], $edit, $userId);

        $this->collaborationRepository->update($session['id'], [
            'last_activity' => date('Y-m-d H:i:s')
        ]);

        $this->auditRepository->log(
            $userId,
            'collaboration.edit_apply',
            'snippet',
            $session['snippet_id'],
            null,
            [
                'edit_type' => $edit['type'] ?? 'unknown',
                'session_token' => $sessionToken
            ]
        );

        return [
            'success' => true,
            'snippet' => $updatedSnippet,
            'applied_at' => time()
        ];
    }

    public function endSession(string $sessionToken, int $userId): bool
    {
        $session = $this->collaborationRepository->findByToken($sessionToken);
        if (!$session) {
            return false;
        }

        // Only session creator or snippet owner can end session
        $snippet = $this->snippetRepository->findById($session['snippet_id']);
        $participants = json_decode($session['participants'], true) ?: [];
        $isCreator = $participants[0]['user_id'] === $userId;
        $isOwner = $snippet->getAuthorId() === $userId;

        if (!$isCreator && !$isOwner) {
            throw new UnauthorizedException('Only session creator or snippet owner can end session');
        }

        $result = $this->collaborationRepository->delete($session['id']);

        $this->auditRepository->log(
            $userId,
            'collaboration.session_end',
            'collaboration_session',
            $session['id'],
            $session,
            null
        );

        return $result;
    }

    public function getActiveSessions(int $userId): array
    {
        $sessions = $this->collaborationRepository->findByParticipant($userId);
        $activeSessions = [];

        foreach ($sessions as $session) {
            if (!$this->isSessionExpired($session)) {
                $activeSessions[] = $this->formatSession($session);
            }
        }

        return $activeSessions;
    }

    public function cleanupExpiredSessions(): int
    {
        $expiredSessions = $this->collaborationRepository->findExpired(
            $this->config['session_timeout']
        );

        $deletedCount = 0;
        foreach ($expiredSessions as $session) {
            if ($this->collaborationRepository->delete($session['id'])) {
                $deletedCount++;
            }
        }

        return $deletedCount;
    }

    private function canJoinSession(array $session, int $userId): bool
    {
        if ($this->isSessionExpired($session)) {
            return false;
        }

        $participants = json_decode($session['participants'], true) ?: [];
        if (count($participants) >= $this->config['max_participants']) {
            return false;
        }

        return true;
    }

    private function isParticipant(array $session, int $userId): bool
    {
        $participants = json_decode($session['participants'], true) ?: [];
        foreach ($participants as $participant) {
            if ($participant['user_id'] === $userId) {
                return true;
            }
        }
        return false;
    }

    private function isSessionExpired(array $session): bool
    {
        $lastActivity = strtotime($session['last_activity']);
        return (time() - $lastActivity) > $this->config['session_timeout'];
    }

    private function generateSessionToken(): string
    {
        return $this->securityHelper->generateSecureToken(64);
    }

    private function formatSession(array $session): array
    {
        return [
            'id' => $session['id'],
            'snippet_id' => $session['snippet_id'],
            'session_token' => $session['session_token'],
            'participants' => json_decode($session['participants'], true) ?: [],
            'cursor_positions' => json_decode($session['cursor_positions'], true) ?: [],
            'last_activity' => $session['last_activity'],
            'created_at' => $session['created_at']
        ];
    }

    private function resolveEditConflicts(int $snippetId, array $edit, int $userId): array
    {
        // Simplified conflict resolution - in production, implement proper three-way merge
        $currentVersion = $this->snippetRepository->getLatestVersion($snippetId);
        
        if (!$currentVersion) {
            return ['has_conflicts' => false, 'conflicts' => []];
        }

        // Check for overlapping edits
        $overlaps = $this->checkEditOverlaps($edit, $userId);
        
        return [
            'has_conflicts' => !empty($overlaps),
            'conflicts' => $overlaps
        ];
    }

    private function checkEditOverlaps(array $edit, int $userId): array
    {
        // Placeholder for overlap detection logic
        // In production, this would check if other users edited the same range
        return [];
    }

    private function applyEditToSnippet(int $snippetId, array $edit, int $userId): array
    {
        // Get current code
        $currentCode = $this->snippetRepository->getLatestCode($snippetId);
        
        // Apply edit based on type
        switch ($edit['type'] ?? 'insert') {
            case 'insert':
                $newCode = $this->insertText($currentCode, $edit);
                break;
            case 'delete':
                $newCode = $this->deleteText($currentCode, $edit);
                break;
            case 'replace':
                $newCode = $this->replaceText($currentCode, $edit);
                break;
            default:
                throw new ValidationException('Invalid edit type');
        }

        // Create new version with the edit
        $this->snippetRepository->update($snippetId, [], $newCode, $userId);
        
        return $this->snippetRepository->findById($snippetId)->toArray();
    }

    private function insertText(string $code, array $edit): string
    {
        $lines = explode("\n", $code);
        $line = $edit['line'] ?? 0;
        $column = $edit['column'] ?? 0;
        $text = $edit['text'] ?? '';

        if (!isset($lines[$line])) {
            return $code;
        }

        $currentLine = $lines[$line];
        $lines[$line] = substr($currentLine, 0, $column) . $text . substr($currentLine, $column);
        
        return implode("\n", $lines);
    }

    private function deleteText(string $code, array $edit): string
    {
        $lines = explode("\n", $code);
        $startLine = $edit['start_line'] ?? 0;
        $startColumn = $edit['start_column'] ?? 0;
        $endLine = $edit['end_line'] ?? $startLine;
        $endColumn = $edit['end_column'] ?? $startColumn;

        if ($startLine === $endLine) {
            // Single line deletion
            if (!isset($lines[$startLine])) {
                return $code;
            }
            $currentLine = $lines[$startLine];
            $lines[$startLine] = substr($currentLine, 0, $startColumn) . substr($currentLine, $endColumn);
        } else {
            // Multi-line deletion
            if (!isset($lines[$startLine]) || !isset($lines[$endLine])) {
                return $code;
            }
            
            $start = substr($lines[$startLine], 0, $startColumn);
            $end = substr($lines[$endLine], $endColumn);
            
            array_splice($lines, $startLine, $endLine - $startLine + 1, [$start . $end]);
        }
        
        return implode("\n", $lines);
    }

    private function replaceText(string $code, array $edit): string
    {
        $deleted = $this->deleteText($code, [
            'start_line' => $edit['start_line'] ?? 0,
            'start_column' => $edit['start_column'] ?? 0,
            'end_line' => $edit['end_line'] ?? 0,
            'end_column' => $edit['end_column'] ?? 0
        ]);

        return $this->insertText($deleted, [
            'line' => $edit['start_line'] ?? 0,
            'column' => $edit['start_column'] ?? 0,
            'text' => $edit['text'] ?? ''
        ]);
    }

    private function getSnippetUpdates(int $snippetId, int $since): array
    {
        // Get recent versions of the snippet
        $sinceDate = date('Y-m-d H:i:s', $since);
        return $this->snippetRepository->getVersionsSince($snippetId, $sinceDate);
    }
}