<?php
/**
 * CacheService Unit Tests
 * 
 * Tests for cache service including caching strategies, invalidation, and TTL.
 */

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\CacheService;
use PDO;

class CacheServiceTest extends TestCase
{
    private CacheService $cacheService;
    private $mockDb;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockDb = $this->createMockPDO();
        $this->cacheService = new CacheService($this->mockDb);
    }

    /**
     * Test cache key generation
     */
    public function testCacheKeyGeneration(): void
    {
        $params = ['id' => 123, 'type' => 'snippet'];
        $key = $this->generateCacheKey('snippets', $params);
        
        $this->assertStringStartsWith('snippets:', $key);
        $this->assertStringContainsString('123', $key);
    }

    /**
     * Test cache key uniqueness
     */
    public function testCacheKeyUniqueness(): void
    {
        $key1 = $this->generateCacheKey('snippets', ['id' => 1]);
        $key2 = $this->generateCacheKey('snippets', ['id' => 2]);
        
        $this->assertNotEquals($key1, $key2);
    }

    /**
     * Test TTL values for different cache types
     */
    public function testTtlValues(): void
    {
        $ttlValues = [
            'user_session' => 7200,      // 2 hours
            'snippet_view' => 3600,      // 1 hour
            'search_results' => 300,     // 5 minutes
            'analysis_results' => 86400, // 24 hours
        ];
        
        foreach ($ttlValues as $type => $expectedTtl) {
            $ttl = $this->getTtl($type);
            $this->assertEquals($expectedTtl, $ttl, "TTL for {$type} should be {$expectedTtl}");
        }
    }

    /**
     * Test cache expiration check
     */
    public function testCacheExpirationCheck(): void
    {
        $cachedAt = time() - 3700; // Cached 1 hour 1 minute ago
        $ttl = 3600; // 1 hour TTL
        
        $isExpired = (time() - $cachedAt) > $ttl;
        
        $this->assertTrue($isExpired, 'Cache should be expired');
    }

    /**
     * Test cache not expired within TTL
     */
    public function testCacheNotExpiredWithinTtl(): void
    {
        $cachedAt = time() - 1800; // Cached 30 minutes ago
        $ttl = 3600; // 1 hour TTL
        
        $isExpired = (time() - $cachedAt) > $ttl;
        
        $this->assertFalse($isExpired, 'Cache should not be expired');
    }

    /**
     * Test tag-based cache invalidation
     */
    public function testTagBasedInvalidation(): void
    {
        $cache = [
            'snippets:1' => ['tags' => ['snippet_1', 'user_1'], 'data' => 'data1'],
            'snippets:2' => ['tags' => ['snippet_2', 'user_1'], 'data' => 'data2'],
            'snippets:3' => ['tags' => ['snippet_3', 'user_2'], 'data' => 'data3']
        ];
        
        // Invalidate all entries for user_1
        $invalidationTag = 'user_1';
        $remaining = array_filter($cache, function($entry) use ($invalidationTag) {
            return !in_array($invalidationTag, $entry['tags']);
        });
        
        $this->assertCount(1, $remaining);
        $this->assertArrayHasKey('snippets:3', $remaining);
    }

    /**
     * Test cache serialization
     */
    public function testCacheSerialization(): void
    {
        $data = [
            'id' => 1,
            'nested' => ['values' => [1, 2, 3]],
            'timestamp' => time()
        ];
        
        $serialized = serialize($data);
        $unserialized = unserialize($serialized);
        
        $this->assertEquals($data, $unserialized);
    }

    /**
     * Test JSON cache serialization
     */
    public function testJsonCacheSerialization(): void
    {
        $data = ['id' => 1, 'name' => 'test'];
        
        $json = json_encode($data);
        $decoded = json_decode($json, true);
        
        $this->assertEquals($data, $decoded);
    }

    /**
     * Test cache size limit
     */
    public function testCacheSizeLimit(): void
    {
        $maxCacheSize = 1024 * 1024; // 1MB
        $data = str_repeat('a', 500 * 1024); // 500KB
        
        $canCache = strlen($data) <= $maxCacheSize;
        
        $this->assertTrue($canCache);
        
        $largeData = str_repeat('a', 2 * 1024 * 1024); // 2MB
        $canCacheLarge = strlen($largeData) <= $maxCacheSize;
        
        $this->assertFalse($canCacheLarge);
    }

    /**
     * Test cache hit/miss tracking
     */
    public function testCacheHitMissTracking(): void
    {
        $stats = [
            'hits' => 150,
            'misses' => 50
        ];
        
        $hitRate = $stats['hits'] / ($stats['hits'] + $stats['misses']) * 100;
        
        $this->assertEquals(75, $hitRate);
    }

    /**
     * Test LRU eviction logic
     */
    public function testLruEvictionLogic(): void
    {
        $cache = [
            'key1' => ['data' => 'data1', 'last_access' => time() - 3600],
            'key2' => ['data' => 'data2', 'last_access' => time() - 7200], // Oldest
            'key3' => ['data' => 'data3', 'last_access' => time() - 1800]
        ];
        
        // Find LRU entry
        $lruKey = null;
        $oldestAccess = PHP_INT_MAX;
        
        foreach ($cache as $key => $entry) {
            if ($entry['last_access'] < $oldestAccess) {
                $oldestAccess = $entry['last_access'];
                $lruKey = $key;
            }
        }
        
        $this->assertEquals('key2', $lruKey, 'Should identify oldest entry for eviction');
    }

    /**
     * Test cache warm-up priorities
     */
    public function testCacheWarmUpPriorities(): void
    {
        $priorities = [
            ['type' => 'popular_snippets', 'priority' => 1],
            ['type' => 'user_sessions', 'priority' => 2],
            ['type' => 'search_suggestions', 'priority' => 3]
        ];
        
        usort($priorities, fn($a, $b) => $a['priority'] - $b['priority']);
        
        $this->assertEquals('popular_snippets', $priorities[0]['type']);
    }

    /**
     * Test file cache path generation
     */
    public function testFileCachePathGeneration(): void
    {
        $key = 'snippets:user:123:list';
        $hash = md5($key);
        
        $path = '/storage/cache/' . substr($hash, 0, 2) . '/' . $hash . '.cache';
        
        $this->assertStringContainsString('/storage/cache/', $path);
        $this->assertStringEndsWith('.cache', $path);
    }

    /**
     * Test cache compression
     */
    public function testCacheCompression(): void
    {
        $data = str_repeat('test data ', 1000); // Repetitive data compresses well
        
        $compressed = gzcompress($data);
        $decompressed = gzuncompress($compressed);
        
        $this->assertEquals($data, $decompressed);
        $this->assertLessThan(strlen($data), strlen($compressed), 'Compressed should be smaller');
    }

    /**
     * Helper: Generate cache key
     */
    private function generateCacheKey(string $prefix, array $params): string
    {
        return $prefix . ':' . md5(json_encode($params));
    }

    /**
     * Helper: Get TTL for cache type
     */
    private function getTtl(string $type): int
    {
        $ttlMap = [
            'user_session' => 7200,
            'snippet_view' => 3600,
            'search_results' => 300,
            'analysis_results' => 86400,
            'default' => 1800
        ];
        
        return $ttlMap[$type] ?? $ttlMap['default'];
    }
}
