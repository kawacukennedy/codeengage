<?php

namespace App\Controllers\Api;

use App\Services\SnippetService;
use App\Helpers\ApiResponse;
use PDO;

class SnippetController
{
    private $snippetService;

    public function __construct(PDO $pdo)
    {
        $this->snippetService = new SnippetService($pdo);
    }

    public function index($method, $params)
    {
        if ($method === 'GET') {
            $filters = [
                'language' => $_GET['language'] ?? null,
                'visibility' => 'public'
            ];
            $snippets = $this->snippetService->list($filters);
            ApiResponse::success($snippets);
        } elseif ($method === 'POST') {
            $this->create();
        } else {
            ApiResponse::error('Method not allowed', 405);
        }
    }

    public function create()
    {
        // Auth check - rudimentary
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (!isset($_SESSION['user_id'])) {
            ApiResponse::error('Unauthorized', 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $result = $this->snippetService->create($input, $_SESSION['user_id']);
        
        ApiResponse::success($result, 'Snippet created', 201);
    }
    
    // For specific IDs, e.g. GET /snippets/1
    public function show($id) 
    {
       // This would need routing logic to call specific methods based on ID presence
       // But in index.php routing: $controller->$action($method, $params)
       // If URL is /snippets/123, action is '123'. 
       // This requires the Router (index.php) to be smarter or the Controller to handle dynamic actions.
       // Current index.php:
       // if uriParts[0] == 'snippets', action = uriParts[1] (which is ID).
       // So action becomes "123". Method "123" does not exist.
       // Refactoring index.php or Controller method `__call` is needed.
       // Better: Standardize index.php to pass ID as param to a common method.
    }
    
    // Magic method to catch ID-based actions if not defined
    public function __call($name, $arguments)
    {
        // $name is the action (ID or sub-resource)
        // $arguments[0] is method, $arguments[1] is params
        
        if (is_numeric($name)) {
            $method = $arguments[0];
            if ($method === 'GET') {
                $result = $this->snippetService->get($name);
                ApiResponse::success($result);
            }
        }
        
        ApiResponse::error('Action not found: ' . $name, 404);
    }
}