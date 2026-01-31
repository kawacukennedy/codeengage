/**
 * Async Error Boundary Wrapper
 * 
 * Provides error boundary functionality for async operations and promises
 */

export class AsyncErrorBoundary {
    constructor(options = {}) {
        this.onError = options.onError || this.defaultErrorHandler;
        this.onRecover = options.onRecover || null;
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 30000;
    }

    /**
     * Wrap an async function with error boundary
     * @param {Function} fn - Async function to wrap
     * @param {object} context - Context for error reporting
     * @returns {Function} Wrapped function
     */
    wrap(fn, context = {}) {
        return async (...args) => {
            try {
                const result = await fn(...args);
                
                if (this.onSuccess) {
                    this.onSuccess(result, context);
                }
                
                return result;
            } catch (error) {
                return await this.handleError(error, context, fn, args);
            }
        };
    }

    /**
     * Wrap a promise with error boundary
     * @param {Promise} promise - Promise to wrap
     * @param {object} context - Context for error reporting
     * @returns {Promise} Wrapped promise
     */
    wrapPromise(promise, context = {}) {
        return promise
            .then(result => {
                if (this.onSuccess) {
                    this.onSuccess(result, context);
                }
                return result;
            })
            .catch(error => this.handleError(error, context));
    }

    /**
     * Handle error with recovery logic
     * @param {Error} error - The error that occurred
     * @param {object} context - Error context
     * @param {Function} originalFn - Original function that failed
     * @param {Array} args - Arguments to original function
     * @returns {Promise} Recovery result or re-throw
     */
    async handleError(error, context, originalFn = null, args = []) {
        // Log the error
        this.logError(error, context);

        // Call custom error handler
        this.onError(error, context);

        // Try recovery if possible
        if (this.onRecover && originalFn) {
            try {
                const recovery = await this.onRecover(error, context, originalFn, args);
                
                if (recovery.shouldRetry && recovery.retryDelay) {
                    await this.delay(recovery.retryDelay);
                    
                    if (recovery.retryCount < this.maxRetries) {
                        return await this.handleError(
                            error, 
                            { ...context, retryCount: (context.retryCount || 0) + 1 }, 
                            originalFn, 
                            args
                        );
                    }
                }
                
                if (recovery.fallbackResult !== undefined) {
                    return recovery.fallbackResult;
                }
            } catch (recoveryError) {
                this.logError(recoveryError, { ...context, context: 'recovery_failed' });
            }
        }

        // Re-throw if no recovery
        throw error;
    }

    /**
     * Default error handler
     * @param {Error} error - The error
     * @param {object} context - Error context
     */
    defaultErrorHandler(error, context) {
        console.error('Async Error Boundary caught error:', {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context
        });

        // Report to global error handler if available
        if (window.app && window.app.handleGlobalError) {
            window.app.handleGlobalError(error, {
                ...context,
                type: 'async_error_boundary'
            });
        }
    }

