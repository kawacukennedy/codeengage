<?php

namespace App\Middleware;

use App\Helpers\ApiResponse;
use App\Services\CacheService;

class CacheMiddleware
{
    private CacheService $cacheService;
    private array $options;

    public function __construct(\PDO $db, array $options = [])
    {
        $this->cacheService = new CacheService($db);
        $this->options = array_merge([
            'ttl' => 300, // 5 minutes default
            'vary_headers' => ['Authorization'],
            'cacheable_methods' => ['GET'],
            'cacheable_status_codes' => [200],
            'skip_cache_query' => 'no_cache'
        ], $options);
    }

    public function handle(string $method, string $uri, callable $next): void
    {
        // Skip caching for non-cacheable methods
        if (!in_array($method, $this->options['cacheable_methods'])) {
            $next();
            $this->storeResponse($method, $uri);
            return;
        }

        // Skip caching if no_cache query parameter is present
        if (isset($_GET[$this->options['skip_cache_query']])) {
            $next();
            $this->storeResponse($method, $uri);
            return;
        }

        // Generate cache key
        $cacheKey = $this->generateCacheKey($method, $uri);

        // Try to get cached response
        $cachedResponse = $this->cacheService->get($cacheKey);
        if ($cachedResponse) {
            $this->sendCachedResponse($cachedResponse);
            return;
        }

        // Capture response
        ob_start();
        $next();
        $responseContent = ob_get_contents();
        ob_end_clean();

        // Parse response to extract status code and headers
        $responseInfo = $this->parseResponse($responseContent);

        // Cache successful responses
        if (in_array($responseInfo['status_code'], $this->options['cacheable_status_codes'])) {
            $this->cacheService->set($cacheKey, [
                'content' => $responseContent,
                'status_code' => $responseInfo['status_code'],
                'headers' => $responseInfo['headers'],
                'cached_at' => time()
            ], $this->options['ttl']);
        }

        // Send the response
        $this->sendResponse($responseContent);
    }

    private function generateCacheKey(string $method, string $uri): string
    {
        $keyData = [
            'method' => $method,
            'uri' => $uri,
            'query' => $_GET,
            'vary' => []
        ];

        // Add vary headers to cache key
        foreach ($this->options['vary_headers'] as $header) {
            $keyData['vary'][$header] = $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $header))] ?? '';
        }

        return 'response:' . md5(serialize($keyData));
    }

    private function parseResponse(string $content): array
    {
        $lines = explode("\n", $content);
        $headers = [];
        $statusCode = 200;
        $bodyStart = 0;

        for ($i = 0; $i < count($lines); $i++) {
            $line = trim($lines[$i]);
            
            if ($i === 0 && preg_match('/HTTP\/\d\.\d (\d{3})/', $line, $matches)) {
                $statusCode = (int)$matches[1];
                continue;
            }
            
            if (empty($line)) {
                $bodyStart = $i + 1;
                break;
            }
            
            if (strpos($line, ':') !== false) {
                list($name, $value) = explode(':', $line, 2);
                $headers[trim($name)] = trim($value);
            }
        }

        return [
            'status_code' => $statusCode,
            'headers' => $headers,
            'body' => implode("\n", array_slice($lines, $bodyStart))
        ];
    }

    private function sendCachedResponse(array $cachedResponse): void
    {
        // Send cached headers
        if (isset($cachedResponse['headers'])) {
            foreach ($cachedResponse['headers'] as $name => $value) {
                header("{$name}: {$value}");
            }
        }

        // Add cache headers
        $age = time() - $cachedResponse['cached_at'];
        $remaining = max(0, $this->options['ttl'] - $age);
        
        header("X-Cache: HIT");
        header("X-Cache-Age: {$age}");
        header("Cache-Control: public, max-age={$remaining}");

        // Send cached content
        echo $cachedResponse['content'];
    }

    private function sendResponse(string $content): void
    {
        header("X-Cache: MISS");
        echo $content;
    }

    private function storeResponse(string $method, string $uri): void
    {
        // This method would be called after the response is sent
        // For now, response caching is handled in the main handle method
    }

    public function clearCache(string $pattern = null): bool
    {
        if ($pattern) {
            return $this->cacheService->clearPattern($pattern);
        }
        
        return $this->cacheService->clearByPattern('response:');
    }

    public function warmCache(array $urls): array
    {
        $results = [];
        
        foreach ($urls as $url) {
            $cacheKey = 'response:' . md5(serialize([
                'method' => 'GET',
                'uri' => $url,
                'query' => [],
                'vary' => []
            ]));
            
            // Make internal request to warm cache
            $this->makeInternalRequest($url);
            
            $results[$url] = $this->cacheService->get($cacheKey) ? 'warmed' : 'failed';
        }
        
        return $results;
    }

    private function makeInternalRequest(string $url): void
    {
        // Simulate internal request to warm cache
        // This would make an HTTP request to the same application
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_NOBODY => false,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        
        curl_exec($ch);
        curl_close($ch);
    }

    public function getCacheStats(): array
    {
        return $this->cacheService->getStats();
    }

    public function setCacheOptions(array $options): void
    {
        $this->options = array_merge($this->options, $options);
    }

    public function isCacheable(string $method, string $uri): bool
    {
        if (!in_array($method, $this->options['cacheable_methods'])) {
            return false;
        }

        if (isset($_GET[$this->options['skip_cache_query']])) {
            return false;
        }

        // Add additional logic here for cacheability based on URI patterns
        $uncacheablePatterns = [
            '/api/auth/',
            '/api/collaboration/',
            '/api/admin/cache'
        ];

        foreach ($uncacheablePatterns as $pattern) {
            if (strpos($uri, $pattern) === 0) {
                return false;
            }
        }

        return true;
    }
}