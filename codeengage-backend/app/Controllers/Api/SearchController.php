<?php

namespace App\Controllers\Api;

use App\Services\SearchService;
use App\Repositories\SnippetRepository;
use App\Repositories\TagRepository;
use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;
use PDO;

class SearchController
{
    private SearchService $searchService;

    public function __construct(PDO $pdo)
    {
        $snippetRepository = new SnippetRepository($pdo);
        $tagRepository = new TagRepository($pdo);
        $userRepository = new UserRepository($pdo);
        
        $this->searchService = new SearchService(
            $snippetRepository,
            $tagRepository,
            $userRepository
        );
    }

    public function index($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $query = $_GET['q'] ?? '';
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $sort = $_GET['sort'] ?? 'relevance';
        
        $filters = [];
        if (!empty($_GET['language'])) {
            $filters['language'] = $_GET['language'];
        }
        if (!empty($_GET['visibility'])) {
            $filters['visibility'] = $_GET['visibility'];
        }
        
        // Handle semantic search flag
        $semantic = isset($_GET['semantic']) && $_GET['semantic'] === 'true';

        $searchParams = [
            'q' => $query,
            'page' => $page,
            'limit' => $limit,
            'sort' => $sort,
            'filters' => $filters,
            'semantic' => $semantic
        ];

        $results = $this->searchService->search($searchParams);
        ApiResponse::success($results);
    }
    
    public function suggest($method, $params)
    {
        if ($method !== 'GET') {
             ApiResponse::error('Method not allowed', 405);
        }
        
        $type = $_GET['type'] ?? 'tags';
        $query = $_GET['q'] ?? '';
        
        if (empty($query)) {
            ApiResponse::success([]);
            return;
        }
        
        if ($type === 'users') {
            $results = $this->searchService->suggestUsers($query);
        } else {
            $results = $this->searchService->suggestTags($query);
        }
        
        ApiResponse::success($results);
    }
}
