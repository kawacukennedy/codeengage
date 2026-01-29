<?php

namespace App\Models;

use PDO;

class Snippet
{
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function create(array $data)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO snippets (
                author_id, title, description, visibility, language, 
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $data['author_id'],
            $data['title'],
            $data['description'] ?? '',
            $data['visibility'] ?? 'public',
            $data['language'],
            date('Y-m-d H:i:s')
        ]);
        
        return $this->pdo->lastInsertId();
    }

    public function createVersion($snippetId, $code, $editorId, $versionNumber = 1)
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO snippet_versions (
                snippet_id, version_number, code, checksum, editor_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $checksum = hash('sha256', $code);
        
        $stmt->execute([
            $snippetId,
            $versionNumber,
            $code,
            $checksum,
            $editorId,
            date('Y-m-d H:i:s')
        ]);
        
        return $this->pdo->lastInsertId();
    }

    public function findAll($filters = [])
    {
        $sql = "SELECT s.*, u.username as author_name 
                FROM snippets s 
                JOIN users u ON s.author_id = u.id 
                WHERE s.deleted_at IS NULL";
                
        $params = [];
        
        if (!empty($filters['visibility'])) {
            $sql .= " AND s.visibility = ?";
            $params[] = $filters['visibility'];
        }
        
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = ?";
            $params[] = $filters['language'];
        }
        
        $sql .= " ORDER BY s.created_at DESC LIMIT 20";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById($id)
    {
        $stmt = $this->pdo->prepare("
            SELECT s.*, u.username as author_name 
            FROM snippets s 
            JOIN users u ON s.author_id = u.id
            WHERE s.id = ? AND s.deleted_at IS NULL
        ");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
    
    public function getLatestVersion($snippetId)
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM snippet_versions 
            WHERE snippet_id = ? 
            ORDER BY version_number DESC 
            LIMIT 1
        ");
        $stmt->execute([$snippetId]);
        return $stmt->fetch();
    }
    public function update($id, array $data)
    {
        $fields = [];
        $values = [];
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'description', 'visibility', 'language', 'is_template', 'template_variables'])) {
                $fields[] = "{$key} = ?";
                $values[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $fields[] = "updated_at = ?";
        $values[] = date('Y-m-d H:i:s');
        
        $sql = "UPDATE snippets SET " . implode(', ', $fields) . " WHERE id = ?";
        $values[] = $id;
        
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id)
    {
        $stmt = $this->pdo->prepare("UPDATE snippets SET deleted_at = ? WHERE id = ?");
        return $stmt->execute([date('Y-m-d H:i:s'), $id]);
    }

    public function star($snippetId, $userId)
    {
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO snippet_stars (snippet_id, user_id, created_at) VALUES (?, ?, ?)");
        $result = $stmt->execute([$snippetId, $userId, date('Y-m-d H:i:s')]);
        
        if ($result && $stmt->rowCount() > 0) {
            $this->pdo->prepare("UPDATE snippets SET star_count = star_count + 1 WHERE id = ?")->execute([$snippetId]);
        }
        
        return $result;
    }

    public function unstar($snippetId, $userId)
    {
        $stmt = $this->pdo->prepare("DELETE FROM snippet_stars WHERE snippet_id = ? AND user_id = ?");
        $result = $stmt->execute([$snippetId, $userId]);
        
        if ($result && $stmt->rowCount() > 0) {
            $this->pdo->prepare("UPDATE snippets SET star_count = GREATEST(0, star_count - 1) WHERE id = ?")->execute([$snippetId]);
        }
        
        return $result;
    }

    public function getAllVersions($snippetId)
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM snippet_versions 
            WHERE snippet_id = ? 
            ORDER BY version_number DESC
        ");
        $stmt->execute([$snippetId]);
        return $stmt->fetchAll();
    }

    public function incrementViewCount($id)
    {
        $stmt = $this->pdo->prepare("UPDATE snippets SET view_count = view_count + 1 WHERE id = ?");
        return $stmt->execute([$id]);
    }
    public static function fromData(PDO $pdo, array $data): self
    {
        $snippet = new self($pdo);
        $snippet->id = $data['id'] ?? null;
        $snippet->authorId = $data['author_id'] ?? null;
        $snippet->organizationId = $data['organization_id'] ?? null;
        $snippet->title = $data['title'] ?? null;
        $snippet->description = $data['description'] ?? null;
        $snippet->visibility = $data['visibility'] ?? 'public';
        $snippet->language = $data['language'] ?? null;
        $snippet->forkedFromId = $data['forked_from_id'] ?? null;
        $snippet->starCount = $data['star_count'] ?? 0;
        $snippet->viewCount = $data['view_count'] ?? 0;
        $snippet->isTemplate = (bool)($data['is_template'] ?? false);
        $snippet->templateVariables = $data['template_variables'] ?? null;
        $snippet->createdAt = $data['created_at'] ?? null;
        $snippet->updatedAt = $data['updated_at'] ?? null;
        $snippet->deletedAt = $data['deleted_at'] ?? null;
        
        // Hydrate extra fields if present
        if (isset($data['author_name'])) {
            $snippet->authorName = $data['author_name'];
        }
        
        return $snippet;
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
            'star_count' => $this->starCount,
            'view_count' => $this->viewCount,
            'is_template' => $this->isTemplate,
            'template_variables' => $this->templateVariables,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'author_name' => $this->authorName ?? null
        ];
    }

    // Getters and Setters needed for hydration
    private $id;
    private $authorId;
    private $organizationId;
    private $title;
    private $description;
    private $visibility;
    private $language;
    private $forkedFromId;
    private $starCount;
    private $viewCount;
    private $isTemplate;
    private $templateVariables;
    private $createdAt;
    private $updatedAt;
    private $deletedAt;
    private $authorName;

    public function getId() { return $this->id; }
    public function setId($id) { $this->id = $id; }
    public function getTitle() { return $this->title; }
    public function setTitle($title) { $this->title = $title; }
    public function getDescription() { return $this->description; }
    public function setDescription($description) { $this->description = $description; }
    public function getVisibility() { return $this->visibility; }
    public function setVisibility($visibility) { $this->visibility = $visibility; }
    public function getLanguage() { return $this->language; }
    public function setLanguage($language) { $this->language = $language; }
    public function getAuthorId() { return $this->authorId; }
    public function setAuthorId($authorId) { $this->authorId = $authorId; }
    public function getOrganizationId() { return $this->organizationId; }
    public function setOrganizationId($organizationId) { $this->organizationId = $organizationId; }
    public function setForkedFromId($id) { $this->forkedFromId = $id; }
    public function setIsTemplate($isTemplate) { $this->isTemplate = $isTemplate; }
    public function setTemplateVariables($vars) { $this->templateVariables = $vars; }
    public function setUsageCount($count) { /* for tags */ }
    public function incrementUsage() { /* for tags */ }
    public function save() {
        if ($this->id) {
            return $this->update($this->id, [
                'title' => $this->title,
                'description' => $this->description,
                'visibility' => $this->visibility,
                'language' => $this->language,
                'is_template' => $this->isTemplate,
                'template_variables' => $this->templateVariables
            ]);
        } else {
             $id = $this->create([
                'author_id' => $this->authorId,
                'title' => $this->title,
                'description' => $this->description,
                'visibility' => $this->visibility,
                'language' => $this->language,
                'organization_id' => $this->organizationId,
                'forked_from_id' => $this->forkedFromId,
                'is_template' => $this->isTemplate,
                'template_variables' => $this->templateVariables
             ]);
             if ($id) {
                 $this->id = $id;
                 return true;
             }
             return false;
        }
    }
    
    public function loadTags() { /* ... */ }
    public function getTags() { return []; /* Placeholder */ }
    public function incrementViewCountMethod() { return $this->incrementViewCount($this->id); }
    public function toggleStar($userId) { 
        if ($this->isStarredByUser($this->id, $userId)) {
            return $this->unstar($this->id, $userId);
        } else {
            return $this->star($this->id, $userId);
        }
    }
}