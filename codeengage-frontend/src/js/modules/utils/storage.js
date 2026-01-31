/**
 * Storage Utilities
 * 
 * Wrapper functions for localStorage and sessionStorage with JSON support.
 */

const PREFIX = 'codeengage_';

/**
 * Storage error tracking
 */
const STORAGE_ERRORS = [];

/**
 * Track storage errors for debugging
 * @param {string} operation - Storage operation
 * @param {string} key - Storage key
 * @param {Error} error - Error object
 */
function trackStorageError(operation, key, error) {
    const errorInfo = {
        operation,
        key,
        error: {
            message: error.message,
            name: error.name,
            stack: error.stack
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        storageAvailable: isStorageAvailable('localStorage'),
        storageQuota: getStorageQuota()
    };

    STORAGE_ERRORS.push(errorInfo);
    
    // Keep only last 50 errors
    if (STORAGE_ERRORS.length > 50) {
        STORAGE_ERRORS.splice(0, STORAGE_ERRORS.length - 50);
    }

    // Log for debugging
    console.error('Storage Error:', errorInfo);

    // Report to global error handler if available
    if (window.app && window.app.handleGlobalError) {
        window.app.handleGlobalError(error, {
            type: 'storage_error',
            operation,
            key
        });
    }
}

/**
 * Check if storage is available
 * @param {string} type - 'localStorage' or 'sessionStorage'
 * @returns {boolean} Storage availability
 */
function isStorageAvailable(type) {
    try {
        const storage = window[type];
        const testKey = '__storage_test__';
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get storage quota information
 * @returns {object} Storage quota details
 */
function getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            return {
                available: true,
                quota: null,
                usage: null,
                percentage: null
            };
        } catch (e) {
            return { available: false };
        }
    }
    
    return { available: false };
}

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export function getLocal(key, defaultValue = null) {
    try {
        if (!isStorageAvailable('localStorage')) {
            trackStorageError('get', key, new Error('localStorage not available'));
            return defaultValue;
        }

        const item = localStorage.getItem(PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        trackStorageError('get', key, error);
        return defaultValue;
    }
}

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function setLocal(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
        console.error('Error writing to localStorage:', error);
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export function removeLocal(key) {
    try {
        localStorage.removeItem(PREFIX + key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

/**
 * Get item from sessionStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored value or default
 */
export function getSession(key, defaultValue = null) {
    try {
        const item = sessionStorage.getItem(PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from sessionStorage:', error);
        return defaultValue;
    }
}

/**
 * Set item in sessionStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function setSession(key, value) {
    try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
        console.error('Error writing to sessionStorage:', error);
    }
}

/**
 * Remove item from sessionStorage
 * @param {string} key - Storage key
 */
export function removeSession(key) {
    try {
        sessionStorage.removeItem(PREFIX + key);
    } catch (error) {
        console.error('Error removing from sessionStorage:', error);
    }
}

/**
 * Clear all app-related items from localStorage
 */
export function clearLocalStorage() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }
}

/**
 * Clear all app-related items from sessionStorage
 */
export function clearSessionStorage() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key.startsWith(PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    } catch (error) {
        console.error('Error clearing sessionStorage:', error);
    }
}

/**
 * Get all keys from localStorage with app prefix
 * @returns {Array<string>} Array of keys without prefix
 */
export function getLocalKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(PREFIX)) {
            keys.push(key.substring(PREFIX.length));
        }
    }
    return keys;
}

/**
 * Check if localStorage is available
 * @returns {boolean} Whether localStorage is available
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get storage usage statistics
 * @returns {object} Object with usage info
 */
export function getStorageUsage() {
    let localSize = 0;
    let sessionSize = 0;
    let appLocalSize = 0;
    let appSessionSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = (key.length + value.length) * 2; // UTF-16
        localSize += size;
        if (key.startsWith(PREFIX)) {
            appLocalSize += size;
        }
    }

    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        const size = (key.length + value.length) * 2;
        sessionSize += size;
        if (key.startsWith(PREFIX)) {
            appSessionSize += size;
        }
    }

    return {
        localStorage: {
            total: localSize,
            app: appLocalSize,
            available: 5 * 1024 * 1024 - localSize // Approx 5MB limit
        },
        sessionStorage: {
            total: sessionSize,
            app: appSessionSize,
            available: 5 * 1024 * 1024 - sessionSize
        }
    };
}

/**
 * Store an item with expiration
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @param {number} ttlMs - Time to live in milliseconds
 */
export function setWithExpiry(key, value, ttlMs) {
    const item = {
        value,
        expiry: Date.now() + ttlMs
    };
    setLocal(key, item);
}

/**
 * Get an item with expiration check
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found or expired
 * @returns {*} Stored value or default
 */
export function getWithExpiry(key, defaultValue = null) {
    const item = getLocal(key);

    if (!item) return defaultValue;

    if (Date.now() > item.expiry) {
        removeLocal(key);
        return defaultValue;
    }

    return item.value;
}

export default {
    getLocal,
    setLocal,
    removeLocal,
    getSession,
    setSession,
    removeSession,
    clearLocalStorage,
    clearSessionStorage,
    getLocalKeys,
    isLocalStorageAvailable,
    getStorageUsage,
    setWithExpiry,
    getWithExpiry
};
