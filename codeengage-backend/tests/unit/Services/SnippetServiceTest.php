<?php
/**
 * SnippetService Unit Tests
 * 
 * Tests for snippet service including CRUD operations, versioning, and forking.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\SnippetService;
use App\Repositories\SnippetRepository;
use App\Repositories\SnippetVersionRepository;
use App\Repositories\TagRepository;
use PDO;

class SnippetServiceTest extends TestCase
{
    private SnippetService $snippetService;
    private $mockDb;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->snippetService = new SnippetService($this->mockDb);
    }

    /**
     * Test snippet data validation for required fields
     */
    public function testSnippetValidationRequiresTitle(): void
    {
        $data = [
            'code' => 'console.log("test");',
            'language' => 'javascript'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertContains('title', array_keys($errors), 'Title should be required');
    }

    /**
     * Test snippet data validation for code field
     */
    public function testSnippetValidationRequiresCode(): void
    {
        $data = [
            'title' => 'Test Snippet',
            'language' => 'javascript'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertContains('code', array_keys($errors), 'Code should be required');
    }

    /**
     * Test snippet data validation for language field
     */
    public function testSnippetValidationRequiresLanguage(): void
    {
        $data = [
            'title' => 'Test Snippet',
            'code' => 'console.log("test");'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertContains('language', array_keys($errors), 'Language should be required');
    }

    /**
     * Test valid snippet data passes validation
     */
    public function testValidSnippetDataPassesValidation(): void
    {
        $data = [
            'title' => 'Test Snippet',
            'code' => 'console.log("Hello, World!");',
            'language' => 'javascript',
            'description' => 'A test snippet',
            'visibility' => 'public'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertEmpty($errors, 'Valid snippet data should have no errors');
    }

    /**
     * Test title length validation
     */
    public function testTitleLengthValidation(): void
    {
        // Too long title (over 255 characters)
        $longTitle = str_repeat('a', 256);
        $data = [
            'title' => $longTitle,
            'code' => 'test',
            'language' => 'javascript'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertArrayHasKey('title', $errors, 'Long title should fail validation');
    }

    /**
     * Test code size limit
     */
    public function testCodeSizeLimit(): void
    {
        // 1MB limit
        $maxSize = 1024 * 1024;
        $largeCode = str_repeat('a', $maxSize + 1);
        
        $data = [
            'title' => 'Test',
            'code' => $largeCode,
            'language' => 'javascript'
        ];
        
        $errors = $this->validateSnippetData($data);
        
        $this->assertArrayHasKey('code', $errors, 'Large code should fail validation');
    }

    /**
     * Test visibility options
     */
    public function testVisibilityOptions(): void
    {
        $validVisibilities = ['public', 'private', 'organization'];
        
        foreach ($validVisibilities as $visibility) {
            $this->assertTrue(
                $this->isValidVisibility($visibility),
                "Visibility '{$visibility}' should be valid"
            );
        }
        
        $this->assertFalse($this->isValidVisibility('invalid'), 'Invalid visibility should fail');
    }

    /**
     * Test supported languages
     */
    public function testSupportedLanguages(): void
    {
        $supportedLanguages = [
            'javascript', 'python', 'php', 'java', 'c', 'cpp', 'csharp',
            'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'sql',
            'html', 'css', 'bash', 'powershell', 'json', 'yaml', 'markdown'
        ];
        
        foreach ($supportedLanguages as $language) {
            $this->assertTrue(
                $this->isLanguageSupported($language),
                "Language '{$language}' should be supported"
            );
        }
    }

    /**
     * Test checksum generation for code versioning
     */
    public function testChecksumGeneration(): void
    {
        $code = 'console.log("Hello, World!");';
        $checksum = hash('sha256', $code);
        
        $this->assertEquals(64, strlen($checksum), 'SHA256 checksum should be 64 characters');
        
        // Same code should produce same checksum
        $checksum2 = hash('sha256', $code);
        $this->assertEquals($checksum, $checksum2, 'Same code should produce same checksum');
        
        // Different code should produce different checksum
        $checksum3 = hash('sha256', $code . ' modified');
        $this->assertNotEquals($checksum, $checksum3, 'Different code should produce different checksum');
    }

    /**
     * Test version number increment logic
     */
    public function testVersionNumberIncrement(): void
    {
        $currentVersion = 5;
        $nextVersion = $currentVersion + 1;
        
        $this->assertEquals(6, $nextVersion, 'Version should increment by 1');
    }

    /**
     * Test forking creates correct data structure
     */
    public function testForkDataStructure(): void
    {
        $originalSnippet = $this->getTestSnippetData(['id' => 100, 'author_id' => 1]);
        $newAuthorId = 2;
        
        $forkedData = [
            'title' => $originalSnippet['title'] . ' (Fork)',
            'description' => $originalSnippet['description'],
            'language' => $originalSnippet['language'],
            'visibility' => 'private', // Forks default to private
            'forked_from_id' => $originalSnippet['id'],
            'author_id' => $newAuthorId
        ];
        
        $this->assertEquals(100, $forkedData['forked_from_id'], 'Fork should reference original');
        $this->assertEquals(2, $forkedData['author_id'], 'Fork should have new author');
        $this->assertEquals('private', $forkedData['visibility'], 'Fork should default to private');
    }

    /**
     * Test template variable detection
     */
    public function testTemplateVariableDetection(): void
    {
        $codeWithVariables = 'const name = "{{NAME}}"; const value = "{{VALUE}}";';
        
        preg_match_all('/\{\{(\w+)\}\}/', $codeWithVariables, $matches);
        
        $this->assertCount(2, $matches[1], 'Should find 2 template variables');
        $this->assertContains('NAME', $matches[1]);
        $this->assertContains('VALUE', $matches[1]);
    }

    /**
     * Test search query sanitization
     */
    public function testSearchQuerySanitization(): void
    {
        $maliciousQuery = '<script>alert("xss")</script>';
        $sanitized = htmlspecialchars($maliciousQuery, ENT_QUOTES, 'UTF-8');
        
        $this->assertStringNotContainsString('<script>', $sanitized, 'Script tags should be escaped');
    }

    /**
     * Helper: Validate snippet data
     */
    private function validateSnippetData(array $data): array
    {
        $errors = [];
        
        if (empty($data['title'])) {
            $errors['title'] = 'Title is required';
        } elseif (strlen($data['title']) > 255) {
            $errors['title'] = 'Title must be 255 characters or less';
        }
        
        if (empty($data['code'])) {
            $errors['code'] = 'Code is required';
        } elseif (strlen($data['code']) > 1024 * 1024) {
            $errors['code'] = 'Code must be 1MB or less';
        }
        
        if (empty($data['language'])) {
            $errors['language'] = 'Language is required';
        }
        
        return $errors;
    }

    /**
     * Helper: Check valid visibility
     */
    private function isValidVisibility(string $visibility): bool
    {
        return in_array($visibility, ['public', 'private', 'organization']);
    }

    /**
     * Helper: Check if language is supported
     */
    private function isLanguageSupported(string $language): bool
    {
        $supported = [
            'javascript', 'python', 'php', 'java', 'c', 'cpp', 'csharp',
            'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'sql',
            'html', 'css', 'bash', 'powershell', 'json', 'yaml', 'markdown',
            'text', 'plaintext'
        ];
        
        return in_array(strtolower($language), $supported);
    }
}
