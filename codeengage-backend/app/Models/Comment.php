<?php

namespace App\Models;

use PDO;

class Comment
{
    private PDO $db;
    private int $id;
    private int $snippetId;
    private int $userId;
    private string $content;
    private string $createdAt;
    private ?string $updatedAt;
    private ?string $deletedAt;
    
    // Loaded relationships
    private ?User $user = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }
    
    // Getters and Setters
    public function getId(): int { return $this->id; }
    public function getSnippetId(): int { return $this->snippetId; }
    public function setSnippetId(int $id): void { $this->snippetId = $id; }
    public function getUserId(): int { return $this->userId; }
    public function setUserId(int $id): void { $this->userId = $id; }
    public function getContent(): string { return $this->content; }
    public function setContent(string $content): void { $this->content = $content; }
    public function getCreatedAt(): string { return $this->createdAt; }
    public function getUser(): ?User { return $this->user; }
    public function setUser(User $user): void { $this->user = $user; }

    public static function fromData(PDO $db, array $data): self
    {
        $comment = new self($db);
        $comment->id = (int)$data['id'];
        $comment->snippetId = (int)$data['snippet_id'];
        $comment->userId = (int)$data['user_id'];
        $comment->content = $data['content'];
        $comment->createdAt = $data['created_at'];
        $comment->updatedAt = $data['updated_at'] ?? null;
        $comment->deletedAt = $data['deleted_at'] ?? null;
        
        if (isset($data['username'])) {
            $user = new User($db);
            $user->setId($comment->userId);
            $user->setUsername($data['username']);
            $user->setDisplayName($data['display_name'] ?? $data['username']);
            $user->setAvatarUrl($data['avatar_url'] ?? null);
            $comment->setUser($user);
        }
        
        return $comment;
    }
    
    public function save(): bool
    {
        if (isset($this->id)) {
            // Update
            $sql = "UPDATE comments SET content = :content WHERE id = :id";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([
                ':content' => $this->content,
                ':id' => $this->id
            ]);
        } else {
            // Create
            $sql = "INSERT INTO comments (snippet_id, user_id, content) VALUES (:snippet_id, :user_id, :content)";
            $stmt = $this->db->prepare($sql);
            $result = $stmt->execute([
                ':snippet_id' => $this->snippetId,
                ':user_id' => $this->userId,
                ':content' => $this->content
            ]);
            
            if ($result) {
                $this->id = (int)$this->db->lastInsertId();
            }
            return $result;
        }
    }
    
    public function delete(): bool
    {
        $sql = "UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $this->id]);
    }
    
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'snippet_id' => $this->snippetId,
            'user_id' => $this->userId,
            'content' => $this->content,
            'created_at' => $this->createdAt,
            'user' => $this->user ? [
                'id' => $this->user->getId(),
                'username' => $this->user->getUsername(),
                'display_name' => $this->user->getDisplayName(),
                'avatar_url' => $this->user->getAvatarUrl()
            ] : null
        ];
    }
}
