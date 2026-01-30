<?php

namespace App\Services;

use App\Repositories\CollaborationRepository;
use App\Helpers\ApiResponse;

class CollaborationService
{
    private $collaborationRepository;

    public function __construct($pdo)
    {
        $this->collaborationRepository = new CollaborationRepository($pdo);
    }

    public function createSession($snippetId, $userId)
    {
        // Check if session already exists
        $existingSession = $this->collaborationRepository->findBySnippet($snippetId);
        if ($existingSession) {
             $this->joinSession($existingSession['session_token'], $userId, 'edit');
             return ['token' => $existingSession['session_token']];
        }

        $token = bin2hex(random_bytes(32));
        $data = [
            'snippet_id' => $snippetId,
            'session_token' => $token,
            'participants' => json_encode([$userId]),
            'metadata' => json_encode([
                'permissions' => [
                    $userId => 'edit'
                ]
            ])
        ];
        
        try {
            $this->collaborationRepository->create($data);
            return ['token' => $token];
        } catch (\Exception $e) {
             ApiResponse::error('Failed to create session', 500);
        }
    }

    public function createInviteLink($sessionToken, $permission = 'view')
    {
        $payload = base64_encode(json_encode([
            't' => $sessionToken,
            'p' => $permission,
            'e' => time() + 86400
        ]));
        
        $secret = $_ENV['APP_KEY'] ?? 'secret';
        $signature = hash_hmac('sha256', $payload, $secret);
        
        return $payload . '.' . $signature;
    }

    public function joinWithInvite($inviteToken, $userId)
    {
        $parts = explode('.', $inviteToken);
        if (count($parts) !== 2) ApiResponse::error('Invalid token format', 400);
        
        [$payloadEnc, $signature] = $parts;
        $secret = $_ENV['APP_KEY'] ?? 'secret';
        
        if (!hash_equals(hash_hmac('sha256', $payloadEnc, $secret), $signature)) {
            ApiResponse::error('Invalid token signature', 403);
        }
        
        $payload = json_decode(base64_decode($payloadEnc), true);
        if ($payload['e'] < time()) ApiResponse::error('Invite expired', 403);
        
        return $this->joinSession($payload['t'], $userId, $payload['p']);
    }

    public function joinSession($token, $userId, $permission = 'edit')
    {
        $session = $this->collaborationRepository->findByToken($token);
        
        if (!$session) ApiResponse::error('Session not found', 404);
        
        $participants = json_decode($session['participants'], true) ?? [];
        $metadata = json_decode($session['metadata'] ?? '{}', true);
        $permissions = $metadata['permissions'] ?? [];

        if (!isset($permissions[$userId])) {
            $permissions[$userId] = $permission;
            $metadata['permissions'] = $permissions;
        }

        if (!in_array($userId, $participants)) {
            $participants[] = $userId;
            $session['participants'] = json_encode($participants);
        }
        
        $this->collaborationRepository->update($session['id'], [
            'participants' => json_encode($participants),
            'metadata' => json_encode($metadata)
        ]);
        
        $session['metadata'] = json_encode($metadata);
        
        return $session;
    }

    public function pushUpdate($token, $data, $userId)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) ApiResponse::error('Session not found', 404);
        
        // Locking check
        $metadata = json_decode($session['metadata'] ?? '{}', true);
        if (isset($metadata['locked_by']) && $metadata['locked_by'] !== $userId) {
             ApiResponse::error('Snippet is locked by another user', 403);
        }

        $cursors = json_decode($session['cursor_positions'], true) ?? [];
        if (isset($data['cursor'])) {
            $cursors[$userId] = $data['cursor'];
        }
        
        $updateData = [
            'cursor_positions' => json_encode($cursors),
            'last_activity' => date('Y-m-d H:i:s')
        ];
        
        $codeChange = $data['change'] ?? null;
        if ($codeChange) {
            $metadata['last_change'] = json_encode($codeChange);
            $metadata['last_change_by'] = $userId;
            $updateData['metadata'] = json_encode($metadata);
        }

        $this->collaborationRepository->update($session['id'], $updateData);
        
        return ['success' => true];
    }

    public function pollUpdates($token, $lastUpdateTimestamp)
    {
        $startTime = time();
        $timeout = 25;

        while (time() - $startTime < $timeout) {
            $session = $this->collaborationRepository->findByToken($token);
            if (!$session) return null;
            
            $dbLastActivity = strtotime($session['last_activity']);
            
            if ($dbLastActivity > $lastUpdateTimestamp) {
                return [
                    'last_activity' => $dbLastActivity,
                    'cursors' => json_decode($session['cursor_positions'], true),
                    'participants' => json_decode($session['participants'], true),
                    'metadata' => json_decode($session['metadata'] ?? '{}', true)
                ];
            }
            usleep(1000000);
        }
        return null;
    }

    public function sendMessage($token, $userId, $message, $lineRef = null)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) ApiResponse::error('Session not found', 404);
        
        $msgId = $this->collaborationRepository->storeMessage($session['id'], $userId, $message, $lineRef);
        $this->collaborationRepository->update($session['id'], ['last_activity' => date('Y-m-d H:i:s')]);
        
        return ['id' => $msgId, 'status' => 'sent'];
    }

    public function getMessages($token, $limit = 50)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) ApiResponse::error('Session not found', 404);
        
        return $this->collaborationRepository->getMessages($session['id'], $limit);
    }

    public function acquireLock($token, $userId)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) ApiResponse::error('Session not found', 404);

        $metadata = json_decode($session['metadata'] ?? '{}', true);
        
        if (isset($metadata['locked_by']) && $metadata['locked_by'] !== $userId) {
            $lockTime = $metadata['locked_at'] ?? 0;
            if (time() - $lockTime < 300) {
                return ['success' => false, 'message' => 'Snippet is locked', 'locked_by' => $metadata['locked_by']];
            }
        }

        $metadata['locked_by'] = $userId;
        $metadata['locked_at'] = time();
        
        $this->collaborationRepository->update($session['id'], [
            'metadata' => json_encode($metadata),
            'last_activity' => date('Y-m-d H:i:s')
        ]);

        return ['success' => true];
    }

    public function releaseLock($token, $userId)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) ApiResponse::error('Session not found', 404);

        $metadata = json_decode($session['metadata'] ?? '{}', true);
        
        if (isset($metadata['locked_by']) && $metadata['locked_by'] === $userId) {
            unset($metadata['locked_by']);
            unset($metadata['locked_at']);
            
            $this->collaborationRepository->update($session['id'], [
                'metadata' => json_encode($metadata),
                'last_activity' => date('Y-m-d H:i:s')
            ]);
        }

        return ['success' => true];
    }
}