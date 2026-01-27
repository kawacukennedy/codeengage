<?php

namespace App\Middleware;

use App\Helpers\SecurityHelper;
use App\Helpers\ApiResponse;

class RateLimitMiddleware
{
    private array $config;
    private string $keyPrefix;

    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'requests_per_minute' => 60,
            'requests_per_hour' => 1000,
            'requests_per_day' => 10000,
            'burst_limit' => 10,
            'whitelist' => [],
            'blacklist' => []
        ], $config);

        $this->keyPrefix = 'rate_limit:';
    }

    public function handle(string $key = null): void
    {
        $ip = SecurityHelper::getIpAddress();
        $key = $key ?: $ip;

        // Check blacklist
        if (in_array($ip, $this->config['blacklist'])) {
            ApiResponse::error('IP address blocked', 403);
        }

        // Check whitelist
        if (in_array($ip, $this->config['whitelist'])) {
            return;
        }

        // Check various rate limits
        $this->checkRateLimit($key, 'minute', $this->config['requests_per_minute'], 60);
        $this->checkRateLimit($key, 'hour', $this->config['requests_per_hour'], 3600);
        $this->checkRateLimit($key, 'day', $this->config['requests_per_day'], 86400);
        
        // Check burst limit
        $this->checkBurstLimit($key);
    }

    private function checkRateLimit(string $key, string $period, int $limit, int $window): void
    {
        $cacheKey = $this->keyPrefix . "{$key}:{$period}";
        
        if (!SecurityHelper::rateLimitCheck($cacheKey, $limit, $window)) {
            $this->handleRateLimitExceeded($period, $limit, $window);
        }
    }

    private function checkBurstLimit(string $key): void
    {
        $cacheKey = $this->keyPrefix . "{$key}:burst";
        
        if (!SecurityHelper::rateLimitCheck($cacheKey, $this->config['burst_limit'], 10)) {
            ApiResponse::error('Too many requests in short time. Please wait a moment.', 429);
        }
    }

    private function handleRateLimitExceeded(string $period, int $limit, int $window): void
    {
        $headers = [
            'X-RateLimit-Limit' => $limit,
            'X-RateLimit-Window' => $window,
            'X-RateLimit-Period' => $period,
            'Retry-After' => $window
        ];

        foreach ($headers as $name => $value) {
            header("{$name}: {$value}");
        }

        ApiResponse::error("Rate limit exceeded. Maximum {$limit} requests per {$period}.", 429);
    }

    public function getRemainingRequests(string $key = null, string $period = 'minute'): array
    {
        $key = $key ?: SecurityHelper::getIpAddress();
        $cacheKey = $this->keyPrefix . "{$key}:{$period}";

        // This would need to be implemented based on your cache storage
        // For now, return estimated values
        return [
            'limit' => $this->config["requests_per_{$period}"],
            'remaining' => max(0, $this->config["requests_per_{$period}"] - $this->getCurrentUsage($cacheKey)),
            'reset_time' => time() + $this->getWindowSeconds($period)
        ];
    }

    private function getCurrentUsage(string $cacheKey): int
    {
        // Implementation depends on cache storage
        // This is a placeholder
        return 0;
    }

    private function getWindowSeconds(string $period): int
    {
        $windows = [
            'minute' => 60,
            'hour' => 3600,
            'day' => 86400
        ];

        return $windows[$period] ?? 60;
    }
}