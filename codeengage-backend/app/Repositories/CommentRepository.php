<?php

namespace App\Repositories;

use PDO;
use App\Models\Comment;

class CommentRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findBySnippetId(int $snippetId): array
    {
        $sql = "
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.snippet_id = :snippet_id AND c.deleted_at IS NULL
            ORDER BY c.created_at ASC
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        
        $comments = [];
        while ($data = $stmt->fetch()) {
            $comments[] = Comment::fromData($this->db, $data);
        }
        return $comments;
    }

    public function findById(int $id): ?Comment
    {
        $sql = "
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = :id AND c.deleted_at IS NULL
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        
        return $data ? Comment::fromData($this->db, $data) : null;
    }
    
    public function create(int $snippetId, int $userId, string $content): Comment
    {
        $comment = new Comment($this->db);
        $comment->setSnippetId($snippetId);
        $comment->setUserId($userId);
        $comment->setContent($content);
        $comment->save();
        
        // Reload to get dates and user
        return $this->findById($comment->getId());
    }
}
