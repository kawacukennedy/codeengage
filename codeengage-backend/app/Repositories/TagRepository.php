<?php

namespace App\Repositories;

use PDO;
use App\Models\Tag;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;

class TagRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?Tag
    {
        return Tag::findById($this->db, $id);
    }

    public function findBySlug(string $slug): ?Tag
    {
        $sql = "SELECT * FROM tags WHERE slug = :slug AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':slug' => $slug]);
        $data = $stmt->fetch();
        
        return $data ? Tag::fromData($this->db, $data) : null;
    }

    public function findByName(string $name): ?Tag
    {
        $sql = "SELECT * FROM tags WHERE name = :name AND deleted_at IS NULL";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':name' => $name]);
        $data = $stmt->fetch();
        
        return $data ? Tag::fromData($this->db, $data) : null;
    }

    public function create(array $data): Tag
    {
        if (empty($data['name'])) {
            throw new ValidationException('Tag name is required');
        }

        $name = trim($data['name']);
        if (strlen($name) > 50) {
            throw new ValidationException('Tag name cannot exceed 50 characters');
        }

        $slug = $this->generateSlug($name);
        
        if ($this->findBySlug($slug)) {
            throw new ValidationException('Tag already exists');
        }

        $sql = "
            INSERT INTO tags (name, slug, description) 
            VALUES (:name, :slug, :description)
        ";

        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':name' => $name,
            ':slug' => $slug,
            ':description' => $data['description'] ?? null
        ]);

        if (!$result) {
            throw new \Exception('Failed to create tag');
        }

        return $this->findById($this->db->lastInsertId());
    }

    public function findOrCreate(string $name): Tag
    {
        $slug = $this->generateSlug($name);
        $tag = $this->findBySlug($slug);
        
        if ($tag) {
            return $tag;
        }

        return $this->create(['name' => $name]);
    }

    public function update(int $id, array $data): Tag
    {
        $tag = $this->findById($id);
        if (!$tag) {
            throw new NotFoundException('Tag');
        }

        $updateData = [];

        if (isset($data['name'])) {
            $name = trim($data['name']);
            if (empty($name)) {
                throw new ValidationException('Tag name is required');
            }
            if (strlen($name) > 50) {
                throw new ValidationException('Tag name cannot exceed 50 characters');
            }

            $newSlug = $this->generateSlug($name);
            $existingTag = $this->findBySlug($newSlug);
            if ($existingTag && $existingTag->getId() !== $id) {
                throw new ValidationException('Tag name already exists');
            }

            $updateData['name'] = $name;
            $updateData['slug'] = $newSlug;
        }

        if (isset($data['description'])) {
            $updateData['description'] = $data['description'];
        }

        if (empty($updateData)) {
            return $tag;
        }

        $setClause = [];
        foreach ($updateData as $key => $value) {
            $setClause[] = "{$key} = :{$key}";
        }

        $sql = "UPDATE tags SET " . implode(', ', $setClause) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        
        foreach ($updateData as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }
        $stmt->bindValue(':id', $id);
        
        if (!$stmt->execute()) {
            throw new \Exception('Failed to update tag');
        }

        return $this->findById($id);
    }

    public function delete(int $id): bool
    {
        $sql = "UPDATE tags SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function findMany(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT * FROM tags WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE :search OR description LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($filters['usage_min'])) {
            $sql .= " AND usage_count >= :usage_min";
            $params[':usage_min'] = $filters['usage_min'];
        }

        $sql .= " ORDER BY usage_count DESC, name ASC";

        if ($limit > 0) {
            $sql .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        if ($limit > 0) {
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        }
        $stmt->execute();

        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = Tag::fromData($this->db, $data);
        }

        return $tags;
    }

    public function count(array $filters = []): int
    {
        $sql = "SELECT COUNT(*) as total FROM tags WHERE deleted_at IS NULL";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE :search OR description LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        if (!empty($filters['usage_min'])) {
            $sql .= " AND usage_count >= :usage_min";
            $params[':usage_min'] = $filters['usage_min'];
        }

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();

        return (int) $stmt->fetch()['total'];
    }

    public function getPopularTags(int $limit = 20): array
    {
        $sql = "
            SELECT * FROM tags 
            WHERE deleted_at IS NULL AND usage_count > 0 
            ORDER BY usage_count DESC, name ASC 
            LIMIT :limit
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = Tag::fromData($this->db, $data);
        }

        return $tags;
    }

    public function getTagsBySnippet(int $snippetId): array
    {
        $sql = "
            SELECT t.* FROM tags t
            JOIN snippet_tags st ON t.id = st.tag_id
            WHERE st.snippet_id = :snippet_id AND t.deleted_at IS NULL
            ORDER BY t.name ASC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);

        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = Tag::fromData($this->db, $data);
        }

        return $tags;
    }

    public function attachTagToSnippet(int $snippetId, int $tagId): bool
    {
        $sql = "
            INSERT IGNORE INTO snippet_tags (snippet_id, tag_id) 
            VALUES (:snippet_id, :tag_id)
        ";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':snippet_id' => $snippetId,
            ':tag_id' => $tagId
        ]);

        if ($result && $stmt->rowCount() > 0) {
            $this->incrementUsageCount($tagId);
        }

        return $result;
    }

    public function detachTagFromSnippet(int $snippetId, int $tagId): bool
    {
        $sql = "DELETE FROM snippet_tags WHERE snippet_id = :snippet_id AND tag_id = :tag_id";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':snippet_id' => $snippetId,
            ':tag_id' => $tagId
        ]);

        if ($result && $stmt->rowCount() > 0) {
            $this->decrementUsageCount($tagId);
        }

        return $result;
    }

    public function detachAllTagsFromSnippet(int $snippetId): bool
    {
        $sql = "
            SELECT tag_id FROM snippet_tags 
            WHERE snippet_id = :snippet_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);
        $tagIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $sql = "DELETE FROM snippet_tags WHERE snippet_id = :snippet_id";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([':snippet_id' => $snippetId]);

        if ($result && !empty($tagIds)) {
            foreach ($tagIds as $tagId) {
                $this->decrementUsageCount($tagId);
            }
        }

        return $result;
    }

    private function incrementUsageCount(int $tagId): void
    {
        $sql = "UPDATE tags SET usage_count = usage_count + 1 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $tagId]);
    }

    private function decrementUsageCount(int $tagId): void
    {
        $sql = "UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $tagId]);
    }

    private function generateSlug(string $name): string
    {
        $slug = strtolower($name);
        $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');
        
        return substr($slug, 0, 50);
    }

    public function getOrCreateTags(array $tagNames): array
    {
        $tags = [];
        foreach ($tagNames as $name) {
            if (!empty(trim($name))) {
                $tags[] = $this->findOrCreate(trim($name));
            }
        }
        return $tags;
    }

    public function searchByName(string $query, int $limit = 10): array
    {
        $sql = "
            SELECT * FROM tags 
            WHERE deleted_at IS NULL 
            AND name LIKE :query 
            ORDER BY usage_count DESC, name ASC 
            LIMIT :limit
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':query' => "%{$query}%",
            ':limit' => $limit
        ]);
        
        $tags = [];
        while ($data = $stmt->fetch()) {
            $tags[] = Tag::fromData($this->db, $data)->toArray();
        }
        
        return $tags;
    }

    public function findPopular(int $limit = 20): array
    {
        return $this->getPopularTags($limit);
    }
}