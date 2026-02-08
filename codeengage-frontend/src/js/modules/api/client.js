/**
 * API Client Module
 * 
 * Provides a unified interface for making HTTP requests to the backend API.
 */

/**
 * Circuit Breaker Pattern Implementation
 */
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.timeout = options.timeout || 60000;
        this.monitoringPeriod = options.monitoringPeriod || 30000;

        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.requestCount = 0;
        this.lastResetTime = Date.now();
    }

    /**
     * Execute a function through the circuit breaker
     * @param {Function} fn - Function to execute
     * @returns {Promise} Result of the function
     */
    async execute(fn) {
        this.resetIfMonitoringPeriodExpired();

        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
            } else {
                throw new CircuitBreakerError('Circuit breaker is OPEN');
            }
        }

        this.requestCount++;

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Handle successful request
     */
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 1) {
                this.reset();
            }
        } else {
            this.failureCount = 0;
        }
    }

    /**
     * Handle failed request
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }

    /**
     * Reset circuit breaker to closed state
     */
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.lastResetTime = Date.now();
    }

    /**
     * Check if monitoring period has expired and reset if needed
     */
    resetIfMonitoringPeriodExpired() {
        if (Date.now() - this.lastResetTime > this.monitoringPeriod) {
            this.reset();
        }
    }

    /**
     * Check if we should attempt to reset the circuit breaker
     * @returns {boolean} Whether to attempt reset
     */
    shouldAttemptReset() {
        return this.lastFailureTime && (Date.now() - this.lastFailureTime) > this.timeout;
    }

    /**
     * Get circuit breaker status
     * @returns {object} Current status
     */
    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            requestCount: this.requestCount,
            failureThreshold: this.failureThreshold,
            lastFailureTime: this.lastFailureTime,
            lastResetTime: this.lastResetTime
        };
    }
}

/**
 * Custom error for circuit breaker
 */
class CircuitBreakerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class ApiClient {
    /**
     * Create a new API client instance
     * @param {object} options - Configuration options
     */
    constructor(options = {}) {
        // Use absolute URL for backend if running locally and relative path is used
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.baseUrl = options.baseUrl || (isLocal ? 'http://127.0.0.1:8000/api' : '/api');
        this.timeout = options.timeout || 30000;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        this.interceptors = {
            request: [],
            response: []
        };
        this.retryConfig = {
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
            retryBackoffFactor: options.retryBackoffFactor || 2,
            retryableStatusCodes: [408, 429, 500, 502, 503, 504],
            retryableErrors: ['NetworkError', 'AbortError', 'TypeError']
        };

        // Circuit breaker configuration
        this.circuitBreaker = new CircuitBreaker({
            failureThreshold: options.circuitBreakerFailureThreshold || 5,
            timeout: options.circuitBreakerTimeout || 60000,
            monitoringPeriod: options.circuitBreakerMonitoringPeriod || 30000
        });
    }

