/**
 * API Client Module
 * 
 * Provides a unified interface for making HTTP requests to the backend API.
 */

export class ApiClient {
    /**
     * Create a new API client instance
     * @param {object} options - Configuration options
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:8000/api';
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
     * Make an HTTP request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request data
     * @param {object} options - Additional options
     * @returns {Promise} Response promise
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = this.buildUrl(endpoint);

        let config = {
            method,
            headers: { ...this.headers, ...options.headers },
            credentials: 'include'
        };

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
            throw error;
        }
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

export default ApiClient;
