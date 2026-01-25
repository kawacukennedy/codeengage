<?php

namespace App\Models;

use PDO;

class Snippet
{
    private PDO $db;
    private ?int $id = null;
    private ?int $authorId = null;
    private ?int $organizationId = null;
    private ?string $title = null;
    private ?string $description = null;
    private ?string $visibility = null;
    private ?string $language = null;
    private ?int $forkedFromId = null;
    private ?bool $isTemplate = null;
    private ?array $templateVariables = null;
    private ?int $viewCount = null;
    private ?int $starCount = null;
    private ?\DateTime $createdAt = null;
    private ?\DateTime $updatedAt = null;
    private ?\DateTime $deletedAt = null;

    // Related objects
    private ?User $author = null;
    private ?Organization $organization = null;
    private ?Snippet $forkedFrom = null;
    private array $versions = [];
    private array $tags = [];

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->visibility = 'public';
        $this->isTemplate = false;
        $this->viewCount = 0;
        $this->starCount = 0;
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getAuthorId(): ?int { return $this->authorId; }
    public function getOrganizationId(): ?int { return $this->organizationId; }
    public function getTitle(): ?string { return $this->title; }
    public function getDescription(): ?string { return $this->description; }
    public function getVisibility(): ?string { return $this->visibility; }
    public function getLanguage(): ?string { return $this->language; }
    public function getForkedFromId(): ?int { return $this->forkedFromId; }
    public function getIsTemplate(): ?bool { return $this->isTemplate; }
    public function getTemplateVariables(): ?array { return $this->templateVariables; }
    public function getViewCount(): ?int { return $this->viewCount; }
    public function getStarCount(): ?int { return $this->starCount; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTime { return $this->updatedAt; }
    public function getDeletedAt(): ?\DateTime { return $this->deletedAt; }
    public function getAuthor(): ?User { return $this->author; }
    public function getOrganization(): ?Organization { return $this->organization; }
    public function getForkedFrom(): ?Snippet { return $this->forkedFrom; }
    public function getVersions(): array { return $this->versions; }
    public function getTags(): array { return $this->tags; }

    // Setters
    public function setAuthorId(int $authorId): self { $this->authorId = $authorId; return $this; }
    public function setOrganizationId(?int $organizationId): self { $this->organizationId = $organizationId; return $this; }
    public function setTitle(string $title): self { $this->title = $title; return $this; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }
    public function setVisibility(string $visibility): self { $this->visibility = $visibility; return $this; }
    public function setLanguage(string $language): self { $this->language = $language; return $this; }
    public function setForkedFromId(?int $forkedFromId): self { $this->forkedFromId = $forkedFromId; return $this; }
    public function setIsTemplate(bool $isTemplate): self { $this->isTemplate = $isTemplate; return $this; }
    public function setTemplateVariables(?array $templateVariables): self { $this->templateVariables = $templateVariables; return $this; }
    public function setViewCount(int $viewCount): self { $this->viewCount = $viewCount; return $this; }
    public function setStarCount(int $starCount): self { $this->starCount = $starCount; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO snippets (author_id, organization_id, title, description, visibility, language, forked_from_id, is_template, template_variables, view_count, star_count) 
                VALUES (:author_id, :organization_id, :title, :description, :visibility, :language, :forked_from_id, :is_template, :template_variables, :view_count, :star_count)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':author_id' => $this->authorId,
            ':organization_id' => $this->organizationId,
            ':title' => $this->title,
            ':description' => $this->description,
            ':visibility' => $this->visibility,
            ':language' => $this->language,
            ':forked_from_id' => $this->forkedFromId,
            ':is_template' => $this->isTemplate ? 1 : 0,
            ':template_variables' => $this->templateVariables ? json_encode($this->templateVariables) : null,
            ':view_count' => $this->viewCount,
            ':star_count' => $this->starCount
        ]);
    }

    private function update(): bool
    {
        $sql = "UPDATE snippets SET 
                author_id = :author_id, 
                organization_id = :organization_id,
                title = :title,
                description = :description,
                visibility = :visibility,
                language = :language,
                forked_from_id = :forked_from_id,
                is_template = :is_template,
                template_variables = :template_variables,
                view_count = :view_count,
                star_count = :star_count,
                updated_at = CURRENT_TIMESTAMP,
                deleted_at = :deleted_at
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':author_id' => $this->authorId,
            ':organization_id' => $this->organizationId,
            ':title' => $this->title,
            ':description' => $this->description,
            ':visibility' => $this->visibility,
            ':language' => $this->language,
            ':forked_from_id' => $this->forkedFromId,
            ':is_template' => $this->isTemplate ? 1 : 0,
            ':template_variables' => $this->templateVariables ? json_encode($this->templateVariables) : null,
            ':view_count' => $this->viewCount,
            ':star_count' => $this->starCount,
            ':deleted_at' => $this->deletedAt?->format('Y-m-d H:i:s')
        ]);
    }

    public function delete(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE snippets SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public function incrementViewCount(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE snippets SET view_count = view_count + 1 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public function toggleStar(int $userId): bool
    {
        // This would need a separate stars table implementation
        // For now, just increment the star count
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE snippets SET star_count = star_count + 1 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public function loadAuthor(): void
    {
        if ($this->authorId && !$this->author) {
            $this->author = User::findById($this->db, $this->authorId);
        }
    }

    public function loadOrganization(): void
    {
        if ($this->organizationId && !$this->organization) {
            $this->organization = Organization::findById($this->db, $this->organizationId);
        }
    }

    public function loadForkedFrom(): void
    {
        if ($this->forkedFromId && !$this->forkedFrom) {
            $this->forkedFrom = self::findById($this->db, $this->forkedFromId);
        }
    }

    public function loadVersions(): void
    {
        if ($this->id && empty($this->versions)) {
            $sql = "SELECT * FROM snippet_versions WHERE snippet_id = :id ORDER BY version_number DESC";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $this->id]);
            
            $this->versions = [];
            while ($data = $stmt->fetch()) {
                $this->versions[] = SnippetVersion::fromData($this->db, $data);
            }
        }
    }

    public function loadTags(): void
    {
        if ($this->id && empty($this->tags)) {
            $sql = "SELECT t.* FROM tags t 
                    JOIN snippet_tags st ON t.id = st.tag_id 
                    WHERE st.snippet_id = :id 
                    ORDER BY t.name";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $this->id]);
            
            $this->tags = [];
            while ($data = $stmt->fetch()) {
                $this->tags[] = Tag::fromData($this->db, $data);
            }
        }
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'author_id' => $this->authorId,
            'organization_id' => $this->organizationId,
            'title' => $this->title,
            'description' => $this->description,
            'visibility' => $this->visibility,
            'language' => $this->language,
            'forked_from_id' => $this->forkedFromId,
            'is_template' => $this->isTemplate,
            'template_variables' => $this->templateVariables,
            'view_count' => $this->viewCount,
            'star_count' => $this->starCount,
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updatedAt?->format('Y-m-d H:i:s')
        ];
    }

    public static function findById(PDO $db, int $id): ?self
    {
        $sql = "SELECT * FROM snippets WHERE id = :id AND deleted_at IS NULL";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findPublic(PDO $db, int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT * FROM snippets 
                WHERE visibility = 'public' AND deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $snippets = [];
        while ($data = $stmt->fetch()) {
            $snippets[] = self::fromData($db, $data);
        }
        
        return $snippets;
    }

    public static function findByAuthor(PDO $db, int $authorId, int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT * FROM snippets 
                WHERE author_id = :author_id AND deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':author_id', $authorId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $snippets = [];
        while ($data = $stmt->fetch()) {
            $snippets[] = self::fromData($db, $data);
        }
        
        return $snippets;
    }

    public static function fromData(PDO $db, array $data): self
    {
        $snippet = new self($db);
        
        $snippet->id = (int)$data['id'];
        $snippet->authorId = (int)$data['author_id'];
        $snippet->organizationId = $data['organization_id'] ? (int)$data['organization_id'] : null;
        $snippet->title = $data['title'];
        $snippet->description = $data['description'];
        $snippet->visibility = $data['visibility'];
        $snippet->language = $data['language'];
        $snippet->forkedFromId = $data['forked_from_id'] ? (int)$data['forked_from_id'] : null;
        $snippet->isTemplate = (bool)$data['is_template'];
        $snippet->templateVariables = $data['template_variables'] ? json_decode($data['template_variables'], true) : null;
        $snippet->viewCount = (int)$data['view_count'];
        $snippet->starCount = (int)$data['star_count'];
        $snippet->createdAt = new \DateTime($data['created_at']);
        $snippet->updatedAt = new \DateTime($data['updated_at']);
        $snippet->deletedAt = $data['deleted_at'] ? new \DateTime($data['deleted_at']) : null;
        
        return $snippet;
    }
}