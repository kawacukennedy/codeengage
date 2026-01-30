<?php

namespace App\Controllers\Api;

use App\Services\CollaborationService;
use App\Helpers\ApiResponse;
use PDO;

class CollaborationController
{
    private $service;

    public function __construct(PDO $pdo)
    {
        $this->service = new CollaborationService($pdo);
    }

    public function sessions($method, $params)
    {
        if (empty($params)) {
            if ($method === 'POST') {
                $this->create();
            }
            return;
        }
        
        $token = $params[0];
        $subAction = $params[1] ?? 'join';
        
        if ($subAction === 'updates') {
            if ($method === 'POST') {
                $this->push($token);
            } elseif ($method === 'GET') {
                $this->poll($token);
            }
        } elseif ($subAction === 'join') {
            $this->join($token);
        } elseif ($subAction === 'invite') {
            $this->createInvite($token);
        } elseif ($subAction === 'messages') {
            if ($method === 'POST') {
                $this->sendMessage($token);
            } elseif ($method === 'GET') {
                $this->getMessages($token);
            }
        } elseif ($subAction === 'lock') {
            if ($method === 'POST') {
                $this->lock($token);
            }
        } elseif ($subAction === 'unlock') {
            if ($method === 'POST') {
                $this->unlock($token);
            }
        }
    }
    
    public function join_invite($method, $params) {
        $this->joinViaInvite();
    }

    private function createInvite($sessionToken)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        $permission = $input['permission'] ?? 'view';
        
        $link = $this->service->createInviteLink($sessionToken, $permission);
        ApiResponse::success(['token' => $link, 'url' => "/join/{$link}"]); 
    }

    private function joinViaInvite()
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        $inviteToken = $input['token'] ?? '';
        
        $result = $this->service->joinWithInvite($inviteToken, $userId);
        ApiResponse::success($result);
    }

    private function create()
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        
        $result = $this->service->createSession($input['snippet_id'], $userId);
        ApiResponse::success($result);
    }

    private function join($token)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $result = $this->service->joinSession($token, $userId);
        ApiResponse::success($result);
    }

    private function push($token)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->service->pushUpdate($token, $input, $userId);
        ApiResponse::success($result);
    }

    private function poll($token)
    {
        $lastTs = $_GET['since'] ?? time();
        session_write_close();
        
        $result = $this->service->pollUpdates($token, $lastTs);
        ApiResponse::success($result ?? ['changed' => false]);
    }

    private function sendMessage($token)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['message'])) {
            ApiResponse::error('Message required', 400);
        }
        
        $result = $this->service->sendMessage($token, $userId, $input['message'], $input['line_reference'] ?? null);
        ApiResponse::success($result);
    }

    private function getMessages($token)
    {
        $messages = $this->service->getMessages($token, 50);
        ApiResponse::success($messages);
    }

    private function lock($token)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $result = $this->service->acquireLock($token, $userId);
        ApiResponse::success($result);
    }

    private function unlock($token)
    {
        $userId = $_SESSION['user_id'] ?? 0;
        $result = $this->service->releaseLock($token, $userId);
        ApiResponse::success($result);
    }
}