    /**
     * Set the authentication token
     * @param {string} token - JWT token
     */
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }

    /**
     * Add a request interceptor
     * @param {Function} interceptor - Interceptor function
     */
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
    }

    /**
     * Add a response interceptor
     * @param {Function} interceptor - Interceptor function
     */
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
    }

    /**
     * Make an HTTP request with circuit breaker and retry mechanism
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise} Response promise
     */
    async request(method, endpoint, data = null, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        // Add request ID to headers
        const enhancedOptions = {
            ...options,
            headers: {
                ...options.headers,
                'X-Request-ID': requestId
            }
        };

        const useCircuitBreaker = options.circuitBreaker !== false;

        try {
            const result = useCircuitBreaker ?
                await this.circuitBreaker.execute(async () => {
                    return this.requestWithRetry(method, endpoint, data, enhancedOptions);
                }) :
                await this.requestWithRetry(method, endpoint, data, enhancedOptions);

            // Log successful request
            this.logRequest(method, endpoint, startTime, requestId, null, result);

            return result;

        } catch (error) {
            // Log failed request
            this.logRequest(method, endpoint, startTime, requestId, error, null);

            throw error;
        }
    }

    /**
     * Make a single HTTP request (no retry)
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise} Response promise
     */
    async requestOnce(method, endpoint, data = null, options = {}) {
        const url = this.buildUrl(endpoint);

        let config = {
            method,
            headers: { ...this.headers, ...options.headers },
            credentials: 'include'
        };

        // Add CSRF token from cookie if available
        const xsrfToken = getCookie('XSRF-TOKEN');
        if (xsrfToken) {
            config.headers['X-XSRF-TOKEN'] = xsrfToken;
        }

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        // Apply request interceptors
        for (const interceptor of this.interceptors.request) {
            config = await interceptor(config);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle successful response and update cache for GET requests
            if (response.ok && method === 'GET' && !options.skipCache) {
                const responseClone = response.clone();
                responseClone.json().then(data => {
                    if (window.app.offlineManager) {
                        window.app.offlineManager.cacheData(endpoint, data);
                    }
                }).catch(() => { });
            }

            let result = {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: null
            };

            // Parse response body
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result.data = await response.json();
            } else {
                result.data = await response.text();
            }

            // Apply response interceptors
            for (const interceptor of this.interceptors.response) {
                result = await interceptor(result);
            }

            if (!response.ok) {
                throw new ApiError(
                    result.data?.message || response.statusText,
                    response.status,
                    result.data
                );
            }

            return result.data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }

            // Handle Network Errors / Offline Mode
            if (!navigator.onLine || error.name === 'TypeError' || error.message.includes('fetch')) {
                console.warn('Network issue detected, trying offline handlers...');

                // For GET requests, try to serve from cache
                if (method === 'GET' && window.app.offlineManager) {
                    const cachedData = await window.app.offlineManager.getCachedData(endpoint);
                    if (cachedData) {
                        console.info('Serving data from offline cache');
                        return cachedData;
                    }
                }

                // For mutations (POST, PUT, DELETE), add to sync queue if not already a sync attempt
                if (['POST', 'PUT', 'DELETE'].includes(method) &&
                    window.app.offlineManager &&
                    !options.isSyncAttempt) {

                    console.info('Queueing mutation for background sync');

                    let action = '';
                    if (endpoint.includes('/snippets')) {
                        if (method === 'POST') action = 'create_snippet';
                        if (method === 'PUT') action = 'update_snippet';
                        if (method === 'DELETE') action = 'delete_snippet';
                    }

                    if (action) {
                        await window.app.offlineManager.addToSyncQueue(action, data);
                        // Return a "pending" response
                        return {
                            success: true,
                            message: 'Request queued for offline sync',
                            _queued: true
                        };
                    }
                }
            }

            throw error;
        }
    }

    /**
     * Make HTTP request with retry mechanism
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Additional options
     * @param {number} remainingRetries - Number of retries remaining
     * @returns {Promise} Response promise
     */
    async requestWithRetry(method, endpoint, data = null, options = {}, remainingRetries) {
        try {
            return await this.requestOnce(method, endpoint, data, options);
        } catch (error) {
            // Check if error is retryable
            if (this.isRetryableError(error) && remainingRetries > 0) {
                const delay = this.calculateRetryDelay(options.retryAttempt || 1);

                console.warn(`Request failed, retrying in ${delay}ms... (${remainingRetries} retries left)`, {
                    method,
                    endpoint,
                    error: error.message,
                    attempt: (options.retryAttempt || 1)
                });

                // Wait before retry
                await this.delay(delay);

                // Retry with incremented attempt counter
                return this.requestWithRetry(method, endpoint, data, {
                    ...options,
                    retryAttempt: (options.retryAttempt || 1) + 1
                }, remainingRetries - 1);
            }

            // No more retries or non-retryable error
            throw error;
        }
    }

    /**
     * Check if an error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} Whether the error is retryable
     */
    isRetryableError(error) {
        // Check status code based retries
        if (error.status && this.retryConfig.retryableStatusCodes.includes(error.status)) {
            return true;
        }

        // Check error name based retries
        if (this.retryConfig.retryableErrors.includes(error.name)) {
            return true;
        }

        // Check network errors
        if (error.message && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('Failed to fetch')
        )) {
            return true;
        }

        return false;
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attempt - Current attempt number (1-based)
     * @returns {number} Delay in milliseconds
     */
    calculateRetryDelay(attempt) {
        const baseDelay = this.retryConfig.retryDelay;
        const backoffFactor = this.retryConfig.retryBackoffFactor;

        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt - 1);

        // Add random jitter to avoid thundering herd
        const jitter = exponentialDelay * 0.1 * Math.random();

        // Cap at maximum delay (30 seconds)
        const maxDelay = 30000;

        return Math.min(exponentialDelay + jitter, maxDelay);
    }

    /**
     * Utility function to delay execution
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Configure retry settings
     * @param {object} config - Retry configuration
     */
    configureRetry(config) {
        this.retryConfig = { ...this.retryConfig, ...config };
    }

    /**
     * Get circuit breaker status
     * @returns {object} Circuit breaker status
     */
    getCircuitBreakerStatus() {
        return this.circuitBreaker.getStatus();
    }

    /**
     * Reset circuit breaker manually
     */
    resetCircuitBreaker() {
        this.circuitBreaker.reset();
    }

    /**
     * Configure circuit breaker
     * @param {object} config - Circuit breaker configuration
     */
    configureCircuitBreaker(config) {
        const newCircuitBreaker = new CircuitBreaker({
            ...this.circuitBreaker,
            ...config
        });
        this.circuitBreaker = newCircuitBreaker;
    }

    /**
     * Generate unique request ID
     * @returns {string} Request ID
     */
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Log request for debugging
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {number} startTime - Request start time
     * @param {string} requestId - Request ID
     * @param {Error} error - Error if any
     * @param {object} response - Response if successful
     */
    logRequest(method, endpoint, startTime, requestId, error = null, response = null) {
        const duration = Date.now() - startTime;
        const logData = {
            method,
            endpoint,
            requestId,
            duration,
            timestamp: new Date().toISOString(),
            success: !error,
            error: error ? {
                message: error.message,
                status: error.status,
                name: error.name
            } : null,
            response: response ? {
                status: response.status,
                size: JSON.stringify(response).length
            } : null
        };

        // Log request for debugging
        if (error) {
            console.group('%c🚨 API Error', 'background: red; color: white; padding: 2px 5px; border-radius: 2px; font-weight: bold;');
            console.error('Method:', method);
            console.error('Endpoint:', endpoint);
            console.error('Error:', error);
            console.error('Response:', response);
            console.groupEnd();
        } else if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.log('API Request:', logData);
        }

        // Store in localStorage for debugging
        try {
            const logs = JSON.parse(localStorage.getItem('api_logs') || '[]');
            logs.push(logData);

            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }

            localStorage.setItem('api_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to store API logs:', e.message);
        }
    }

    /**
     * Get API request logs
     * @returns {Array} Array of request logs
     */
    getRequestLogs() {
        return JSON.parse(localStorage.getItem('api_logs') || '[]');
    }

    /**
     * Clear API request logs
     */
    clearRequestLogs() {
        localStorage.removeItem('api_logs');
    }

    /**
     * Build full URL from endpoint
     * @param {string} endpoint - API endpoint
     * @returns {string} Full URL
     */
    buildUrl(endpoint) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        return `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    /**
     * PATCH request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    /**
     * Upload file
     * @param {string} endpoint - API endpoint
     * @param {FormData} formData - Form data with file
     * @param {object} options - Request options
     * @returns {Promise} Response promise
     */
    async upload(endpoint, formData, options = {}) {
        const url = this.buildUrl(endpoint);

        const headers = { ...this.headers };
        delete headers['Content-Type']; // Let browser set multipart boundary

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include',
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new ApiError(data.message || response.statusText, response.status, data);
        }

        return { ok: true, status: response.status, data };
    }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }

    /**
     * Check if error is a network error
     */
    isNetworkError() {
        return this.status === 0 || this.status === 408;
    }

    /**
     * Check if error is an authentication error
     */
    isAuthError() {
        return this.status === 401 || this.status === 403;
    }

    /**
     * Check if error is a validation error
     */
    isValidationError() {
        return this.status === 400 || this.status === 422;
    }

    /**
     * Check if error is a server error
     */
    isServerError() {
        return this.status >= 500;
    }
}

// Default instance
export const apiClient = new ApiClient();

// Helper to get cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export default ApiClient;
