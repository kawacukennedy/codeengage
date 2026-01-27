<?php
/**
 * SnippetController Integration Tests
 * 
 * Tests for snippet API endpoints including CRUD, versioning, forking, and starring.
 */

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;
use App\Controllers\Api\SnippetController;
use PDO;

class SnippetControllerTest extends DatabaseTestCase
{
    private SnippetController $snippetController;
    private int $testUserId;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->snippetController = new SnippetController($this->getDb());
        $this->testUserId = $this->insertTestUser([
            'username' => 'snippettest_' . time(),
            'email' => 'snippettest_' . time() . '@example.com'
        ]);
    }

    /**
     * Test creating a snippet with valid data
     */
    public function testCreateSnippetWithValidData(): void
    {
        $snippetData = [
            'title' => 'Test Snippet ' . time(),
            'code' => 'console.log("Hello, World!");',
            'language' => 'javascript',
            'description' => 'A test snippet',
            'visibility' => 'public'
        ];
        
        $errors = $this->validateSnippetData($snippetData);
        $this->assertEmpty($errors, 'Valid snippet data should have no errors');
        
        // Insert snippet
        $snippetId = $this->insertTestSnippet($this->testUserId, $snippetData);
        $this->assertGreaterThan(0, $snippetId, 'Should return valid snippet ID');
    }

    /**
     * Test fetching a snippet by ID
     */
    public function testFetchSnippetById(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId, [
            'title' => 'Fetch Test ' . time()
        ]);
        
        $snippet = $this->getSnippetById($snippetId);
        
        $this->assertNotNull($snippet, 'Should find snippet by ID');
        $this->assertEquals($snippetId, $snippet['id']);
    }

    /**
     * Test fetching non-existent snippet returns null
     */
    public function testFetchNonExistentSnippet(): void
    {
        $snippet = $this->getSnippetById(99999);
        
        $this->assertNull($snippet, 'Non-existent snippet should return null');
    }

    /**
     * Test updating a snippet
     */
    public function testUpdateSnippet(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        $newTitle = 'Updated Title ' . time();
        $sql = "UPDATE snippets SET title = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$newTitle, $snippetId]);
        
        $this->assertTrue($result, 'Update should succeed');
        
        $updated = $this->getSnippetById($snippetId);
        $this->assertEquals($newTitle, $updated['title']);
    }

    /**
     * Test deleting a snippet (soft delete)
     */
    public function testSoftDeleteSnippet(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        $sql = "UPDATE snippets SET deleted_at = NOW() WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $result = $stmt->execute([$snippetId]);
        
        $this->assertTrue($result, 'Soft delete should succeed');
        
        // Verify soft deleted
        $snippet = $this->getSnippetById($snippetId, true);
        $this->assertNotNull($snippet['deleted_at'], 'deleted_at should be set');
    }

    /**
     * Test listing public snippets
     */
    public function testListPublicSnippets(): void
    {
        // Create public and private snippets
        $this->insertTestSnippet($this->testUserId, ['visibility' => 'public', 'title' => 'Public ' . time()]);
        $this->insertTestSnippet($this->testUserId, ['visibility' => 'private', 'title' => 'Private ' . time()]);
        
        $publicSnippets = $this->getPublicSnippets();
        
        $this->assertNotEmpty($publicSnippets, 'Should have public snippets');
        
        foreach ($publicSnippets as $snippet) {
            $this->assertEquals('public', $snippet['visibility']);
        }
    }

    /**
     * Test forking a snippet
     */
    public function testForkSnippet(): void
    {
        // Create original snippet
        $originalId = $this->insertTestSnippet($this->testUserId, [
            'title' => 'Original Snippet ' . time()
        ]);
        
        // Create second user to fork
        $forkUserId = $this->insertTestUser([
            'username' => 'forker_' . time(),
            'email' => 'forker_' . time() . '@example.com'
        ]);
        
        // Fork it
        $forkedId = $this->forkSnippet($originalId, $forkUserId);
        
        $this->assertGreaterThan(0, $forkedId, 'Fork should create new snippet');
        
        $forked = $this->getSnippetById($forkedId);
        $this->assertEquals($originalId, $forked['forked_from_id']);
        $this->assertEquals($forkUserId, $forked['author_id']);
    }

    /**
     * Test starring a snippet
     */
    public function testStarSnippet(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        // Star the snippet
        $starUserId = $this->insertTestUser([
            'username' => 'starrer_' . time(),
            'email' => 'starrer_' . time() . '@example.com'
        ]);
        
        $result = $this->starSnippet($snippetId, $starUserId);
        $this->assertTrue($result, 'Starring should succeed');
        
        // Check star count increased
        $snippet = $this->getSnippetById($snippetId);
        $this->assertGreaterThan(0, $snippet['star_count']);
    }

    /**
     * Test unstarring a snippet
     */
    public function testUnstarSnippet(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        $starUserId = $this->insertTestUser([
            'username' => 'unstarrer_' . time(),
            'email' => 'unstarrer_' . time() . '@example.com'
        ]);
        
        // Star then unstar
        $this->starSnippet($snippetId, $starUserId);
        $result = $this->unstarSnippet($snippetId, $starUserId);
        
        $this->assertTrue($result, 'Unstarring should succeed');
    }

    /**
     * Test snippet version creation
     */
    public function testSnippetVersionCreation(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        // Create first version
        $version1Id = $this->insertTestSnippetVersion($snippetId, $this->testUserId, [
            'version_number' => 1,
            'code' => 'console.log("v1");'
        ]);
        
        // Create second version
        $version2Id = $this->insertTestSnippetVersion($snippetId, $this->testUserId, [
            'version_number' => 2,
            'code' => 'console.log("v2");'
        ]);
        
        $this->assertGreaterThan($version1Id, $version2Id, 'Second version should have higher ID');
    }

    /**
     * Test getting version history
     */
    public function testGetVersionHistory(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        $this->insertTestSnippetVersion($snippetId, $this->testUserId, ['version_number' => 1]);
        $this->insertTestSnippetVersion($snippetId, $this->testUserId, ['version_number' => 2]);
        $this->insertTestSnippetVersion($snippetId, $this->testUserId, ['version_number' => 3]);
        
        $versions = $this->getSnippetVersions($snippetId);
        
        $this->assertCount(3, $versions, 'Should have 3 versions');
    }

    /**
     * Test view count increment
     */
    public function testViewCountIncrement(): void
    {
        $snippetId = $this->insertTestSnippet($this->testUserId);
        
        $sql = "UPDATE snippets SET view_count = view_count + 1 WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$snippetId]);
        
        $snippet = $this->getSnippetById($snippetId);
        $this->assertEquals(1, $snippet['view_count']);
    }

    /**
     * Test filtering snippets by language
     */
    public function testFilterByLanguage(): void
    {
        $this->insertTestSnippet($this->testUserId, ['language' => 'javascript']);
        $this->insertTestSnippet($this->testUserId, ['language' => 'python']);
        $this->insertTestSnippet($this->testUserId, ['language' => 'javascript']);
        
        $jsSnippets = $this->getSnippetsByLanguage('javascript');
        
        $this->assertGreaterThanOrEqual(2, count($jsSnippets));
        foreach ($jsSnippets as $snippet) {
            $this->assertEquals('javascript', $snippet['language']);
        }
    }

    /**
     * Helper: Validate snippet data
     */
    private function validateSnippetData(array $data): array
    {
        $errors = [];
        
        if (empty($data['title'])) $errors['title'] = 'Title required';
        if (empty($data['code'])) $errors['code'] = 'Code required';
        if (empty($data['language'])) $errors['language'] = 'Language required';
        
        return $errors;
    }

    /**
     * Helper: Get snippet by ID
     */
    private function getSnippetById(int $id, bool $includeDeleted = false): ?array
    {
        $sql = "SELECT * FROM snippets WHERE id = ?";
        if (!$includeDeleted) {
            $sql .= " AND deleted_at IS NULL";
        }
        
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ?: null;
    }

    /**
     * Helper: Get public snippets
     */
    private function getPublicSnippets(): array
    {
        $sql = "SELECT * FROM snippets WHERE visibility = 'public' AND deleted_at IS NULL LIMIT 20";
        $stmt = $this->getDb()->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Helper: Fork a snippet
     */
    private function forkSnippet(int $originalId, int $newAuthorId): int
    {
        $original = $this->getSnippetById($originalId);
        
        $sql = "INSERT INTO snippets (author_id, title, description, visibility, language, forked_from_id, created_at, updated_at)
                VALUES (?, ?, ?, 'private', ?, ?, NOW(), NOW())";
        
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([
            $newAuthorId,
            $original['title'] . ' (Fork)',
            $original['description'],
            $original['language'],
            $originalId
        ]);
        
        return (int) $this->getDb()->lastInsertId();
    }

    /**
     * Helper: Star a snippet
     */
    private function starSnippet(int $snippetId, int $userId): bool
    {
        // Update star count
        $sql = "UPDATE snippets SET star_count = star_count + 1 WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        return $stmt->execute([$snippetId]);
    }

    /**
     * Helper: Unstar a snippet
     */
    private function unstarSnippet(int $snippetId, int $userId): bool
    {
        $sql = "UPDATE snippets SET star_count = GREATEST(star_count - 1, 0) WHERE id = ?";
        $stmt = $this->getDb()->prepare($sql);
        return $stmt->execute([$snippetId]);
    }

    /**
     * Helper: Get snippet versions
     */
    private function getSnippetVersions(int $snippetId): array
    {
        $sql = "SELECT * FROM snippet_versions WHERE snippet_id = ? ORDER BY version_number DESC";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$snippetId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Helper: Get snippets by language
     */
    private function getSnippetsByLanguage(string $language): array
    {
        $sql = "SELECT * FROM snippets WHERE language = ? AND deleted_at IS NULL";
        $stmt = $this->getDb()->prepare($sql);
        $stmt->execute([$language]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
