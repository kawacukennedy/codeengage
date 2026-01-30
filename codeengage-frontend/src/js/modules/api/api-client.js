// API Client - Axios-like wrapper
class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.authToken = null;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            this.defaultHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.defaultHeaders['Authorization'];
        }
    }

    async request(method, endpoint, data = null, config = {}) {
        const url = this.buildUrl(endpoint);
        const options = {
            method,
            headers: { ...this.defaultHeaders, ...config.headers },
            ...config
        };

        // Add CSRF Token from cookie
        const csrfToken = this.getCookie('XSRF-TOKEN');
        if (csrfToken) {
            options.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
        }

        if (data) {
            if (data instanceof FormData) {
                options.body = data;
                delete options.headers['Content-Type']; // Let browser set multipart/form-data boundary
            } else {
                options.body = JSON.stringify(data);
            }
        }

        try {
            const response = await fetch(url, options);
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            const responseData = isJson ? await response.json() : await response.text();

            if (!response.ok) {
                const error = new Error(responseData.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = responseData;
                throw error;
            }

            return responseData;
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new Error('Network error - please check your connection');
                networkError.status = 0;
                throw networkError;
            }
            throw error;
        }
    }

    buildUrl(endpoint) {
        // Remove leading slash and append to base URL
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        return `${this.baseUrl}/${cleanEndpoint}`;
    }

    // HTTP methods
    async get(endpoint, params = {}, config = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request('GET', url, null, config);
    }

    async post(endpoint, data = {}, config = {}) {
        return this.request('POST', endpoint, data, config);
    }

    async put(endpoint, data = {}, config = {}) {
        return this.request('PUT', endpoint, data, config);
    }

    async patch(endpoint, data = {}, config = {}) {
        return this.request('PATCH', endpoint, data, config);
    }

    async delete(endpoint, config = {}) {
        return this.request('DELETE', endpoint, null, config);
    }

    // File upload
    async upload(endpoint, file, additionalData = {}, config = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Add additional form data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request('POST', endpoint, formData, {
            ...config,
            headers: {} // Don't set Content-Type for FormData
        });
    }

    // Batch operations
    async batch(requests) {
        return Promise.allSettled(
            requests.map(req => {
                const { method, endpoint, data } = req;
                return this[method.toLowerCase()](endpoint, data);
            })
        );
    }

    // Interceptors
    addRequestInterceptor(interceptor) {
        // Store interceptors to be called before each request
        this.requestInterceptor = interceptor;
    }

    addResponseInterceptor(interceptor) {
        // Store interceptors to be called after each response
        this.responseInterceptor = interceptor;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }
}

// Export for use in other modules
window.ApiClient = ApiClient;