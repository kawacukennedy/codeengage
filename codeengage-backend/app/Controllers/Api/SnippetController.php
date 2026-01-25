<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\SnippetRepository;
use App\Repositories\UserRepository;
use App\Helpers\ApiResponse;
use App\Helpers\ValidationHelper;
use App\Middleware\AuthMiddleware;

class SnippetController
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

    public function index(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $filters = [
                'search' => $_GET['search'] ?? null,
                'language' => $_GET['language'] ?? null,
                'author_id' => $_GET['author_id'] ?? null,
                'visibility' => $_GET['visibility'] ?? null,
                'order_by' => $_GET['order_by'] ?? 'created_at',
                'order' => $_GET['order'] ?? 'DESC',
                'user_id' => $this->auth->optional()?->getId()
            ];

            $limit = (int)($_GET['limit'] ?? 20);
            $offset = (int)($_GET['offset'] ?? 0);

            $snippets = $this->snippetRepository->findMany($filters, $limit, $offset);
            $total = $this->snippetRepository->count($filters);

            ApiResponse::paginated($snippets, $total, $offset / $limit + 1, $limit);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch snippets');
        }
    }

    public function show(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check visibility permissions
            if (!$this->canViewSnippet($snippet)) {
                ApiResponse::error('Access denied', 403);
            }

            // Increment view count for non-owners
            $currentUser = $this->auth->optional();
            if (!$currentUser || $currentUser->getId() !== $snippet->getAuthorId()) {
                $this->snippetRepository->incrementViewCount($id);
            }

            // Load additional data
            $snippet->loadAuthor();
            $snippet->loadTags();
            $snippet->loadVersions();

            ApiResponse::success([
                'snippet' => $snippet->toArray(),
                'versions' => array_map(fn($v) => $v->toArray(), $snippet->getVersions()),
                'tags' => array_map(fn($t) => $t->toArray(), $snippet->getTags()),
                'can_edit' => $currentUser ? $currentUser->getId() === $snippet->getAuthorId() : false,
                'can_fork' => (bool)$currentUser
            ]);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch snippet');
        }
    }

    public function store(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            ValidationHelper::validateRequired($input, ['title', 'language', 'code']);
            ValidationHelper::validateLength($input['title'], 1, 255, 'title');
            ValidationHelper::validateEnum($input['visibility'] ?? 'public', ['public', 'private', 'organization'], 'visibility');

            $snippetData = [
                'title' => $input['title'],
                'description' => $input['description'] ?? null,
                'visibility' => $input['visibility'] ?? 'public',
                'language' => $input['language'],
                'author_id' => $currentUser->getId(),
                'is_template' => $input['is_template'] ?? false,
                'template_variables' => $input['template_variables'] ?? null,
                'tags' => $input['tags'] ?? []
            ];

            $snippet = $this->snippetRepository->create($snippetData, $input['code']);

            ApiResponse::success($snippet->toArray(), 'Snippet created successfully');

        } catch (\App\Exceptions\ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Failed to create snippet');
        }
    }

    public function update(string $method, array $params): void
    {
        if ($method !== 'PUT') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            ApiResponse::error('Invalid JSON input');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check edit permissions
            if (!$this->canEditSnippet($snippet, $currentUser)) {
                ApiResponse::error('Access denied', 403);
            }

            $updateData = [];
            $allowedFields = ['title', 'description', 'visibility', 'language', 'is_template', 'template_variables', 'tags'];

            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updateData[$field] = $input[$field];
                }
            }

            $updatedSnippet = $this->snippetRepository->update($id, $updateData, $input['code'] ?? null, $currentUser->getId());

            ApiResponse::success($updatedSnippet->toArray(), 'Snippet updated successfully');

        } catch (\App\Exceptions\ValidationException $e) {
            ApiResponse::error($e->getMessage(), 422, $e->getErrors());
        } catch (\Exception $e) {
            ApiResponse::error('Failed to update snippet');
        }
    }

    public function destroy(string $method, array $params): void
    {
        if ($method !== 'DELETE') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check delete permissions
            if (!$this->canDeleteSnippet($snippet, $currentUser)) {
                ApiResponse::error('Access denied', 403);
            }

            $this->snippetRepository->delete($id);

            ApiResponse::success(null, 'Snippet deleted successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to delete snippet');
        }
    }

    public function fork(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $title = $input['title'] ?? null;

        try {
            $originalSnippet = $this->snippetRepository->findById($id);
            if (!$originalSnippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check if user can view the original snippet
            if (!$this->canViewSnippet($originalSnippet)) {
                ApiResponse::error('Access denied', 403);
            }

            $fork = $this->snippetRepository->fork($id, $currentUser->getId(), $title);

            ApiResponse::success($fork->toArray(), 'Snippet forked successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fork snippet');
        }
    }

    public function star(string $method, array $params): void
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }

        $currentUser = $this->auth->handle();
        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Toggle star (would need separate stars table)
            $this->snippetRepository->incrementStarCount($id);

            ApiResponse::success(null, 'Snippet starred successfully');

        } catch (\Exception $e) {
            ApiResponse::error('Failed to star snippet');
        }
    }

    public function versions(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check view permissions
            if (!$this->canViewSnippet($snippet)) {
                ApiResponse::error('Access denied', 403);
            }

            $versions = $this->snippetRepository->getVersions($id);

            ApiResponse::success(array_map(fn($v) => $v->toArray(), $versions));

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch versions');
        }
    }

    public function analyses(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        $id = (int)($params[0] ?? 0);
        if ($id <= 0) {
            ApiResponse::error('Invalid snippet ID');
        }

        try {
            $snippet = $this->snippetRepository->findById($id);
            if (!$snippet) {
                ApiResponse::error('Snippet not found', 404);
            }

            // Check view permissions
            if (!$this->canViewSnippet($snippet)) {
                ApiResponse::error('Access denied', 403);
            }

            $versions = $this->snippetRepository->getVersions($id);
            $analyses = [];

            foreach ($versions as $version) {
                $analysisResults = $version->getAnalysisResults();
                if ($analysisResults) {
                    $analyses[] = [
                        'version' => $version->getVersionNumber(),
                        'created_at' => $version->getCreatedAt()->format('Y-m-d H:i:s'),
                        'analysis' => $analysisResults
                    ];
                }
            }

            ApiResponse::success($analyses);

        } catch (\Exception $e) {
            ApiResponse::error('Failed to fetch analyses');
        }
    }

    private function canViewSnippet($snippet, $user = null): bool
    {
        if (!$user) {
            $user = $this->auth->optional();
        }

        if (!$user) {
            return $snippet->getVisibility() === 'public';
        }

        // Owner can view their own snippets
        if ($user->getId() === $snippet->getAuthorId()) {
            return true;
        }

        // Public snippets are viewable by anyone
        if ($snippet->getVisibility() === 'public') {
            return true;
        }

        // Organization snippets require membership check (simplified)
        if ($snippet->getVisibility() === 'organization') {
            return $user->getId() === $snippet->getAuthorId();
        }

        return false;
    }

    private function canEditSnippet($snippet, $user): bool
    {
        // Owner can edit their snippets
        return $user->getId() === $snippet->getAuthorId();
    }

    private function canDeleteSnippet($snippet, $user): bool
    {
        // Owner can delete their snippets
        return $user->getId() === $snippet->getAuthorId();
    }
}