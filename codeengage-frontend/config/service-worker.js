// Service Worker for PWA capabilities
const CACHE_NAME = 'codeengage-sw-v1';
const RUNTIME_CACHE_NAME = 'codeengage-runtime-v1';

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    // Create caches
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/src/css/main.css',
                '/src/js/app.js',
                '/src/js/router.js',
                '/manifest.json'
            ]);
        }).then(() => {
            console.log('Service Worker installed');
            self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    // Clean up old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
        })
    );
});

// Network-first caching strategy for static assets
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Handle different request types
    event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    
    // API requests - network first
    if (url.pathname.startsWith('/api/')) {
        try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
                // Cache successful API responses
                const cache = await caches.open(RUNTIME_CACHE_NAME);
                cache.put(request, networkResponse.clone());
                return networkResponse;
            }
        } catch (error) {
            console.error('API request failed:', error);
            // Try to get from cache
            return caches.match(request);
        }
    }
    
    // Static assets - cache first
    try {
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            return cacheResponse;
        }
        
        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Request failed:', error);
        return new Response('Network error', { status: 500 });
    }
}

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event);
    
    if (event.tag === 'sync-snippets') {
        event.waitUntil(syncSnippets());
    }
});

async function syncSnippets() {
    try {
        // Get all sync queue items from IndexedDB
        const db = await openIndexedDB();
        const syncQueue = await getSyncQueue(db);
        
        for (const item of syncQueue) {
            try {
                const response = await fetch('/api/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + item.auth_token
                    },
                    body: JSON.stringify({
                        action: item.action,
                        data: item.data,
                        timestamp: item.timestamp
                    })
                });
                
                if (response.ok) {
                    // Remove from queue if successful
                    await removeFromSyncQueue(db, item.id);
                    console.log('Synced item:', item.id);
                } else {
                    console.error('Failed to sync item:', item.id);
                }
            } catch (error) {
                console.error('Sync error for item:', item.id, error);
            }
        }
        
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// IndexedDB helpers
async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CodeEngageOffline', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sync-queue')) {
                const store = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp');
            }
        };
    });
}

async function getSyncQueue(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sync-queue'], 'readonly');
        const store = transaction.objectStore('sync-queue');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function removeFromSyncQueue(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sync-queue'], 'readwrite');
        const store = transaction.objectStore('sync-queue');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('Push message received:', event);
    
    const data = event.data.json ? event.data.json() : {};
    
    // Handle different types of push notifications
    if (data.type === 'new_comment') {
        const title = 'New comment on your snippet';
        const options = {
            body: data.message,
            icon: '/assets/icons/notification-icon.png',
            badge: '/assets/icons/badge.png',
            data: {
                url: `/snippets/${data.snippet_id}`
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
    
    if (data.type === 'snippet_forked') {
        const title = 'Your snippet was forked';
        const options = {
            body: `${data.user} forked your snippet "${data.snippet_title}"`,
            icon: '/assets/icons/notification-icon.png',
            badge: '/assets/icons/badge.png',
            data: {
                url: `/snippets/${data.snippet_id}`
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
    
    if (data.type === 'achievement') {
        const title = 'Achievement Unlocked!';
        const options = {
            body: `You earned the "${data.achievement_name}" achievement!`,
            icon: '/assets/icons/achievement-icon.png',
            badge: '/assets/icons/badge.png',
            data: {
                url: `/profile?tab=achievements`
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('Message from main thread:', event.data);
    
    const { type, action } = event.data;
    
    if (type === 'CACHE') {
        if (action === 'SKIP_WAITING') {
            // Skip waiting and add to cache immediately
            self.skipWaiting();
        } else if (action === 'CLEAR') {
            // Clear caches
            event.waitUntil(
                Promise.all([
                    caches.delete(CACHE_NAME),
                    caches.delete(RUNTIME_CACHE_NAME)
                ])
            );
        }
    }
    
    if (type === 'SYNC') {
        if (action === 'FORCE') {
            // Force sync now
            event.waitUntil(syncSnippets());
        }
    }
});

// Periodic cleanup
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cleanup') {
        console.log('Running periodic cleanup...');
        
        event.waitUntil(cleanupCaches());
    }
});

async function cleanupCaches() {
    try {
        // Clean up old runtime cache entries (older than 1 hour)
        const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
        const runtimeCacheKeys = await runtimeCache.keys();
        
        const oldEntries = runtimeCacheKeys.filter(key => {
            const url = new URL(key);
            return url.searchParams.has('timestamp') && 
                   parseInt(url.searchParams.get('timestamp')) < Date.now() - 3600000; // 1 hour ago
        });
        
        for (const key of oldEntries) {
            await runtimeCache.delete(key);
        }
        
        console.log(`Cleaned up ${oldEntries.length} old cache entries`);
    } catch (error) {
        console.error('Cache cleanup failed:', error);
    }
}