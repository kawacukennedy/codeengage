<?php

namespace App\Repositories;

use PDO;
use App\Models\Snippet;
use App\Models\SnippetVersion;
use App\Models\Tag;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Helpers\ValidationHelper;
use App\Helpers\CodeHelper;

class SnippetRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function findById(int $id): ?Snippet
    {
        return Snippet::findById($this->db, $id);
    }

    public function create(array $data, string $code): Snippet
    {
        ValidationHelper::validateRequired($data, ['title', 'language', 'author_id']);
        ValidationHelper::validateLength($data['title'], 1, 255, 'title');
        ValidationHelper::validateLength($data['description'], 0, 1000, 'description');
        ValidationHelper::validateEnum($data['visibility'] ?? 'public', ['public', 'private', 'organization'], 'visibility');

        $snippet = new Snippet($this->db);
        $snippet->setTitle($data['title']);
        $snippet->setDescription($data['description'] ?? null);
        $snippet->setVisibility($data['visibility'] ?? 'public');
        $snippet->setLanguage($data['language']);
        $snippet->setAuthorId($data['author_id']);
        $snippet->setOrganizationId($data['organization_id'] ?? null);
        $snippet->setForkedFromId($data['forked_from_id'] ?? null);
        $snippet->setIsTemplate($data['is_template'] ?? false);
        $snippet->setTemplateVariables($data['template_variables'] ?? null);

        if (!$snippet->save()) {
            throw new \Exception('Failed to create snippet');
        }

        // Create first version
        $this->createVersion($snippet->getId(), $code, $data['author_id'], 'Initial version');

        // Handle tags if provided
        if (!empty($data['tags'])) {
            $this->updateTags($snippet->getId(), $data['tags']);
        }

        return $this->findById($snippet->getId());
    }

    public function update(int $id, array $data, ?string $code = null, int $editorId = null): Snippet
    {
        $snippet = $this->findById($id);
        if (!$snippet) {
            throw new NotFoundException('Snippet');
        }

        if (isset($data['title'])) {
            ValidationHelper::validateLength($data['title'], 1, 255, 'title');
            $snippet->setTitle($data['title']);
        }

        if (isset($data['description'])) {
            ValidationHelper::validateLength($data['description'], 0, 1000, 'description');
            $snippet->setDescription($data['description']);
        }

        if (isset($data['visibility'])) {
            ValidationHelper::validateEnum($data['visibility'], ['public', 'private', 'organization'], 'visibility');
            $snippet->setVisibility($data['visibility']);
        }

        if (isset($data['language'])) {
            $snippet->setLanguage($data['language']);
        }

        if (isset($data['is_template'])) {
            $snippet->setIsTemplate((bool)$data['is_template']);
        }

        if (isset($data['template_variables'])) {
            $snippet->setTemplateVariables($data['template_variables']);
        }

        if (!$snippet->save()) {
            throw new \Exception('Failed to update snippet');
        }

        // Create new version if code is provided
        if ($code !== null && $editorId !== null) {
            $this->createVersion($id, $code, $editorId, $data['change_summary'] ?? 'Updated');
        }

        // Handle tags if provided
        if (isset($data['tags'])) {
            $this->updateTags($id, $data['tags']);
        }

        return $this->findById($id);
    }

    public function delete(int $id): bool
    {
        $snippet = $this->findById($id);
        if (!$snippet) {
            throw new NotFoundException('Snippet');
        }

        return $snippet->delete();
    }

    public function findMany(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT s.* FROM snippets s WHERE s.deleted_at IS NULL";
        $params = [];

        // Apply visibility filter
        $sql .= $this->buildVisibilityClause($filters, $params);

        // Apply search filter
        if (!empty($filters['search'])) {
            $sql .= " AND (s.title LIKE :search OR s.description LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        // Apply language filter
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }

        // Apply author filter
        if (!empty($filters['author_id'])) {
            $sql .= " AND s.author_id = :author_id";
            $params[':author_id'] = $filters['author_id'];
        }

        // Apply organization filter
        if (!empty($filters['organization_id'])) {
            $sql .= " AND s.organization_id = :organization_id";
            $params[':organization_id'] = $filters['organization_id'];
        }

        // Apply template filter
        if (isset($filters['is_template'])) {
            $sql .= " AND s.is_template = :is_template";
            $params[':is_template'] = $filters['is_template'] ? 1 : 0;
        }

        // Add tag filter
        if (!empty($filters['tags'])) {
            $sql .= " AND EXISTS (
                SELECT 1 FROM snippet_tags st 
                JOIN tags t ON st.tag_id = t.id 
                WHERE st.snippet_id = s.id AND t.slug IN (" . implode(',', array_fill(0, count($filters['tags']), '?')) . ")
            )";
            $params = array_merge($params, $filters['tags']);
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'created_at';
        $order = $filters['order'] ?? 'DESC';
        $sql .= " ORDER BY s.{$orderBy} {$order}";

        // Pagination
        if ($limit > 0) {
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $snippets = [];
        while ($data = $stmt->fetch()) {
            $snippets[] = Snippet::fromData($this->db, $data);
        }

        return $snippets;
    }

    public function count(array $filters = []): int
    {
        $sql = "SELECT COUNT(*) as total FROM snippets s WHERE s.deleted_at IS NULL";
        $params = [];

        // Apply visibility filter
        $sql .= $this->buildVisibilityClause($filters, $params);

        // Apply search filter
        if (!empty($filters['search'])) {
            $sql .= " AND (s.title LIKE :search OR s.description LIKE :search)";
            $params[':search'] = "%{$filters['search']}%";
        }

        // Apply other filters (similar to findMany)
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }

        if (!empty($filters['author_id'])) {
            $sql .= " AND s.author_id = :author_id";
            $params[':author_id'] = $filters['author_id'];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return (int)$stmt->fetch()['total'];
    }

    public function incrementViewCount(int $id): bool
    {
        $snippet = $this->findById($id);
        if (!$snippet) {
            return false;
        }

        return $snippet->incrementViewCount();
    }

    public function incrementStarCount(int $id): bool
    {
        $snippet = $this->findById($id);
        if (!$snippet) {
            return false;
        }

        return $snippet->toggleStar(0); // Use a placeholder user ID
    }

    public function fork(int $id, int $authorId, ?string $title = null): Snippet
    {
        $original = $this->findById($id);
        if (!$original) {
            throw new NotFoundException('Snippet');
        }

        $latestVersion = $this->getLatestVersion($id);
        if (!$latestVersion) {
            throw new \Exception('No versions found for original snippet');
        }

        $forkData = [
            'title' => $title ?? "Fork of {$original->getTitle()}",
            'description' => $original->getDescription(),
            'visibility' => $original->getVisibility(),
            'language' => $original->getLanguage(),
            'author_id' => $authorId,
            'forked_from_id' => $id,
            'is_template' => false,
        ];

        $fork = $this->create($forkData, $latestVersion->getCode());

        return $fork;
    }

    public function getVersions(int $snippetId): array
    {
        $snippet = $this->findById($snippetId);
        if (!$snippet) {
            throw new NotFoundException('Snippet');
        }

        return SnippetVersion::findBySnippet($this->db, $snippetId);
    }

    public function getLatestCode(int $snippetId): string
    {
        $versions = $this->getVersions($snippetId);
        if (!empty($versions)) {
            return $versions[0]->getCode();
        }
        
        return '';
    }

    public function getLatestVersion(int $snippetId): ?SnippetVersion
    {
        return SnippetVersion::findLatest($this->db, $snippetId);
    }

    public function getTags(int $snippetId): array
    {
        $snippet = $this->findById($snippetId);
        if (!$snippet) {
            throw new NotFoundException('Snippet');
        }

        $snippet->loadTags();
        return $snippet->getTags();
    }

    private function createVersion(int $snippetId, string $code, int $editorId, string $summary): void
    {
        // Get latest version number
        $sql = "SELECT MAX(version_number) as max_version FROM snippet_versions WHERE snippet_id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $snippetId]);
        $result = $stmt->fetch();
        $versionNumber = ($result['max_version'] ?? 0) + 1;

        $version = new SnippetVersion($this->db);
        $version->setSnippetId($snippetId);
        $version->setVersionNumber($versionNumber);
        $version->setCode($code);
        $version->setEditorId($editorId);
        $version->setChangeSummary($summary);

        // Perform code analysis
        $analysisResults = $this->analyzeCode($code);
        $version->setAnalysisResults($analysisResults);

        if (!$version->save()) {
            throw new \Exception('Failed to create snippet version');
        }
    }

    private function analyzeCode(string $code): array
    {
        $language = CodeHelper::detectLanguage($code);
        
        return [
            'complexity_score' => CodeHelper::calculateComplexity($code),
            'security_issues' => CodeHelper::detectSecurityIssues($code, $language),
            'functions' => CodeHelper::extractFunctions($code, $language),
            'language' => $language,
            'lines_of_code' => substr_count($code, "\n") + 1,
            'character_count' => strlen($code),
        ];
    }

    private function updateTags(int $snippetId, array $tagNames): void
    {
        // Clear existing tags
        $sql = "DELETE FROM snippet_tags WHERE snippet_id = :snippet_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':snippet_id' => $snippetId]);

        // Add new tags
        foreach ($tagNames as $tagName) {
            $tag = $this->findOrCreateTag($tagName);
            
            $sql = "INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (:snippet_id, :tag_id)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':snippet_id' => $snippetId,
                ':tag_id' => $tag->getId()
            ]);

            $tag->incrementUsage();
            $tag->save();
        }
    }

    private function findOrCreateTag(string $tagName): Tag
    {
        $slug = strtolower(preg_replace('/[^a-z0-9]+/', '-', trim($tagName)));
        $slug = trim($slug, '-');

        $tag = Tag::findBySlug($this->db, $slug);
        if (!$tag) {
            $tag = new Tag($this->db);
            $tag->setName($tagName);
            $tag->setSlug($slug);
            $tag->setDescription('');
            $tag->setUsageCount(0);
            $tag->save();
        }

        return $tag;
    }

    private function buildVisibilityClause(array $filters, array &$params): string
    {
        $clause = "";

        if (!empty($filters['visibility'])) {
            if (is_array($filters['visibility'])) {
                $placeholders = implode(',', array_fill(0, count($filters['visibility']), '?'));
                $clause .= " AND s.visibility IN ({$placeholders})";
                $params = array_merge($params, $filters['visibility']);
            } else {
                $clause .= " AND s.visibility = ?";
                $params[] = $filters['visibility'];
            }
        } elseif (!empty($filters['user_id'])) {
            // Show all snippets for the current user
            $clause .= " AND (s.visibility = 'public' OR s.author_id = ?)";
            $params[] = $filters['user_id'];
        } else {
            // Default: only show public snippets
            $clause .= " AND s.visibility = 'public'";
        }

        return $clause;
    }
}