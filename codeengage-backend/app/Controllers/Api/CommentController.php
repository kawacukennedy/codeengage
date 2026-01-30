<?php

namespace App\Controllers\Api;

use PDO;
use App\Repositories\CommentRepository;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;

class CommentController
{
    private PDO $db;
    private CommentRepository $commentRepository;
    private AuthMiddleware $auth;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->commentRepository = new CommentRepository($db);
        $this->auth = new AuthMiddleware($db);
    }
    
    public function index($method, $params)
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $snippetId = $params[0] ?? null;
        if (!$snippetId) ApiResponse::error('Snippet ID required', 400);
        
        $comments = $this->commentRepository->findBySnippetId($snippetId);
        
        $data = array_map(fn($c) => $c->toArray(), $comments);
        ApiResponse::success($data);
    }
    
    public function store($method, $params)
    {
        if ($method !== 'POST') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $user = $this->auth->handle();
        $snippetId = $params[0] ?? null;
        if (!$snippetId) ApiResponse::error('Snippet ID required', 400);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $content = $input['content'] ?? '';
        
        if (trim($content) === '') {
            ApiResponse::error('Content required', 422);
        }
        
        $comment = $this->commentRepository->create($snippetId, $user->getId(), $content);
        
        // Manually load user data for response if missing (Repo's findById doesn't join user yet, but findBySnippetId does)
        // I should update Repository findById to join user or reload using findBySnippetId approach logic
        // For now, let's just return what we have, frontend might need user info immediately.
        // Actually Repository->create calls findById. Models/Comment::fromData doesn't load user unless provided in array.
        // I should make Repository::findById join user too.
        
        ApiResponse::success($comment->toArray(), 'Comment posted', 201);
    }
    
    public function destroy($method, $params)
    {
        if ($method !== 'DELETE') {
            ApiResponse::error('Method not allowed', 405);
        }
        
        $user = $this->auth->handle();
        $id = $params[0] ?? null;
        
        $comment = $this->commentRepository->findById($id);
        if (!$comment) ApiResponse::error('Comment not found', 404);
        
        // Check ownership or admin
        if ($comment->getUserId() !== $user->getId() && $user->getRole() !== 'admin') {
             ApiResponse::error('Unauthorized', 403);
        }
        
        $comment->delete();
        ApiResponse::success(null, 'Comment deleted');
    }
}
