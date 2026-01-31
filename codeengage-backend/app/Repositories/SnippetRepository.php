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
        $snippet = new Snippet($this->db);
        $data = $snippet->findById($id);
        
        if (!$data) {
            return null;
        }

        return Snippet::fromData($this->db, $data);
    }

    public function findWithTrashed(int $id): ?Snippet
    {
        $sql = "SELECT * FROM snippets WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $data = $stmt->fetch();
        
        if (!$data) {
            return null;
        }

        return Snippet::fromData($this->db, $data);
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

    public function update(int $id, array $data, $code = null, $editorId = null): Snippet
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

        // Create new version only if code has changed
        if ($code !== null && $editorId !== null) {
            $latestVersion = $this->getLatestVersion($id);
            if (!$latestVersion || $latestVersion->getCode() !== $code) {
                // Calculate checksum logic can be here or just string compare as above
                $this->createVersion($id, $code, $editorId, $data['change_summary'] ?? 'Updated');
            }
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
            $sql .= " AND (s.title LIKE ? OR s.description LIKE ?)";
            $params[] = "%{$filters['search']}%";
            $params[] = "%{$filters['search']}%";
        }

        // Apply language filter
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = ?";
            $params[] = $filters['language'];
        }

        // Apply author filter
        if (!empty($filters['author_id'])) {
            $sql .= " AND s.author_id = ?";
            $params[] = $filters['author_id'];
        }

        // Apply organization filter
        if (!empty($filters['organization_id'])) {
            $sql .= " AND s.organization_id = ?";
            $params[] = $filters['organization_id'];
        }

        // Apply template filter
        if (isset($filters['is_template'])) {
            $sql .= " AND s.is_template = ?";
            $params[] = $filters['is_template'] ? 1 : 0;
        }

        // Add tag filter
        if (!empty($filters['tags'])) {
            $placeholders = implode(',', array_fill(0, count($filters['tags']), '?'));
            $sql .= " AND EXISTS (
                SELECT 1 FROM snippet_tags st 
                JOIN tags t ON st.tag_id = t.id 
                WHERE st.snippet_id = s.id AND t.slug IN ($placeholders)
            )";
            foreach ($filters['tags'] as $tag) {
                $params[] = $tag;
            }
        }

        // Order by
        $orderBy = $filters['order_by'] ?? 'created_at';
        $allowedSorts = ['created_at', 'updated_at', 'view_count', 'star_count', 'title'];
        if (!in_array($orderBy, $allowedSorts)) {
            $orderBy = 'created_at';
        }
        
        $order = strtoupper($filters['order'] ?? 'DESC');
        if (!in_array($order, ['ASC', 'DESC'])) {
            $order = 'DESC';
        }
        
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
            $sql .= " AND (s.title LIKE ? OR s.description LIKE ?)";
            $params[] = "%{$filters['search']}%";
            $params[] = "%{$filters['search']}%";
        }

        // Apply other filters (similar to findMany)
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = ?";
            $params[] = $filters['language'];
        }

        if (!empty($filters['author_id'])) {
            $sql .= " AND s.author_id = ?";
            $params[] = $filters['author_id'];
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

        $sql = "UPDATE snippets SET star_count = star_count + 1 WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
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
        $analysisService = new \App\Services\AnalysisService($this->db);
        $language = CodeHelper::detectLanguage($code);
        $analysisResults = $analysisService->analyze($code, $language);
        
        // Add additional info for snapshot
        $analysisResults['functions'] = CodeHelper::extractFunctions($code, $language);
        $analysisResults['character_count'] = strlen($code);

        $version->setAnalysisResults($analysisResults);

        if (!$version->save()) {
            throw new \Exception('Failed to create snippet version');
        }

        // Persist analysis to history
        $versionId = $this->db->lastInsertId();
        if ($versionId) {
            $analysisService->storeAnalysis((int)$versionId, $analysisResults);
        }
    }

    private function analyzeCode(string $code): array
    {
        $language = CodeHelper::detectLanguage($code);
        $analysisService = new \App\Services\AnalysisService($this->db);
        return $analysisService->analyze($code, $language);
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

    public function softDelete(int $id): bool
    {
        $sql = "UPDATE snippets SET deleted_at = ? WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([date('Y-m-d H:i:s'), ':id' => $id]);
    }

    public function isStarredByUser(int $snippetId, int $userId): bool
    {
        $sql = "
            SELECT 1 FROM snippet_stars 
            WHERE snippet_id = :snippet_id AND user_id = :user_id
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':snippet_id' => $snippetId,
            ':user_id' => $userId
        ]);
        
        return $stmt->fetch() !== false;
    }

    public function starSnippet(int $snippetId, int $userId): bool
    {
        $sql = "
            INSERT IGNORE INTO snippet_stars (snippet_id, user_id, created_at)
            VALUES (:snippet_id, :user_id, CURRENT_TIMESTAMP)
        ";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':snippet_id' => $snippetId,
            ':user_id' => $userId
        ]);

        if ($result && $stmt->rowCount() > 0) {
            $this->incrementStarCount($snippetId);
        }

        return $result;
    }

    public function unstarSnippet(int $snippetId, int $userId): bool
    {
        $sql = "
            DELETE FROM snippet_stars 
            WHERE snippet_id = :snippet_id AND user_id = :user_id
        ";
        $stmt = $this->db->prepare($sql);
        $result = $stmt->execute([
            ':snippet_id' => $snippetId,
            ':user_id' => $userId
        ]);

        if ($result && $stmt->rowCount() > 0) {
            $this->decrementStarCount($snippetId);
        }

        return $result;
    }

    private function decrementStarCount(int $id): bool
    {
        $sql = "UPDATE snippets SET star_count = GREATEST(0, star_count - 1) WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function search(array $filters = [], int $limit = 20, int $offset = 0): array
    {
        return $this->findMany($filters, $limit, $offset);
    }

    public function findByAuthor(int $authorId, array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $filters['author_id'] = $authorId;
        return $this->findMany($filters, $limit, $offset);
    }

    public function findStarredByUser(int $userId, int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT s.* FROM snippets s
            JOIN snippet_stars ss ON s.id = ss.snippet_id
            WHERE ss.user_id = :user_id AND s.deleted_at IS NULL
            ORDER BY ss.created_at DESC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':user_id' => $userId,
            ':limit' => $limit,
            ':offset' => $offset
        ]);

        $snippets = [];
        while ($data = $stmt->fetch()) {
            $snippets[] = Snippet::fromData($this->db, $data);
        }

        return $snippets;
    }

    public function attachTag(int $snippetId, int $tagId): bool
    {
        $sql = "
            INSERT IGNORE INTO snippet_tags (snippet_id, tag_id, created_at)
            VALUES (:snippet_id, :tag_id, CURRENT_TIMESTAMP)
        ";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':snippet_id' => $snippetId,
            ':tag_id' => $tagId
        ]);
    }

    public function detachAllTags(int $snippetId): bool
    {
        $sql = "DELETE FROM snippet_tags WHERE snippet_id = :snippet_id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':snippet_id' => $snippetId]);
    }

    public function findAllWithFilters(array $filters, string $sort, int $limit, int $offset): array
    {
        // Map abstract sort options to column names
        switch ($sort) {
            case 'recent':
                $filters['order_by'] = 'created_at';
                $filters['order'] = 'DESC';
                break;
            case 'popular':
                $filters['order_by'] = 'star_count';
                $filters['order'] = 'DESC';
                break;
            case 'views':
                $filters['order_by'] = 'view_count';
                $filters['order'] = 'DESC';
                break;
            case 'updated':
                $filters['order_by'] = 'updated_at';
                $filters['order'] = 'DESC';
                break;
            case 'relevance':
            default:
                $filters['order_by'] = 'created_at';
                $filters['order'] = 'DESC';
                break;
        }
        
        return $this->findMany($filters, $limit, $offset);
    }

    public function countWithFilters(array $filters): int
    {
        return $this->count($filters);
    }


    public function findByLanguage(string $language, int $limit = 20): array
    {
        $filters = ['language' => $language];
        return $this->findMany($filters, $limit);
    }

    public function findByTags(array $tagSlugs, int $limit = 20): array
    {
        $filters = ['tags' => $tagSlugs];
        return $this->findMany($filters, $limit);
    }

    public function findByConcept(string $concept, array $filters, int $limit): array
    {
        $sql = "
            SELECT DISTINCT s.* 
            FROM snippets s
            LEFT JOIN snippet_versions sv ON s.id = sv.snippet_id
            WHERE s.deleted_at IS NULL
            AND (LOWER(s.title) LIKE LOWER(:concept) 
                 OR LOWER(s.description) LIKE LOWER(:concept)
                 OR LOWER(sv.code) LIKE LOWER(:concept))
        ";
        
        $params = [':concept' => "%{$concept}%"];
        
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }
        
        $sql .= " LIMIT :limit";
        $params[':limit'] = $limit;
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $results = [];
        while ($data = $stmt->fetch()) {
            $results[] = Snippet::fromData($this->db, $data);
        }
        
        return $results;
    }

    public function restore(int $id): bool
    {
        $sql = "UPDATE snippets SET deleted_at = NULL WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function forceDelete(int $id): bool
    {
        // Delete related tags first (or rely on CASCADE in DB)
        $this->detachAllTags($id);
        
        $sql = "DELETE FROM snippets WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([':id' => $id]);
    }

    public function transferOwnership(int $snippetId, int $newOwnerId): bool
    {
        $sql = "UPDATE snippets SET author_id = :new_owner_id WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':new_owner_id' => $newOwnerId, 
            ':id' => $snippetId
        ]);
    }

    // Existing findTrending method
    public function findTrending(string $timeframe, int $limit): array
    {
            $sql = "
                SELECT s.*, 
                       (s.view_count * 0.3 + s.star_count * 0.7) as trending_score,
                       sv.code as latest_code,
                       sv.analysis_results as latest_analysis
                FROM snippets s
                LEFT JOIN snippet_versions sv ON s.id = sv.snippet_id 
                WHERE s.deleted_at IS NULL
            ";
            
            $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
            if ($driver === 'sqlite') {
                $sql .= " AND s.created_at >= :cutoff";
                $params = [':cutoff' => date('Y-m-d H:i:s', strtotime("-{$timeframe}"))];
            } else {
                $sql .= " AND s.created_at >= DATE_SUB(NOW(), INTERVAL {$timeframe})";
                $params = [];
            }
            
            $sql .= " ORDER BY trending_score DESC, s.created_at DESC LIMIT :limit";
            $params[':limit'] = $limit;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
        
        $results = [];
        while ($data = $stmt->fetch()) {
            $snippet = Snippet::fromData($this->db, $data);
            $results[] = $snippet->toArray() + [
                'latest_version' => [
                    'code' => $data['latest_code'],
                    'analysis_results' => json_decode($data['latest_analysis'] ?? '{}', true)
                ],
                'trending_score' => $data['trending_score']
            ];
        }
        
        return $results;
    }

    public function rollback(int $snippetId, int $versionNumber, int $userId): bool
    {
        // Find the specific version
        $sql = "SELECT * FROM snippet_versions WHERE snippet_id = :id AND version_number = :version";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $snippetId, ':version' => $versionNumber]);
        $targetVersionData = $stmt->fetch();
        
        if (!$targetVersionData) {
            throw new NotFoundException('Version');
        }
        
        $targetVersion = SnippetVersion::fromData($this->db, $targetVersionData);
        
        $summary = "Rollback to version {$versionNumber}";
        $this->createVersion($snippetId, $targetVersion->getCode(), $userId, $summary);
        
        return true;
    }

    public function findRelated(int $snippetId, string $language, array $tagIds = [], int $limit = 5): array
    {
        $sql = "SELECT DISTINCT s.*, 
                (CASE WHEN s.language = :language THEN 2 ELSE 0 END + 
                 (SELECT COUNT(*) FROM snippet_tags st WHERE st.snippet_id = s.id AND st.tag_id IN (" . (empty($tagIds) ? '0' : implode(',', $tagIds)) . "))
                ) as relevance
                FROM snippets s
                LEFT JOIN snippet_tags st ON s.id = st.snippet_id
                WHERE s.deleted_at IS NULL
                AND s.visibility = 'public'
                AND s.id != :id
                AND (s.language = :language" . (!empty($tagIds) ? " OR st.tag_id IN (" . implode(',', $tagIds) . ")" : "") . ")
                ORDER BY relevance DESC, s.view_count DESC
                LIMIT :limit";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $snippetId, ':language' => $language, ':limit' => $limit]);
        
        $snippets = [];
        while ($data = $stmt->fetch()) {
             $snippets[] = Snippet::fromData($this->db, $data);
        }
        return $snippets;
    }

    public function fullTextSearch(string $query, array $filters, string $sort, int $limit, int $offset): array
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $params = [];
        
        if ($driver === 'mysql') {
            $scoreField = "MATCH(s.title, s.description) AGAINST(:query IN NATURAL LANGUAGE MODE)";
            $whereClause = "MATCH(s.title, s.description) AGAINST(:query IN NATURAL LANGUAGE MODE)";
            $params[':query'] = $query;
        } else {
            // SQLite Fallback (simple LIKE)
            $scoreField = "CASE WHEN s.title LIKE :query_like THEN 2 ELSE 0 END + CASE WHEN s.description LIKE :query_like THEN 1 ELSE 0 END";
            $whereClause = "(s.title LIKE :query_like OR s.description LIKE :query_like)";
            $params[':query_like'] = "%{$query}%";
        }

        $sql = "SELECT s.*, {$scoreField} as relevance_score, sv.code as latest_code, sv.analysis_results as latest_analysis
                FROM snippets s 
                LEFT JOIN snippet_versions sv ON s.id = sv.snippet_id AND sv.version_number = (
                    SELECT MAX(version_number) FROM snippet_versions WHERE snippet_id = s.id
                )
                WHERE s.deleted_at IS NULL 
                AND {$whereClause}";

        // Reuse filter building logic from findMany if possible, or repeat here
        // ... (Simplified for brevity, assuming main filters are visibility/lang)
        
        // Visibility
        if (isset($filters['visibility'])) {
             $sql .= " AND s.visibility = :visibility";
             $params[':visibility'] = $filters['visibility'] ?? 'public';
        } else {
             $sql .= " AND s.visibility = 'public'";
        }
        
        // Language
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }

        // Tags (Simplified check)
        if (!empty($filters['tags'])) {
             // ... skipping complex tag filter for this generic implementation or need to copy logic
        }

        $sql .= " ORDER BY relevance_score DESC LIMIT :limit OFFSET :offset";
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $snippets = [];
        while ($data = $stmt->fetch()) {
            $snippetArr = Snippet::fromData($this->db, $data)->toArray();
            $snippets[] = array_merge($snippetArr, [
                 'relevance_score' => $data['relevance_score'],
                 'code' => $data['latest_code'] ?? '',
                 'latest_version' => [
                     'code' => $data['latest_code'] ?? '',
                     'analysis_results' => json_decode($data['latest_analysis'] ?? '{}', true)
                 ]
            ]);
        }
        return $snippets;
    }

    public function fullTextSearchCount(string $query, array $filters): int
    {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $params = [];

        if ($driver === 'mysql') {
            $whereClause = "MATCH(s.title, s.description) AGAINST(:query IN NATURAL LANGUAGE MODE)";
            $params[':query'] = $query;
        } else {
            $whereClause = "(s.title LIKE :query_like OR s.description LIKE :query_like)";
            $params[':query_like'] = "%{$query}%";
        }

        $sql = "SELECT COUNT(*) FROM snippets s WHERE s.deleted_at IS NULL AND {$whereClause}";
        
        // Apply same filters
         if (isset($filters['visibility'])) {
             $sql .= " AND s.visibility = :visibility";
             $params[':visibility'] = $filters['visibility'] ?? 'public';
        } else {
             $sql .= " AND s.visibility = 'public'";
        }
        if (!empty($filters['language'])) {
            $sql .= " AND s.language = :language";
            $params[':language'] = $filters['language'];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }
}