<?php

namespace App\Models;

use PDO;

class Tag
{
    private PDO $db;
    private ?int $id = null;
    private ?string $name = null;
    private ?string $slug = null;
    private ?string $description = null;
    private ?int $usageCount = null;
    private ?\DateTime $createdAt = null;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->usageCount = 0;
    }

    // Getters
    public function getId(): ?int { return $this->id; }
    public function getName(): ?string { return $this->name; }
    public function getSlug(): ?string { return $this->slug; }
    public function getDescription(): ?string { return $this->description; }
    public function getUsageCount(): ?int { return $this->usageCount; }
    public function getCreatedAt(): ?\DateTime { return $this->createdAt; }

    // Setters
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function setSlug(string $slug): self { $this->slug = $slug; return $this; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }
    public function setUsageCount(int $usageCount): self { $this->usageCount = $usageCount; return $this; }

    public function save(): bool
    {
        if ($this->id === null) {
            return $this->insert();
        }
        return $this->update();
    }

    private function insert(): bool
    {
        $sql = "INSERT INTO tags (name, slug, description, usage_count) 
                VALUES (:name, :slug, :description, :usage_count)";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':name' => $this->name,
            ':slug' => $this->slug,
            ':description' => $this->description,
            ':usage_count' => $this->usageCount
        ]);
    }

    private function update(): bool
    {
        $sql = "UPDATE tags SET 
                name = :name, 
                slug = :slug,
                description = :description,
                usage_count = :usage_count
                WHERE id = :id";
        
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([
            ':id' => $this->id,
            ':name' => $this->name,
            ':slug' => $this->slug,
            ':description' => $this->description,
            ':usage_count' => $this->usageCount
        ]);
    }

    public function incrementUsage(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE tags SET usage_count = usage_count + 1 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public function decrementUsage(): bool
    {
        if ($this->id === null) {
            return false;
        }
        
        $sql = "UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        return $stmt->execute([':id' => $this->id]);
    }

    public static function findById(PDO $db, int $id): ?self
    {
        $sql = "SELECT * FROM tags WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findBySlug(PDO $db, string $slug): ?self
    {
        $sql = "SELECT * FROM tags WHERE slug = :slug";
        $stmt = $db->prepare($sql);
        $stmt->execute([':slug' => $slug]);
        
        $data = $stmt->fetch();
        if (!$data) {
            return null;
        }
        
        return self::fromData($db, $data);
    }

    public static function findPopular(PDO $db, int $limit = 20): array
    {
        $sql = "SELECT * FROM tags ORDER BY usage_count DESC, name ASC LIMIT :limit";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = self::fromData($db, $data);
        }
        
        return $tags;
    }

    public static function search(PDO $db, string $query, int $limit = 20): array
    {
        $sql = "SELECT * FROM tags 
                WHERE name LIKE :query OR description LIKE :query 
                ORDER BY usage_count DESC, name ASC 
                LIMIT :limit";
        $stmt = $db->prepare($sql);
        $stmt->bindValue(':query', "%{$query}%");
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = self::fromData($db, $data);
        }
        
        return $tags;
    }

    public static function fromData(PDO $db, array $data): self
    {
        $tag = new self($db);
        
        $tag->id = (int)$data['id'];
        $tag->name = $data['name'];
        $tag->slug = $data['slug'];
        $tag->description = $data['description'];
        $tag->usageCount = (int)$data['usage_count'];
        $tag->createdAt = new \DateTime($data['created_at']);
        
        return $tag;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'usage_count' => $this->usageCount,
            'created_at' => $this->createdAt ? $this->createdAt->format('Y-m-d H:i:s') : null
        ];
    }
}