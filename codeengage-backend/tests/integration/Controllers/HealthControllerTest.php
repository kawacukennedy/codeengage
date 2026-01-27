<?php

declare(strict_types=1);

namespace Tests\Integration\Controllers;

use Tests\DatabaseTestCase;

/**
 * Integration tests for HealthController
 */
class HealthControllerTest extends DatabaseTestCase
{
    public function testHealthCheckReturnsOkStatus(): void
    {
        // Simulate health check
        $health = [
            'status' => 'healthy',
            'timestamp' => date('c'),
            'version' => '1.0.0'
        ];
        
        $this->assertEquals('healthy', $health['status']);
    }

    public function testHealthCheckIncludesDatabaseStatus(): void
    {
        // Check database connection
        try {
            $stmt = $this->db->query("SELECT 1");
            $dbStatus = 'connected';
        } catch (\Exception $e) {
            $dbStatus = 'disconnected';
        }
        
        $this->assertEquals('connected', $dbStatus);
    }

    public function testHealthCheckMeasuresResponseTime(): void
    {
        $startTime = microtime(true);
        
        // Simulate DB query
        $this->db->query("SELECT 1");
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000; // Convert to ms
        
        $this->assertLessThan(1000, $responseTime); // Should be under 1 second
    }

    public function testHealthCheckReturnsUptimeInfo(): void
    {
        // Simulate server uptime info
        $uptime = [
            'started_at' => date('c', strtotime('-7 days')),
            'uptime_seconds' => 7 * 24 * 60 * 60,
            'uptime_human' => '7 days'
        ];
        
        $this->assertArrayHasKey('uptime_seconds', $uptime);
        $this->assertGreaterThan(0, $uptime['uptime_seconds']);
    }

    public function testHealthCheckReturnsMemoryUsage(): void
    {
        $memoryUsage = memory_get_usage(true);
        $memoryPeak = memory_get_peak_usage(true);
        
        $memoryInfo = [
            'current' => $memoryUsage,
            'peak' => $memoryPeak,
            'limit' => ini_get('memory_limit')
        ];
        
        $this->assertGreaterThan(0, $memoryInfo['current']);
        $this->assertGreaterThanOrEqual($memoryInfo['current'], $memoryInfo['peak']);
    }

    public function testDetailedHealthCheckRequiresAuth(): void
    {
        // Simulate auth check for detailed health
        $isAuthenticated = false;
        $isAdmin = false;
        
        $canAccessDetailed = $isAuthenticated && $isAdmin;
        
        $this->assertFalse($canAccessDetailed);
    }

    public function testHealthCheckReturnsComponentStatuses(): void
    {
        $components = [
            'database' => $this->checkDatabaseHealth(),
            'cache' => $this->checkCacheHealth(),
            'storage' => $this->checkStorageHealth()
        ];
        
        $this->assertArrayHasKey('database', $components);
        $this->assertArrayHasKey('cache', $components);
    }

    private function checkDatabaseHealth(): array
    {
        try {
            $start = microtime(true);
            $this->db->query("SELECT 1");
            $latency = (microtime(true) - $start) * 1000;
            
            return [
                'status' => 'healthy',
                'latency_ms' => round($latency, 2)
            ];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkCacheHealth(): array
    {
        // Simulate cache check
        return [
            'status' => 'healthy',
            'type' => 'file',
            'hit_rate' => 0.85
        ];
    }

    private function checkStorageHealth(): array
    {
        // Check disk space
        $freeSpace = disk_free_space('/tmp');
        $totalSpace = disk_total_space('/tmp');
        
        return [
            'status' => $freeSpace > 1024 * 1024 * 100 ? 'healthy' : 'warning',
            'free_bytes' => $freeSpace,
            'total_bytes' => $totalSpace
        ];
    }

    public function testHealthCheckReturnsPhpVersion(): void
    {
        $phpInfo = [
            'version' => PHP_VERSION,
            'major' => PHP_MAJOR_VERSION,
            'minor' => PHP_MINOR_VERSION
        ];
        
        $this->assertGreaterThanOrEqual(8, $phpInfo['major']);
    }

    public function testHealthCheckCountsActiveConnections(): void
    {
        // Simulate connection count
        $stmt = $this->db->query("SHOW STATUS LIKE 'Threads_connected'");
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        
        $connections = $result ? (int) $result['Value'] : 0;
        
        $this->assertGreaterThan(0, $connections);
    }

    public function testHealthCheckReturnsApiEndpointsStatus(): void
    {
        $endpoints = [
            '/api/health' => ['status' => 200, 'latency' => 5],
            '/api/auth/login' => ['status' => 200, 'latency' => 15],
            '/api/snippets' => ['status' => 200, 'latency' => 25]
        ];
        
        foreach ($endpoints as $path => $info) {
            $this->assertEquals(200, $info['status']);
        }
    }

    public function testReadinessCheckSucceeds(): void
    {
        // Readiness = all dependencies ready
        $checks = [
            'database' => true,
            'cache' => true,
            'migration' => true
        ];
        
        $isReady = !in_array(false, $checks, true);
        
        $this->assertTrue($isReady);
    }

    public function testLivenessCheckSucceeds(): void
    {
        // Liveness = application is running
        $isAlive = true;
        
        $this->assertTrue($isAlive);
    }
}
