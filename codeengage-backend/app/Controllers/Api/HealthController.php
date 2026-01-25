<?php

namespace App\Controllers\Api;

use PDO;
use App\Helpers\ApiResponse;
use App\Helpers\SecurityHelper;

class HealthController
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function index(string $method, array $params): void
    {
        if ($method !== 'GET') {
            ApiResponse::error('Method not allowed', 405);
        }

        try {
            $health = [
                'status' => 'healthy',
                'timestamp' => date('Y-m-d H:i:s'),
                'version' => $this->getAppVersion(),
                'checks' => [
                    'database' => $this->checkDatabase(),
                    'cache' => $this->checkCache(),
                    'storage' => $this->checkStorage(),
                    'memory' => $this->checkMemory(),
                    'disk' => $this->checkDisk(),
                    'api' => $this->checkApiEndpoints(),
                    'services' => $this->checkExternalServices()
                ]
            ];

            $allHealthy = true;
            foreach ($health['checks'] as $check) {
                if ($check['status'] !== 'healthy') {
                    $allHealthy = false;
                    $health['status'] = 'unhealthy';
                    break;
                }
            }

            header_remove('X-Powered-By');
            header('Content-Type: application/json');
            http_response_code($allHealthy ? 200 : 503);

            echo json_encode($health, JSON_PRETTY_PRINT);
            exit;

        } catch (\Exception $e) {
            header_remove('X-Powered-By');
            header('Content-Type: application/json');
            http_response_code(503);

            echo json_encode([
                'status' => 'unhealthy',
                'timestamp' => date('Y-m-d H:i:s'),
                'error' => $e->getMessage()
            ], JSON_PRETTY_PRINT);
            exit;
        }
    }

    private function getAppVersion(): string
    {
        return '1.0.0'; // Should be updated from version control
    }

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            $stmt = $this->db->query('SELECT 1');
            $stmt->fetch();
            $responseTime = round((microtime(true) - $start) * 1000, 2);

            $versionQuery = $this->db->query('SELECT VERSION() as version');
            $version = $versionQuery->fetch()['version'];

            return [
                'status' => 'healthy',
                'response_time' => $responseTime,
                'version' => $version,
                'connection' => 'active'
            ];

        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'connection' => 'failed'
            ];
        }
    }

    private function checkCache(): array
    {
        $checks = [];

        // Check APCu
        if (function_exists('apcu_cache_info')) {
            try {
                $apcuInfo = \apcu_cache_info();
                $checks['apcu'] = [
                    'status' => 'healthy',
                    'type' => 'APCu',
                    'memory_usage' => $apcuInfo['mem_usage'] ?? 'unknown',
                    'hits' => $apcuInfo['hits'] ?? 0,
                    'misses' => $apcuInfo['misses'] ?? 0,
                    'hit_rate' => $this->calculateHitRate($apcuInfo['hits'] ?? 0, $apcuInfo['misses'] ?? 0)
                ];
            } catch (\Exception $e) {
                $checks['apcu'] = [
                    'status' => 'unhealthy',
                    'error' => $e->getMessage()
                ];
            }
        } else {
            $checks['apcu'] = [
                'status' => 'disabled',
                'message' => 'APCu not available'
            ];
        }

        // Check file cache
        $cacheDir = __DIR__ . '/../../storage/cache';
        if (is_dir($cacheDir) && is_writable($cacheDir)) {
            $checks['file_cache'] = [
                'status' => 'healthy',
                'writable' => true,
                'path' => $cacheDir
            ];
        } else {
            $checks['file_cache'] = [
                'status' => 'unhealthy',
                'writable' => false,
                'path' => $cacheDir ?? 'not found'
            ];
        }

        $overallStatus = 'healthy';
        foreach ($checks as $check) {
            if ($check['status'] !== 'healthy' && $check['status'] !== 'disabled') {
                $overallStatus = 'unhealthy';
                break;
            }
        }

        return [
            'status' => $overallStatus,
            'checks' => $checks
        ];
    }

    private function checkStorage(): array
    {
        $storageDir = __DIR__ . '/../../storage';
        $checks = [];

        // Check main storage directory
        if (is_dir($storageDir)) {
            $writable = is_writable($storageDir);
            $freeSpace = disk_free_space($storageDir);
            
            $checks['main'] = [
                'status' => $writable ? 'healthy' : 'unhealthy',
                'writable' => $writable,
                'free_space' => $this->formatBytes($freeSpace),
                'path' => $storageDir
            ];

            // Check subdirectories
            $subdirs = ['logs', 'temp', 'cache'];
            foreach ($subdirs as $subdir) {
                $subdirPath = $storageDir . '/' . $subdir;
                if (is_dir($subdirPath)) {
                    $checks[$subdir] = [
                        'status' => is_writable($subdirPath) ? 'healthy' : 'unhealthy',
                        'writable' => is_writable($subdirPath),
                        'exists' => true
                    ];
                } else {
                    $checks[$subdir] = [
                        'status' => 'unhealthy',
                        'writable' => false,
                        'exists' => false,
                        'path' => $subdirPath
                    ];
                }
            }
        } else {
            $checks['main'] = [
                'status' => 'unhealthy',
                'error' => 'Storage directory not found',
                'path' => $storageDir
            ];
        }

        $overallStatus = 'healthy';
        foreach ($checks as $check) {
            if ($check['status'] !== 'healthy') {
                $overallStatus = 'unhealthy';
                break;
            }
        }

        return [
            'status' => $overallStatus,
            'checks' => $checks
        ];
    }

    private function checkMemory(): array
    {
        if (!function_exists('memory_get_usage')) {
            return [
                'status' => 'unknown',
                'message' => 'Memory usage functions not available'
            ];
        }

        $usage = memory_get_usage(true);
        $peak = memory_get_peak_usage(true);

        // Get memory limit
        $memoryLimit = $this->parseIniSize(ini_get('memory_limit'));
        
        if ($memoryLimit > 0) {
            $usagePercent = round(($usage / $memoryLimit) * 100, 2);
            $peakPercent = round(($peak / $memoryLimit) * 100, 2);
            
            $status = ($usagePercent < 90) ? 'healthy' : 'unhealthy';
        } else {
            $usagePercent = 'unknown';
            $peakPercent = 'unknown';
            $status = 'unknown';
        }

        return [
            'status' => $status,
            'current' => $this->formatBytes($usage),
            'peak' => $this->formatBytes($peak),
            'limit' => $memoryLimit > 0 ? $this->formatBytes($memoryLimit) : 'unlimited',
            'usage_percent' => $usagePercent,
            'peak_percent' => $peakPercent
        ];
    }

    private function checkDisk(): array
    {
        $totalSpace = disk_total_space('/');
        $freeSpace = disk_free_space('/');
        $usedSpace = $totalSpace - $freeSpace;

        if ($totalSpace > 0) {
            $usagePercent = round(($usedSpace / $totalSpace) * 100, 2);
            $status = ($usagePercent < 90) ? 'healthy' : 'unhealthy';
        } else {
            $usagePercent = 'unknown';
            $status = 'unknown';
        }

        return [
            'status' => $status,
            'total' => $this->formatBytes($totalSpace),
            'used' => $this->formatBytes($usedSpace),
            'free' => $this->formatBytes($freeSpace),
            'usage_percent' => $usagePercent
        ];
    }

    private function checkApiEndpoints(): array
    {
        $endpoints = [
            '/api/auth/me',
            '/api/snippets',
            '/api/health'
        ];

        $checks = [];
        $overallStatus = 'healthy';

        foreach ($endpoints as $endpoint) {
            try {
                $start = microtime(true);
                $url = 'http://localhost' . $endpoint;
                
                // Use file_get_contents to test availability
                $context = stream_context_create([
                    'http' => [
                        'timeout' => 5,
                        'method' => 'GET',
                        'header' => [
                            'Content-Type: application/json',
                            'X-Health-Check: true'
                        ]
                    ]
                ]);

                $response = file_get_contents($url, false, $context);
                $responseTime = round((microtime(true) - $start) * 1000, 2);

                if ($response !== false) {
                    $checks[$endpoint] = [
                        'status' => 'healthy',
                        'response_time' => $responseTime,
                        'url' => $url
                    ];
                } else {
                    $checks[$endpoint] = [
                        'status' => 'unhealthy',
                        'error' => 'No response',
                        'url' => $url
                    ];
                    $overallStatus = 'unhealthy';
                }
            } catch (\Exception $e) {
                $checks[$endpoint] = [
                    'status' => 'unhealthy',
                    'error' => $e->getMessage(),
                    'url' => $endpoint
                ];
                $overallStatus = 'unhealthy';
            }
        }

        return [
            'status' => $overallStatus,
            'endpoints' => $checks
        ];
    }

    private function checkExternalServices(): array
    {
        $services = [];
        
        // Check email service (placeholder)
        $services['email'] = [
            'status' => 'unknown',
            'message' => 'Email service not configured'
        ];

        // Check external storage (placeholder)
        $services['storage'] = [
            'status' => 'unknown',
            'message' => 'External storage not configured'
        ];

        // Check CDN (placeholder)
        $services['cdn'] = [
            'status' => 'unknown',
            'message' => 'CDN not configured'
        ];

        return [
            'status' => 'unknown',
            'services' => $services
        ];
    }

    private function calculateHitRate(int $hits, int $misses): string
    {
        $total = $hits + $misses;
        if ($total === 0) {
            return '0%';
        }
        
        return round(($hits / $total) * 100, 2) . '%';
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }

    private function parseIniSize(string $size): int
    {
        $unit = strtoupper(substr($size, -1));
        $value = (int)substr($size, 0, -1);

        switch ($unit) {
            case 'G':
                return $value * 1024 * 1024 * 1024;
            case 'M':
                return $value * 1024 * 1024;
            case 'K':
                return $value * 1024;
            default:
                return (int)$size;
        }
    }
}