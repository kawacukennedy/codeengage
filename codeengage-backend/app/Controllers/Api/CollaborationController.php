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

    public function __call($name, $arguments)
    {
        // session management
        // POST /sessions
        if ($name === 'sessions' && $arguments[0] === 'POST') {
             $this->create();
             return;
        }
        // GET /sessions/{token}
        // ... handled via custom routing if needed or simple ID assumptions
    }
    
    // For standard routing where session token is passed as $params[0]
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
        }
    }

    private function create()
    {
        session_start();
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        
        $result = $this->service->createSession($input['snippet_id'], $userId);
        ApiResponse::success($result);
    }

    private function join($token)
    {
        session_start();
        $userId = $_SESSION['user_id'] ?? 0;
        $result = $this->service->joinSession($token, $userId);
        ApiResponse::success($result);
    }

    private function push($token)
    {
        session_start();
        $userId = $_SESSION['user_id'] ?? 0;
        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->service->pushUpdate($token, $input, $userId);
        ApiResponse::success($result);
    }

    private function poll($token)
    {
        $lastTs = $_GET['since'] ?? time();
        // Since session writing might block, close it
        session_write_close();
        
        $result = $this->service->pollUpdates($token, $lastTs);
        ApiResponse::success($result ?? ['changed' => false]);
    }
}