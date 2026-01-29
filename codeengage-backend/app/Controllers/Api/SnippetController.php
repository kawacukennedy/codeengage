<?php

namespace App\Controllers\Api;

use App\Services\SnippetService;
use App\Helpers\ApiResponse;
use PDO;

class SnippetController
{
    private $snippetService;
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->snippetService = new SnippetService($pdo);
    }

    public function index($method, $params)
    {
        if ($method === 'GET') {
            $filters = [
                'language' => $_GET['language'] ?? null,
                'visibility' => $_GET['visibility'] ?? 'public',
                'search' => $_GET['search'] ?? null,
                'author_id' => $_GET['author_id'] ?? null,
                'organization_id' => $_GET['organization_id'] ?? null
            ];
            $snippets = $this->snippetService->list($filters);
            ApiResponse::success($snippets);
        } elseif ($method === 'POST') {
            $this->create();
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    public function show($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = $params[0] ?? null;
        if (!$id) {
            ApiResponse::error('Snippet ID required', 400);
        }

        $snippet = $this->snippetService->getById($id);
        
        if (!$snippet) {
            ApiResponse::error('Snippet not found', 404);
        }

        // Check visibility
        if ($snippet['visibility'] !== 'public') {
            $this->ensureAuth();
            if ($snippet['author_id'] !== $_SESSION['user_id']) {
                ApiResponse::error('Unauthorized', 403);
            }
        }

        ApiResponse::success($snippet);
    }

    public function create()
    {
        $this->ensureAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->snippetService->create($input, $_SESSION['user_id']);
        
        // Gamification hook
        $this->awardPoints('snippet.create');
        
        ApiResponse::success($result, 'Snippet created', 201);
    }

    public function update($method, $params)
    {
        if ($method !== 'PUT') {
            ApiResponse::error('Method not allowed', 405);
        }

        $this->ensureAuth();
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->snippetService->update($id, $input, $_SESSION['user_id']);
        
        ApiResponse::success($result, 'Snippet updated');
    }

    public function delete($method, $params)
    {
        if ($method !== 'DELETE') {
            ApiResponse::error('Method not allowed', 405);
        }

        $this->ensureAuth();
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $this->snippetService->delete($id, $_SESSION['user_id']);
        ApiResponse::success(null, 'Snippet deleted');
    }

    public function star($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $this->ensureAuth();
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $result = $this->snippetService->star($id, $_SESSION['user_id']);
        
        // Gamification hook
        $this->awardPoints('snippet.star');
        
        ApiResponse::success($result, 'Snippet starred');
    }

    public function unstar($method, $params)
    {
        if ($method !== 'DELETE') {
            ApiResponse::error('Method not allowed', 405);
        }

        $this->ensureAuth();
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $result = $this->snippetService->unstar($id, $_SESSION['user_id']);
        ApiResponse::success($result, 'Snippet unstarred');
    }

    public function fork($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $this->ensureAuth();
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->snippetService->fork($id, $_SESSION['user_id'], $input['title'] ?? null);
        
        // Gamification hook
        $this->awardPoints('snippet.fork');
        
        ApiResponse::success($result, 'Snippet forked', 201);
    }

    public function languages($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $languages = [
            'javascript', 'typescript', 'python', 'php', 'java', 'csharp', 'go', 'rust', 
            'ruby', 'swift', 'kotlin', 'c', 'cpp', 'html', 'css', 'sql', 'bash', 'yaml', 
            'json', 'xml', 'markdown'
        ];
        
        sort($languages);
        ApiResponse::success($languages);
    }

    public function versions($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        $versions = $this->snippetService->getVersions($id);
        ApiResponse::success($versions);
    }

    private function ensureAuth()
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (!isset($_SESSION['user_id'])) {
            ApiResponse::error('Unauthorized', 401);
        }
    }

    private function awardPoints($action)
    {
        try {
            // Manual Dependency Injection
            $userRepo = new \App\Repositories\UserRepository($this->pdo);
            $achievementRepo = new \App\Repositories\AchievementRepository($this->pdo);
            $auditRepo = new \App\Repositories\AuditRepository($this->pdo);
            $notificationRepo = new \App\Repositories\NotificationRepository($this->pdo);
            
            $emailService = new \App\Services\EmailService(); // Config defaults
            
            $notificationService = new \App\Services\NotificationService(
                $notificationRepo,
                $userRepo,
                $emailService
            );

            $gamification = new \App\Services\GamificationService(
                $userRepo,
                $achievementRepo,
                $auditRepo,
                new \App\Helpers\SecurityHelper(),
                $notificationService
            );
            
            $gamification->awardPoints($_SESSION['user_id'], $action);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            error_log("Failed to award points/notify: " . $e->getMessage());
        }
    }

    public function __call($name, $arguments)
    {
        if (is_numeric($name)) {
            $method = $arguments[0];
            $params = [$name]; // The name is the ID
            
            if ($method === 'GET') {
                $result = $this->snippetService->get($name);
                ApiResponse::success($result);
            } elseif ($method === 'PUT') {
                $this->update($method, $params);
                return;
            } elseif ($method === 'DELETE') {
                $this->delete($method, $params);
                return;
            }
        }
        
        ApiResponse::error('Action not found: ' . $name, 404);
    }
}