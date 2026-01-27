<?php

namespace App\Services;

use App\Helpers\SecurityHelper;

class CacheService
{
    private string $driver;
    private array $config;

    public function __construct(array $config = [])
    {
        $this->config = array_merge([
            'driver' => 'file',
            'ttl' => 3600, // 1 hour default
            'prefix' => 'codeengage_',
            'path' => sys_get_temp_dir() . '/codeengage_cache'
        ], $config);

        $this->driver = $this->config['driver'];
        $this->initializeDriver();
    }

    private function initializeDriver(): void
    {
        switch ($this->driver) {
            case 'apcu':
                if (!function_exists('apcu_store')) {
                    throw new \Exception('APCu extension not available');
                }
                break;
            case 'file':
                $cachePath = $this->config['path'];
                if (!is_dir($cachePath)) {
                    mkdir($cachePath, 0755, true);
                }
                break;
            default:
                throw new \Exception("Unsupported cache driver: {$this->driver}");
        }
    }

    public function get(string $key, $default = null)
    {
        $prefixedKey = $this->config['prefix'] . $key;

        switch ($this->driver) {
            case 'apcu':
                $cached = apcu_fetch($prefixedKey);
                return $cached !== false ? $cached : $default;

            case 'file':
                return $this->getFileCache($prefixedKey, $default);

            default:
                return $default;
        }
    }

    public function set(string $key, $value, ?int $ttl = null): bool
    {
        $prefixedKey = $this->config['prefix'] . $key;
        $ttl = $ttl ?? $this->config['ttl'];

        switch ($this->driver) {
            case 'apcu':
                return apcu_store($prefixedKey, $value, $ttl);

            case 'file':
                return $this->setFileCache($prefixedKey, $value, $ttl);

            default:
                return false;
        }
    }

    public function delete(string $key): bool
    {
        $prefixedKey = $this->config['prefix'] . $key;

        switch ($this->driver) {
            case 'apcu':
                return apcu_delete($prefixedKey);

            case 'file':
                return $this->deleteFileCache($prefixedKey);

            default:
                return false;
        }
    }

    public function clear(): bool
    {
        switch ($this->driver) {
            case 'apcu':
                $iterator = new \APCUIterator('/^' . preg_quote($this->config['prefix'], '/') . '/');
                $deleted = 0;
                foreach ($iterator as $item) {
                    apcu_delete($item['key']);
                    $deleted++;
                }
                return $deleted > 0;

            case 'file':
                return $this->clearFileCache();

            default:
                return false;
        }
    }

    public function remember(string $key, callable $callback, ?int $ttl = null)
    {
        $value = $this->get($key);

        if ($value === null) {
            $value = $callback();
            $this->set($key, $value, $ttl);
        }

        return $value;
    }

    public function increment(string $key, int $step = 1): int
    {
        $prefixedKey = $this->config['prefix'] . $key;

        switch ($this->driver) {
            case 'apcu':
                return apcu_inc($prefixedKey, $step) ?: 0;

            case 'file':
                $current = $this->get($key, 0);
                $new = $current + $step;
                $this->set($key, $new);
                return $new;

            default:
                return 0;
        }
    }

    public function decrement(string $key, int $step = 1): int
    {
        return $this->increment($key, -$step);
    }

    public function has(string $key): bool
    {
        return $this->get($key) !== null;
    }

    public function tags(array $tags): TaggedCache
    {
        return new TaggedCache($this, $tags);
    }

    public function getStats(): array
    {
        switch ($this->driver) {
            case 'apcu':
                $info = apcu_cache_info();
                return [
                    'driver' => 'apcu',
                    'hits' => $info['num_hits'] ?? 0,
                    'misses' => $info['num_misses'] ?? 0,
                    'size' => $info['mem_size'] ?? 0,
                    'count' => count($info['cache_list'] ?? [])
                ];

            case 'file':
                $files = glob($this->config['path'] . '/*.cache');
                $totalSize = 0;
                foreach ($files as $file) {
                    $totalSize += filesize($file);
                }
                return [
                    'driver' => 'file',
                    'hits' => 0,
                    'misses' => 0,
                    'size' => $totalSize,
                    'count' => count($files)
                ];

            default:
                return ['driver' => $this->driver];
        }
    }

