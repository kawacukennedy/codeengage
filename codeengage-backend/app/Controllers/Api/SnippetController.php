<?php

namespace App\Controllers\Api;

use App\Services\SnippetService;
use App\Helpers\ApiResponse;
use PDO;

class SnippetController
{
    private $snippetService;
    private $searchService;
    private $gamificationService;
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->snippetService = new SnippetService($pdo);
        
        // Manual DI for SearchService
        $snippetRepo = new \App\Repositories\SnippetRepository($pdo);
        $tagRepo = new \App\Repositories\TagRepository($pdo);
        $userRepo = new \App\Repositories\UserRepository($pdo);
        $this->searchService = new \App\Services\SearchService($snippetRepo, $tagRepo, $userRepo);

        // Manual DI for GamificationService
        $achievementRepo = new \App\Repositories\AchievementRepository($pdo);
        $auditRepo = new \App\Repositories\AuditRepository($pdo);
        $notificationRepo = new \App\Repositories\NotificationRepository($pdo);
        $emailService = new \App\Services\EmailService();
        $notificationService = new \App\Services\NotificationService($notificationRepo, $userRepo, $emailService);
        
        $this->gamificationService = new \App\Services\GamificationService(
            $userRepo,
            $achievementRepo,
            $auditRepo,
            new \App\Helpers\SecurityHelper(),
            $notificationService
        );
    }
    
    // ... index method ... 

    public function analyze($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = $params[0] ?? null;
        if (!$id) {
             ApiResponse::error('Snippet ID required', 400);
        }

        // Visibility/Auth check
        $snippet = $this->snippetService->getById($id);
        if ($snippet['visibility'] !== 'public') {
             $this->ensureAuth();
             if ($snippet['author_id'] !== $_SESSION['user_id']) {
                 ApiResponse::error('Unauthorized', 403);
             }
        }
        
        $result = $this->snippetService->analyzeSaved($id);
        
        // Trigger gamification
        if (isset($_SESSION['user_id'])) {
             $this->triggerGamification($_SESSION['user_id'], 'snippet.analyze');
        }

        ApiResponse::success($result);
    }

    // ... other methods ...

    private function incrementViewCountDebounced($id)
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        $viewedSnippets = $_SESSION['viewed_snippets'] ?? [];
        $lastViewed = $viewedSnippets[$id] ?? 0;
        
        // 1 hour debounce
        if (time() - $lastViewed > 3600) {
            $this->snippetService->incrementViewCount($id);
            $viewedSnippets[$id] = time();
            $_SESSION['viewed_snippets'] = $viewedSnippets;
            
            // Trigger View Gamification (actions are usually attributed to the AUTHOR of the snippet, not the viewer)
            // But wait, 'getting_noticed' achievement is for the AUTHOR.
            // So we need to find the author of this snippet and award them points!
            $snippet = $this->snippetService->getById($id);
            if ($snippet) {
                // Award points/check achievements for the AUTHOR
                $this->triggerGamification($snippet['author_id'], 'snippet.view');
            }
        }
    }

    private function triggerGamification($userId, $action, $context = [])
    {
        try {
            $this->gamificationService->awardPoints($userId, $action, $context);
        } catch (\Exception $e) {
            // Log error but don't fail properly
            error_log("Gamification error: " . $e->getMessage());
        }
    }

    public function index($method, $params)
    {
        if ($method === 'GET') {
            $filters = [
                'language' => $_GET['language'] ?? null,
                'visibility' => $_GET['visibility'] ?? 'public',
                'search' => $_GET['search'] ?? null,
                'author_id' => $_GET['author_id'] ?? null,
                'organization_id' => $_GET['organization_id'] ?? null,
                'tags' => isset($_GET['tags']) ? explode(',', $_GET['tags']) : null,
                'order_by' => $_GET['sort'] ?? 'created_at', // snippets.js sends 'sort' param mapping to order_by
                'order' => $_GET['order'] ?? 'DESC'
            ];
            
            // Clean filters
            $filters = array_filter($filters, function($v) { return !is_null($v) && $v !== ''; });

            // If searching, use SearchService
            if (!empty($filters['search'])) {
                 $page = (int)($_GET['page'] ?? 1);
                 $limit = (int)($_GET['per_page'] ?? $_GET['limit'] ?? 20);
                 
                 $searchParams = [
                     'q' => $filters['search'],
                     'page' => $page,
                     'limit' => $limit,
                     'filters' => $filters,
                     'sort' => $_GET['sort'] ?? 'relevance'
                 ];
                 
                 $results = $this->searchService->search($searchParams);
                 ApiResponse::success($results);
                 return;
            }
            
            // Normal browsing (Listing)
            $page = (int)($_GET['page'] ?? 1);
            $limit = (int)($_GET['per_page'] ?? $_GET['limit'] ?? 20);
            $offset = ($page - 1) * $limit;

            // Generate cache key based on filters and pagination
            $cacheKey = 'snippets_list_' . md5(json_encode($filters) . "_p{$page}_l{$limit}");
            
            // Try to get from cache
            $snippets = \App\Helpers\CacheHelper::get($cacheKey);
            
            if ($snippets === null) {
                $snippets = $this->snippetService->list($filters, $limit, $offset);
                // Cache for 1 minute (short TTL for lists)
                \App\Helpers\CacheHelper::set($cacheKey, $snippets, 60);
            }
            
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

        // Increment view count (debounced by session)
        $this->incrementViewCountDebounced($id);

        ApiResponse::success($snippet);
    }

    public function create()
    {
        $this->ensureAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->snippetService->create($input, $_SESSION['user_id']);
        
        $this->triggerGamification($_SESSION['user_id'], 'snippet.create');
        
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
        
        $this->triggerGamification($_SESSION['user_id'], 'snippet.star');
        
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
        
        $this->triggerGamification($_SESSION['user_id'], 'snippet.fork');
        
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

    public function restore($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $this->ensureAuth();
        $id = $params[0] ?? null;
        
        $this->snippetService->restore($id, $_SESSION['user_id']);
        ApiResponse::success(null, 'Snippet restored');
    }
    
    public function transfer($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $this->ensureAuth();
        $id = $params[0] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        $this->snippetService->transferOwnership($id, $_SESSION['user_id'], $input['new_owner_id']);
        ApiResponse::success(null, 'Ownership transferred');
    }
    
    public function forceDelete($method, $params)
    {
        if ($method !== 'DELETE') {
            ApiResponse::error('Method not allowed', 405);
        }
        $this->ensureAuth();
        $id = $params[0] ?? null;
        
        // Admin check (simple role check for now)
        $isAdmin = ($_SESSION['user_role'] ?? 'member') === 'admin';
        
        $this->snippetService->forceDelete($id, $_SESSION['user_id'], $isAdmin);
        ApiResponse::success(null, 'Snippet permanently deleted');
    }

    public function rollback($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        $this->ensureAuth();
        $id = $params[0] ?? null;
        
        $input = json_decode(file_get_contents('php://input'), true);
        $version = $input['version'] ?? null;
        
        if (!$version) {
            ApiResponse::error('Version number required', 400);
        }
        
        $this->snippetService->rollback($id, (int)$version, $_SESSION['user_id']);
        ApiResponse::success(null, 'Snippet rolled back');
    }

    public function related($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);
        
        $result = $this->snippetService->getRelated($id);
        ApiResponse::success($result);
    }

    public function analyses($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = $params[0] ?? null;
        if (!$id) ApiResponse::error('Snippet ID required', 400);

        // Check auth/visibility? 
        // Logic inside SnippetService::getAnalyses checks for existence, 
        // but Controller should check visibility if not public.
        // Assuming public snippets have public analysis.
        
         // Basic visibility check
        $snippet = $this->snippetService->getById($id); // Will 404 if not found
        // if private and not owner -> 403
        if ($snippet['visibility'] !== 'public') {
             $this->ensureAuth();
             if ($snippet['author_id'] !== $_SESSION['user_id']) {
                 ApiResponse::error('Unauthorized', 403);
             }
        }

        $result = $this->snippetService->getAnalyses($id);
        ApiResponse::success($result);
    }


    
    private function ensureAuth()
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (!isset($_SESSION['user_id'])) {
            ApiResponse::error('Unauthorized', 401);
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