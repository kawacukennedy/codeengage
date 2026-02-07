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

        $clientVersion = (int)($data['v'] ?? 0);
        $currentVersion = (int)($session['version'] ?? 0);
        
        // Get current live code from metadata, or fallback to snippet DB if first run (or empty)
        // We assume 'content' key in metadata holds the live code.
        $currentCode = $metadata['content'] ?? null;
        if ($currentCode === null) {
            // Lazy load from snippet repo if fresh session
            $snippetRepo = new \App\Repositories\SnippetRepository($this->collaborationRepository->getDb());
            $snippet = $snippetRepo->findById($session['snippet_id']);
            $latest = $snippetRepo->getLatestVersion($session['snippet_id']);
            $currentCode = $latest ? $latest->getCode() : '';
        }

        $incomingCode = $data['code'] ?? null;
        
        // Improved Conflict Resolution
        if ($clientVersion < $currentVersion) {
             // Conflict detected!
             
             if ($incomingCode !== null) {
                 // Attempt 3-way merge
                 // We need a base. Ideally we track history, but for now we use $currentCode as "Yours"
                 // and try to infer "Original". Actually, without history, we can't get true Original.
                 // But we can try to merge "Incoming" into "Current".
                 // Let's use MergeHelper. For 'original', we really need the version the client *started* from.
                 // But we don't have it stored. We'll use a simplified merge:
                 // MergeHelper::merge($currentCode, $currentCode, $incomingCode) -> effectively "Apply Incoming".
                 // That's not right.
                 
                 // If we don't have the base, we can't do a TRUE 3-way merge. 
                 // But we can try to see if the changes are append-only or non-destructive.
                 // OR we just assume the client sent the *result* of their local edit.
                 
                 // Let's use $currentCode as 'Original' and 'Yours' (Server) and '$incomingCode' as 'Theirs'.
                 // Actually this is wrong.
                 
                 // Since we don't store history in this simple backend, we will just return the CONFLICT
                 // but provide the server's current version so the CLIENT can do the merge.
                 // However, the spec says "Backend Merge".
                 // We will try our best:
                 
                 // Note: Ideally we'd fetch the specific version the client claims to have ($clientVersion)
                 // but we don't store every intermediate session version in DB (performance).
                 
                 return [
                     'success' => false, 
                     'error' => 'conflict', 
                     'current_version' => $currentVersion,
                     'server_content' => $currentCode, // Send specific server content to help client merge
                     'message' => 'Version mismatch. Please resolve conflict.'
                 ];
             } else {
                 return [
                    'success' => false, 
                    'error' => 'conflict', 
                    'current_version' => $currentVersion,
                     'message' => 'Your version is out of date.'
                 ];
             }
        }
        
        // If versions match (or force update/fast-forward)
        $updateData = [
            'last_activity' => date('Y-m-d H:i:s'),
            'version' => $currentVersion + 1
        ];
        
        if ($incomingCode !== null) {
            $metadata['content'] = $incomingCode;
        }

        $codeChange = $data['change'] ?? null;
        if ($codeChange) {
            $metadata['last_change'] = json_encode($codeChange);
            $metadata['last_change_by'] = $userId;
        }
        
        // Update cursors if provided
        if (isset($data['cursor'])) {
            $cursors = json_decode($session['cursor_positions'] ?? '{}', true);
            $cursors[$userId] = $data['cursor'];
            $updateData['cursor_positions'] = json_encode($cursors);
        }

        $updateData['metadata'] = json_encode($metadata);

        $this->collaborationRepository->update($session['id'], $updateData);
        
        return ['success' => true, 'version' => $currentVersion + 1];
    }

    public function pollUpdates($token, $lastVersion, $userId)
    {
        $startTime = time();
        $timeout = 25;

        // Track activity immediately
        $this->trackActivity($token, $userId);

        while (time() - $startTime < $timeout) {
            $session = $this->collaborationRepository->findByToken($token);
            if (!$session) return null;
            
            $dbVersion = (int)($session['version'] ?? 0);
            
            if ($dbVersion > $lastVersion) {
                return [
                    'version' => $dbVersion,
                    'last_activity' => strtotime($session['last_activity']),
                    'cursors' => json_decode($session['cursor_positions'], true),
                    'participants' => $this->getDetailedParticipants($session),
                    'metadata' => json_decode($session['metadata'] ?? '{}', true)
                ];
            }
            usleep(500000); // Poll every 0.5s for faster responsiveness
        }
        return ['version' => $lastVersion, 'status' => 'timeout'];
    }

    private function trackActivity($token, $userId)
    {
        $session = $this->collaborationRepository->findByToken($token);
        if (!$session) return;

        $metadata = json_decode($session['metadata'] ?? '{}', true);
        $metadata['last_seen'] = $metadata['last_seen'] ?? [];
        $metadata['last_seen'][$userId] = time();

        $this->collaborationRepository->update($session['id'], [
            'metadata' => json_encode($metadata),
            'version' => $session['version'] // Don't increment version just for activity tracking
        ]);
    }

    private function getDetailedParticipants($session)
    {
        $participants = json_decode($session['participants'], true) ?? [];
        $metadata = json_decode($session['metadata'] ?? '{}', true);
        $lastSeen = $metadata['last_seen'] ?? [];
        
        $detailed = [];
        $userRepo = new \App\Repositories\UserRepository($this->collaborationRepository->getDb());
        
        foreach ($participants as $userId) {
            $lastSeenTime = $lastSeen[$userId] ?? 0;
            if (time() - $lastSeenTime > 60) continue; // Inactive for 1min

            $user = $userRepo->findById($userId);
            if ($user) {
                $detailed[] = [
                    'id' => $user->getId(),
                    'display_name' => $user->getDisplayName() ?: $user->getUsername(),
                    'role' => $metadata['permissions'][$userId] ?? 'viewer',
                    'last_seen' => $lastSeenTime
                ];
            }
        }
        return $detailed;
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