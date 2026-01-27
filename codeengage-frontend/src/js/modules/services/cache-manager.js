// Cache Manager Service
class CacheManager {
    constructor() {
        this.cacheName = 'codeengage-cache-v1';
        this.cacheStore = new Map();
        this.maxSize = 100;
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
        this.initServiceWorker();
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/config/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered');
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }

    async set(key, value, ttl = this.defaultTTL) {
        const item = {
            value,
            timestamp: Date.now(),
            ttl,
            expires: Date.now() + ttl
        };

        // Memory cache
        this.cacheStore.set(key, item);

        // Cleanup old items if cache is full
        if (this.cacheStore.size > this.maxSize) {
            this.cleanup();
        }

        // Persistent cache (Service Worker)
        try {
            const cache = await caches.open(this.cacheName);
            const response = new Response(JSON.stringify(item), {
                headers: { 'Content-Type': 'application/json' }
            });
            await cache.put(`/cache/${key}`, response);
        } catch (error) {
            console.warn('Failed to cache to persistent storage:', error);
        }

        return true;
    }

    async get(key) {
        // Check memory cache first
        const memoryItem = this.cacheStore.get(key);
        if (memoryItem && memoryItem.expires > Date.now()) {
            return memoryItem.value;
        }

        // Check persistent cache
        try {
            const cache = await caches.open(this.cacheName);
            const response = await cache.match(`/cache/${key}`);
            
            if (response) {
                const item = await response.json();
                if (item.expires > Date.now()) {
                    // Restore to memory cache
                    this.cacheStore.set(key, item);
                    return item.value;
                } else {
                    // Remove expired item
                    await cache.delete(`/cache/${key}`);
                }
            }
        } catch (error) {
            console.warn('Failed to read from persistent cache:', error);
        }

        return null;
    }

    async delete(key) {
        this.cacheStore.delete(key);
        
        try {
            const cache = await caches.open(this.cacheName);
            await cache.delete(`/cache/${key}`);
        } catch (error) {
            console.warn('Failed to delete from persistent cache:', error);
        }

        return true;
    }

    async clear() {
        this.cacheStore.clear();
        
        try {
            await caches.delete(this.cacheName);
        } catch (error) {
            console.warn('Failed to clear persistent cache:', error);
        }

        return true;
    }

    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        // Find expired items
        for (const [key, item] of this.cacheStore.entries()) {
            if (item.expires <= now) {
                keysToDelete.push(key);
            }
        }

        // Remove expired items
        keysToDelete.forEach(key => this.cacheStore.delete(key));

        // If still over limit, remove oldest items
        if (this.cacheStore.size > this.maxSize) {
            const items = Array.from(this.cacheStore.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp]);
            
            const itemsToDelete = items.slice(0, this.cacheStore.size - this.maxSize);
            itemsToDelete.forEach(([key]) => this.cacheStore.delete(key));
        }

        return keysToDelete.length + itemsToDelete?.length || 0;
    }

    async getStats() {
        const memorySize = this.cacheStore.size;
        let persistentSize = 0;

        try {
            const cache = await caches.open(this.cacheName);
            const keys = await cache.keys();
            persistentSize = keys.length;
        } catch (error) {
            console.warn('Failed to get persistent cache stats:', error);
        }

        return {
            memory: memorySize,
            persistent: persistentSize,
            total: memorySize + persistentSize,
            maxSize: this.maxSize
        };
    }

    // Predictive caching based on user behavior
    predictAndCache(userAction, relatedData) {
        const predictions = {
            'view-snippet': ['related-snippets', 'user-profile', 'snippet-comments'],
            'search': ['popular-tags', 'recent-snippets', 'trending-languages'],
            'create-snippet': ['user-templates', 'recent-languages', 'syntax-help'],
            'login': ['user-snippets', 'recent-activity', 'notifications']
        };

        const itemsToCache = predictions[userAction] || [];
        
        itemsToCache.forEach(async (item) => {
            if (!await this.get(item)) {
                // Pre-fetch data and cache it
                try {
                    const response = await fetch(`/api/cache/${item}`);
                    if (response.ok) {
                        const data = await response.json();
                        await this.set(item, data, 10 * 60 * 1000); // 10 minutes for predictions
                    }
                } catch (error) {
                    console.warn(`Failed to pre-cache ${item}:`, error);
                }
            }
        });
    }

    // Intelligent cache warming
    async warmCache(userPreferences = {}) {
        const warmingItems = [
            { key: 'popular-snippets', ttl: 15 * 60 * 1000 },
            { key: 'recent-tags', ttl: 30 * 60 * 1000 },
            { key: 'user-stats', ttl: 5 * 60 * 1000 }
        ];

        if (userPreferences.languages) {
            warmingItems.push(...userPreferences.languages.map(lang => ({
                key: `language-${lang}-snippets`,
                ttl: 20 * 60 * 1000
            })));
        }

        const warmingPromises = warmingItems.map(async (item) => {
            if (!await this.get(item.key)) {
                try {
                    const response = await fetch(`/api/cache/${item.key}`);
                    if (response.ok) {
                        const data = await response.json();
                        await this.set(item.key, data, item.ttl);
                    }
                } catch (error) {
                    console.warn(`Failed to warm cache for ${item.key}:`, error);
                }
            }
        });

        await Promise.all(warmingPromises);
        return warmingItems.length;
    }
}

export default CacheManager;