    /**
     * Log error with enhanced context
     * @param {Error} error - The error
     * @param {object} context - Error context
     */
    logError(error, context) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            context
        };

        // Store in localStorage for debugging
        const errors = JSON.parse(localStorage.getItem('async_errors') || '[]');
        errors.push(errorData);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        localStorage.setItem('async_errors', JSON.stringify(errors));

        // Send to error reporting service if available
        if (window.app && window.app.reportError) {
            window.app.reportError(error, context);
        }
    }

    /**
     * Create a timeout wrapper
     * @param {Promise} promise - Promise to wrap
     * @param {number} timeout - Timeout in milliseconds
     * @param {string} timeoutMessage - Custom timeout message
     * @returns {Promise} Promise with timeout
     */
    withTimeout(promise, timeout = this.timeout, timeoutMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(timeoutMessage));
                }, timeout);
            })
        ]);
    }

    /**
     * Batch process with error isolation
     * @param {Array} items - Items to process
     * @param {Function} processor - Processing function
     * @param {object} options - Batch options
     * @returns {Promise} Processing results
     */
    async batchProcess(items, processor, options = {}) {
        const {
            concurrency = 1,
            stopOnError = false,
            collectErrors = true
        } = options;

        const results = [];
        const errors = [];
        
        if (concurrency === 1) {
            // Sequential processing
            for (let i = 0; i < items.length; i++) {
                try {
                    const result = await this.wrap(
                        processor, 
                        { itemType: 'batch_item', index: i }
                    )(items[i], i);
                    results.push({ success: true, data: result, index: i });
                } catch (error) {
                    const errorInfo = { success: false, error, index: i };
                    
                    if (collectErrors) {
                        errors.push(errorInfo);
                    }
                    
                    results.push(errorInfo);
                    
                    if (stopOnError) {
                        break;
                    }
                }
            }
        } else {
            // Concurrent processing with semaphore
            const semaphore = new Array(concurrency).fill(null);
            let current = 0;
            
            const promises = items.map(async (item, index) => {
                // Wait for available slot
                await new Promise(resolve => {
                    const checkSlot = () => {
                        const slotIndex = semaphore.findIndex(slot => slot === null);
                        if (slotIndex !== -1) {
                            semaphore[slotIndex] = true;
                            resolve();
                        } else {
                            setTimeout(checkSlot, 10);
                        }
                    };
                    checkSlot();
                });
                
                try {
                    const result = await this.wrap(
                        processor, 
                        { itemType: 'batch_item', index: i, concurrent: true }
                    )(item, index);
                    
                    // Free the slot
                    const slotIndex = semaphore.findIndex(slot => slot === true);
                    semaphore[slotIndex] = null;
                    
                    return { success: true, data: result, index };
                } catch (error) {
                    // Free the slot
                    const slotIndex = semaphore.findIndex(slot => slot === true);
                    semaphore[slotIndex] = null;
                    
                    const errorInfo = { success: false, error, index };
                    
                    if (collectErrors) {
                        errors.push(errorInfo);
                    }
                    
                    return errorInfo;
                }
            });
            
            const concurrentResults = await Promise.all(promises);
            results.push(...concurrentResults);
        }
        
        return {
            results,
            errors,
            successCount: results.filter(r => r.success).length,
            errorCount: results.filter(r => !r.success).length
        };
    }

    /**
     * Retry with exponential backoff
     * @param {Function} fn - Function to retry
     * @param {object} options - Retry options
     * @returns {Promise} Result
     */
    async retry(fn, options = {}) {
        const {
            maxRetries = this.maxRetries,
            baseDelay = 1000,
            maxDelay = 30000,
            backoffFactor = 2,
            jitter = true
        } = options;

        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break; // Don't wait after last attempt
                }
                
                const delay = Math.min(
                    baseDelay * Math.pow(backoffFactor, attempt),
                    maxDelay
                );
                
                const jitterAmount = jitter ? delay * 0.1 * Math.random() : 0;
                const finalDelay = delay + jitterAmount;
                
                console.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${finalDelay}ms:`, error.message);
                
                await this.delay(finalDelay);
            }
        }
        
        throw lastError;
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get stored async errors
     * @returns {Array} Array of stored errors
     */
    getStoredErrors() {
        return JSON.parse(localStorage.getItem('async_errors') || '[]');
    }

    /**
     * Clear stored async errors
     */
    clearStoredErrors() {
        localStorage.removeItem('async_errors');
    }

    /**
     * Get error statistics
     * @returns {object} Error statistics
     */
    getErrorStats() {
        const errors = this.getStoredErrors();
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const lastHour = errors.filter(e => new Date(e.timestamp).getTime() > oneHourAgo);
        const lastDay = errors.filter(e => new Date(e.timestamp).getTime() > oneDayAgo);
        
        return {
            total: errors.length,
            lastHour: lastHour.length,
            lastDay: lastDay.length,
            byType: this.groupErrorsByType(errors),
            recent: errors.slice(-10).reverse()
        };
    }

    /**
     * Group errors by type
     * @param {Array} errors - Array of errors
     * @returns {object} Grouped errors
     */
    groupErrorsByType(errors) {
        return errors.reduce((groups, error) => {
            const type = error.context?.type || error.name || 'unknown';
            groups[type] = (groups[type] || 0) + 1;
            return groups;
        }, {});
    }
}