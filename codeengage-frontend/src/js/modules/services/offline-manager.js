// Offline Manager - Service Worker + IndexedDB
class OfflineManager {
    constructor() {
        this.dbName = 'CodeEngageOffline';
        this.version = 1;
        this.db = null;
        this.swRegistration = null;
        this.cacheName = 'codeengage-cache-v1';
        
        this.init();
    }

    async init() {
        // Register service worker
        await this.registerServiceWorker();
        
        // Initialize IndexedDB
        await this.initIndexedDB();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                console.log('Service Worker registered:', this.swRegistration.scope);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.createObjectStores();
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
            };
        });
    }

    createObjectStores() {
        if (!this.db.objectStoreNames.contains('snippets')) {
            const snippetStore = this.db.createObjectStore('snippets', { keyPath: 'id' });
            snippetStore.createIndex('language', 'language', { unique: false });
            snippetStore.createIndex('created_at', 'created_at', { unique: false });
            snippetStore.createIndex('author_id', 'author_id', { unique: false });
        }
        
        if (!this.db.objectStoreNames.contains('cache')) {
            const cacheStore = this.db.createObjectStore('cache', { keyPath: 'key' });
            cacheStore.createIndex('expires_at', 'expires_at', { unique: false });
        }
        
        if (!this.db.objectStoreNames.contains('sync-queue')) {
            const syncStore = this.db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('created_at', 'created_at', { unique: false });
        }
    }

    setupEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Listen for sync events
        window.addEventListener('sync-snippets', () => this.syncSnippets());
    }

    async storeSnippet(snippet) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['snippets'], 'readwrite');
            const store = transaction.objectStore('snippets');
            
            const request = store.put({
                ...snippet,
                cached_at: new Date().toISOString(),
                needs_sync: false
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSnippet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['snippets'], 'readonly');
            const store = transaction.objectStore('snippets');
            
            const request = store.get(parseInt(id));
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSnippets(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['snippets'], 'readonly');
            const store = transaction.objectStore('snippets');
            
            let request;
            if (filters.language) {
                request = store.index('language').getAll(filters.language);
            } else if (filters.author_id) {
                request = store.index('author_id').getAll(filters.author_id);
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => {
                let snippets = request.result || [];
                
                // Apply additional filters
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    snippets = snippets.filter(snippet => 
                        snippet.title.toLowerCase().includes(searchTerm) ||
                        snippet.description.toLowerCase().includes(searchTerm) ||
                        snippet.code.toLowerCase().includes(searchTerm)
                    );
                }
                
                resolve(snippets);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async deleteSnippet(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['snippets'], 'readwrite');
            const store = transaction.objectStore('snippets');
            
            const request = store.delete(parseInt(id));
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearSnippets() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['snippets'], 'readwrite');
            const store = transaction.objectStore('snippets');
            
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async cacheData(key, data, ttl = 3600000) { // 1 hour default
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            const request = store.put({
                key,
                data,
                expires_at: Date.now() + ttl
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCachedData(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readonly');
            const store = transaction.objectStore('cache');
            
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                
                if (!result) {
                    resolve(null);
                    return;
                }
                
                // Check if expired
                if (result.expires_at < Date.now()) {
                    // Delete expired entry
                    this.deleteCachedData(key);
                    resolve(null);
                    return;
                }
                
                resolve(result.data);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCachedData(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearCache() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async addToSyncQueue(action, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync-queue'], 'readwrite');
            const store = transaction.objectStore('sync-queue');
            
            const request = store.add({
                action,
                data,
                created_at: new Date().toISOString(),
                retried: 0
            });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncQueue() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync-queue'], 'readonly');
            const store = transaction.objectStore('sync-queue');
            
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async removeFromSyncQueue(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync-queue'], 'readwrite');
            const store = transaction.objectStore('sync-queue');
            
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearSyncQueue() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync-queue'], 'readwrite');
            const store = transaction.objectStore('sync-queue');
            
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    handleOnline() {
        console.log('Application is online');
        document.body.classList.remove('offline-mode');
        
        // Sync any pending changes
        this.syncPendingChanges();
        
        // Notify user
        if (window.app && window.app.showSuccess) {
            window.app.showSuccess('Connection restored - syncing changes');
        }
    }

    handleOffline() {
        console.log('Application is offline');
        document.body.classList.add('offline-mode');
        
        // Notify user
        if (window.app && window.app.showWarning) {
            window.app.showWarning('You are now offline. Changes will sync when connection is restored.');
        }
    }

    async syncPendingChanges() {
        if (!navigator.onLine) {
            return;
        }

        try {
            const syncQueue = await this.getSyncQueue();
            
            for (const item of syncQueue) {
                try {
                    await this.processSyncItem(item);
                    await this.removeFromSyncQueue(item.id);
                } catch (error) {
                    console.error('Failed to sync item:', error);
                    
                    // Increment retry count
                    if (item.retried < 3) {
                        await this.addToSyncQueue(item.action, item.data);
                    } else {
                        console.error('Max retries exceeded for item:', item);
                    }
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }

    async processSyncItem(item) {
        switch (item.action) {
            case 'create_snippet':
            case 'update_snippet':
                return await window.app.apiClient.post('/api/snippets', item.data);
            case 'delete_snippet':
                return await window.app.apiClient.delete(`/api/snippets/${item.data.id}`);
            default:
                throw new Error(`Unknown sync action: ${item.action}`);
        }
    }

    async syncSnippets() {
        if (!navigator.onLine || !window.app.authManager.isAuthenticated()) {
            return;
        }

        try {
            // Get latest snippets from server
            const response = await window.app.apiClient.get('/api/snippets', {
                limit: 1000,
                user_id: window.app.authManager.user.id
            });

            if (response.success) {
                // Store or update local snippets
                for (const snippet of response.data) {
                    await this.storeSnippet({
                        ...snippet,
                        needs_sync: false
                    });
                }
                
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess('Snippets synced successfully');
                }
            }
        } catch (error) {
            console.error('Sync failed:', error);
            
            if (window.app && window.app.showError) {
                window.app.showError('Failed to sync snippets');
            }
        }
    }

    // Utility methods
    isOnline() {
        return navigator.onLine;
    }

    getStorageInfo() {
        if (!this.db) {
            return { error: 'IndexedDB not initialized' };
        }

        const estimate = navigator.storage?.estimate?.() || { usage: 0, quota: 0 };
        
        return {
            indexedDB: {
                version: this.version,
                objectStores: this.db.objectStoreNames
            },
            serviceWorker: this.swRegistration ? {
                active: true,
                scope: this.swRegistration.scope
            } : {
                active: false
            },
            storage: {
                used: estimate.usage,
                available: estimate.quota - estimate.usage,
                percentage: estimate.quota ? (estimate.usage / estimate.quota * 100).toFixed(2) : 'unknown'
            }
        };
    }

    // Export/Import methods
    async exportData() {
        const data = {
            snippets: await this.getSnippets(),
            cache: await this.getCachedData('_all'),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `codeengage-offline-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Import snippets
                    if (data.snippets && Array.isArray(data.snippets)) {
                        for (const snippet of data.snippets) {
                            await this.storeSnippet(snippet);
                        }
                    }
                    
                    // Import cache
                    if (data.cache && typeof data.cache === 'object') {
                        for (const [key, value] of Object.entries(data.cache)) {
                            await this.cacheData(key, value);
                        }
                    }
                    
                    resolve({
                        snippetsImported: data.snippets?.length || 0,
                        cacheItemsImported: data.cache ? Object.keys(data.cache).length : 0
                    });
                    
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

// Export for use in other modules
window.OfflineManager = OfflineManager;