    private function getFileCache(string $key, $default)
    {
        $filename = $this->getCacheFilename($key);
        
        if (!file_exists($filename)) {
            return $default;
        }

        $data = unserialize(file_get_contents($filename));
        
        if ($data['expires'] > 0 && $data['expires'] < time()) {
            unlink($filename);
            return $default;
        }

        return $data['value'];
    }

    private function setFileCache(string $key, $value, int $ttl): bool
    {
        $filename = $this->getCacheFilename($key);
        $expires = $ttl > 0 ? time() + $ttl : 0;
        
        $data = [
            'value' => $value,
            'expires' => $expires,
            'created' => time()
        ];

        $result = file_put_contents($filename, serialize($data), LOCK_EX);
        return $result !== false;
    }

    private function deleteFileCache(string $key): bool
    {
        $filename = $this->getCacheFilename($key);
        return file_exists($filename) && unlink($filename);
    }

    private function clearFileCache(): bool
    {
        $files = glob($this->config['path'] . '/*.cache');
        $deleted = 0;
        
        foreach ($files as $file) {
            if (unlink($file)) {
                $deleted++;
            }
        }
        
        return $deleted > 0;
    }

    private function getCacheFilename(string $key): string
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key);
        return $this->config['path'] . '/' . $safeKey . '.cache';
    }

    public function cleanup(): int
    {
        $cleaned = 0;

        switch ($this->driver) {
            case 'apcu':
                $iterator = new \APCUIterator('/^' . preg_quote($this->config['prefix'], '/') . '/');
                foreach ($iterator as $item) {
                    if ($item['expiration'] > 0 && $item['expiration'] < time()) {
                        apcu_delete($item['key']);
                        $cleaned++;
                    }
                }
                break;

            case 'file':
                $files = glob($this->config['path'] . '/*.cache');
                foreach ($files as $file) {
                    $data = unserialize(file_get_contents($file));
                    if ($data['expires'] > 0 && $data['expires'] < time()) {
                        unlink($file);
                        $cleaned++;
                    }
                }
                break;
        }

        return $cleaned;
    }

    public function getMultiple(array $keys): array
    {
        $results = [];
        
        foreach ($keys as $key) {
            $results[$key] = $this->get($key);
        }
        
        return $results;
    }

    public function setMultiple(array $values, ?int $ttl = null): bool
    {
        $success = true;
        
        foreach ($values as $key => $value) {
            $success = $success && $this->set($key, $value, $ttl);
        }
        
        return $success;
    }

    public function deleteMultiple(array $keys): bool
    {
        $success = true;
        
        foreach ($keys as $key) {
            $success = $success && $this->delete($key);
        }
        
        return $success;
    }
}

class TaggedCache
{
    private CacheService $cache;
    private array $tags;
    private string $tagKeyPrefix = 'tag:';

    public function __construct(CacheService $cache, array $tags)
    {
        $this->cache = $cache;
        $this->tags = array_unique($tags);
    }

    public function get(string $key, $default = null)
    {
        return $this->cache->get($this->getTaggedKey($key), $default);
    }

    public function set(string $key, $value, ?int $ttl = null): bool
    {
        $taggedKey = $this->getTaggedKey($key);
        $success = $this->cache->set($taggedKey, $value, $ttl);
        
        if ($success) {
            $this->updateTagKeys($key);
        }
        
        return $success;
    }

    public function delete(string $key): bool
    {
        $taggedKey = $this->getTaggedKey($key);
        return $this->cache->delete($taggedKey);
    }

    public function clear(): bool
    {
        $success = true;
        
        foreach ($this->tags as $tag) {
            $tagKey = $this->tagKeyPrefix . $tag;
            $keys = $this->cache->get($tagKey, []);
            
            foreach ($keys as $key) {
                $success = $success && $this->cache->delete($key);
            }
            
            $success = $success && $this->cache->delete($tagKey);
        }
        
        return $success;
    }

    private function getTaggedKey(string $key): string
    {
        $tagHash = md5(implode(',', $this->tags));
        return $tagHash . ':' . $key;
    }

    private function updateTagKeys(string $key): void
    {
        $taggedKey = $this->getTaggedKey($key);
        
        foreach ($this->tags as $tag) {
            $tagKey = $this->tagKeyPrefix . $tag;
            $keys = $this->cache->get($tagKey, []);
            
            if (!in_array($taggedKey, $keys)) {
                $keys[] = $taggedKey;
                $this->cache->set($tagKey, $keys);
            }
        }
    }
}