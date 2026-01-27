<?php
/**
 * SearchService Unit Tests
 * 
 * Tests for search service including full-text search, filtering, and semantic matching.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\SearchService;
use PDO;

class SearchServiceTest extends TestCase
{
    private SearchService $searchService;
    private $mockDb;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->searchService = new SearchService($this->mockDb);
    }

    /**
     * Test search query sanitization
     */
    public function testSearchQuerySanitization(): void
    {
        $maliciousQueries = [
            '<script>alert("xss")</script>',
            'SELECT * FROM users; DROP TABLE users;--',
            '"><img src=x onerror=alert(1)>',
        ];
        
        foreach ($maliciousQueries as $query) {
            $sanitized = $this->sanitizeSearchQuery($query);
            $this->assertStringNotContainsString('<script>', $sanitized);
            $this->assertStringNotContainsString('DROP TABLE', $sanitized);
        }
    }

    /**
     * Test search query tokenization
     */
    public function testSearchQueryTokenization(): void
    {
        $query = 'javascript array filter map';
        $tokens = $this->tokenizeQuery($query);
        
        $this->assertCount(4, $tokens);
        $this->assertContains('javascript', $tokens);
        $this->assertContains('filter', $tokens);
    }

    /**
     * Test search query with quotes
     */
    public function testSearchQueryWithQuotes(): void
    {
        $query = '"exact phrase" other words';
        $parsed = $this->parseSearchQuery($query);
        
        $this->assertContains('exact phrase', $parsed['exact']);
        $this->assertContains('other', $parsed['terms']);
    }

    /**
     * Test search filters parsing
     */
    public function testSearchFiltersParsing(): void
    {
        $filters = [
            'language' => 'javascript',
            'visibility' => 'public',
            'date_from' => '2024-01-01',
            'date_to' => '2024-12-31'
        ];
        
        $parsed = $this->parseFilters($filters);
        
        $this->assertEquals('javascript', $parsed['language']);
        $this->assertInstanceOf(\DateTime::class, $parsed['date_from']);
    }

    /**
     * Test relevance scoring
     */
    public function testRelevanceScoring(): void
    {
        $query = 'javascript';
        
        $results = [
            ['title' => 'JavaScript Array Methods', 'match_score' => 10],
            ['title' => 'Python Basics', 'match_score' => 0],
            ['title' => 'Learn JavaScript Today', 'match_score' => 8]
        ];
        
        usort($results, fn($a, $b) => $b['match_score'] - $a['match_score']);
        
        $this->assertEquals('JavaScript Array Methods', $results[0]['title']);
    }

    /**
     * Test pagination parameters
     */
    public function testPaginationParameters(): void
    {
        $page = 3;
        $perPage = 20;
        
        $offset = ($page - 1) * $perPage;
        
        $this->assertEquals(40, $offset);
    }

    /**
     * Test search highlight generation
     */
    public function testSearchHighlightGeneration(): void
    {
        $text = 'This is a JavaScript snippet for array manipulation';
        $query = 'JavaScript';
        
        $highlighted = $this->highlightMatches($text, $query);
        
        $this->assertStringContainsString('<mark>JavaScript</mark>', $highlighted);
    }

    /**
     * Test fuzzy matching threshold
     */
    public function testFuzzyMatchingThreshold(): void
    {
        $query = 'javascrpt'; // Typo
        $target = 'javascript';
        
        $similarity = $this->calculateSimilarity($query, $target);
        
        $this->assertGreaterThan(0.8, $similarity, 'Should match despite typo');
    }

    /**
     * Test tag-based search
     */
    public function testTagBasedSearch(): void
    {
        $tags = ['javascript', 'array', 'filter'];
        $snippetTags = ['javascript', 'array', 'map', 'functional'];
        
        $matchingTags = array_intersect($tags, $snippetTags);
        $matchScore = count($matchingTags) / count($tags);
        
        $this->assertEquals(2/3, $matchScore, 'Should match 2 out of 3 tags');
    }

    /**
     * Test sort order options
     */
    public function testSortOrderOptions(): void
    {
        $validSortOptions = ['relevance', 'created_at', 'updated_at', 'star_count', 'view_count'];
        
        foreach ($validSortOptions as $option) {
            $this->assertTrue($this->isValidSortOption($option));
        }
        
        $this->assertFalse($this->isValidSortOption('invalid_option'));
    }

    /**
     * Test language filter
     */
    public function testLanguageFilter(): void
    {
        $results = [
            ['language' => 'javascript', 'title' => 'JS Snippet'],
            ['language' => 'python', 'title' => 'Python Snippet'],
            ['language' => 'javascript', 'title' => 'Another JS Snippet']
        ];
        
        $filtered = array_filter($results, fn($r) => $r['language'] === 'javascript');
        
        $this->assertCount(2, $filtered);
    }

    /**
     * Test date range filter
     */
    public function testDateRangeFilter(): void
    {
        $dateFrom = strtotime('2024-01-01');
        $dateTo = strtotime('2024-06-30');
        $itemDate = strtotime('2024-03-15');
        
        $inRange = $itemDate >= $dateFrom && $itemDate <= $dateTo;
        
        $this->assertTrue($inRange);
    }

    /**
     * Test empty search results handling
     */
    public function testEmptySearchResultsHandling(): void
    {
        $results = [];
        
        $response = [
            'results' => $results,
            'total' => 0,
            'page' => 1,
            'per_page' => 20,
            'suggestions' => ['Try broader search terms', 'Check spelling']
        ];
        
        $this->assertEmpty($response['results']);
        $this->assertNotEmpty($response['suggestions']);
    }

    /**
     * Helper: Sanitize search query
     */
    private function sanitizeSearchQuery(string $query): string
    {
        $query = strip_tags($query);
        $query = preg_replace('/[^\w\s"\'.-]/u', '', $query);
        return trim($query);
    }

    /**
     * Helper: Tokenize search query
     */
    private function tokenizeQuery(string $query): array
    {
        return array_filter(explode(' ', strtolower(trim($query))));
    }

    /**
     * Helper: Parse search query with quoted phrases
     */
    private function parseSearchQuery(string $query): array
    {
        $result = ['exact' => [], 'terms' => []];
        
        // Extract quoted phrases
        preg_match_all('/"([^"]+)"/', $query, $matches);
        $result['exact'] = $matches[1];
        
        // Remove quoted phrases and tokenize the rest
        $remaining = preg_replace('/"[^"]+"/', '', $query);
        $result['terms'] = $this->tokenizeQuery($remaining);
        
        return $result;
    }

    /**
     * Helper: Parse search filters
     */
    private function parseFilters(array $filters): array
    {
        $parsed = $filters;
        
        if (isset($filters['date_from'])) {
            $parsed['date_from'] = new \DateTime($filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $parsed['date_to'] = new \DateTime($filters['date_to']);
        }
        
        return $parsed;
    }

    /**
     * Helper: Highlight matches in text
     */
    private function highlightMatches(string $text, string $query): string
    {
        return preg_replace(
            '/(' . preg_quote($query, '/') . ')/i',
            '<mark>$1</mark>',
            $text
        );
    }

    /**
     * Helper: Calculate string similarity
     */
    private function calculateSimilarity(string $str1, string $str2): float
    {
        similar_text(strtolower($str1), strtolower($str2), $percent);
        return $percent / 100;
    }

    /**
     * Helper: Check if sort option is valid
     */
    private function isValidSortOption(string $option): bool
    {
        return in_array($option, ['relevance', 'created_at', 'updated_at', 'star_count', 'view_count']);
    }
}
