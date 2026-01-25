// WebSocket Polyfill - HTTP Long Polling Implementation
class WebSocketPolyfill {
    constructor(url, protocols = []) {
        this.url = url;
        this.protocols = protocols;
        this.readyState = WebSocket.CONNECTING;
        this.onopen = null;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.buffer = [];
        this.pollingInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.lastMessageId = null;
        this.sessionId = null;
        
        this.connect();
    }

    connect() {
        // Create session first
        this.createSession()
            .then(sessionData => {
                this.sessionId = sessionData.session_token;
                this.readyState = WebSocket.OPEN;
                this.onopen?.({ type: 'open' });
                this.startPolling();
            })
            .catch(error => {
                this.readyState = WebSocket.CLOSED;
                this.onerror?.({ type: 'error', error });
            });
    }

    async createSession() {
        const response = await window.app.apiClient.post('/collaboration/sessions', {
            snippet_id: this.extractSnippetId()
        });
        
        if (!response.success) {
            throw new Error(response.message);
        }
        
        return response.data;
    }

    extractSnippetId() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('id')) || null;
    }

    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            this.poll();
        }, 1000); // Poll every second
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async poll() {
        if (this.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const response = await window.app.apiClient.get(`/collaboration/sessions/${this.sessionId}/updates`, {
                since: this.lastMessageId
            });

            if (response.success && response.data.updates) {
                response.data.updates.forEach(update => {
                    this.handleMessage(update);
                });
            }
        } catch (error) {
            console.error('Polling error:', error);
            
            if (error.status === 404) {
                // Session expired, try to reconnect
                this.reconnect();
            }
        }
    }

    handleMessage(update) {
        this.lastMessageId = update.id;
        
        const messageEvent = {
            type: 'message',
            data: JSON.stringify(update)
        };

        this.onmessage?.(messageEvent);
    }

    send(data) {
        if (this.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not open');
        }

        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Send message via HTTP POST
        window.app.apiClient.post(`/collaboration/sessions/${this.sessionId}/updates`, {
            data: payload,
            type: 'message'
        }).catch(error => {
            console.error('Failed to send message:', error);
        });
    }

    close(code = 1000, reason = '') {
        this.readyState = WebSocket.CLOSING;
        this.stopPolling();

        // Close session on server
        if (this.sessionId) {
            window.app.apiClient.delete(`/collaboration/sessions/${this.sessionId}`)
                .finally(() => {
                    this.readyState = WebSocket.CLOSED;
                    this.onclose?.({ type: 'close', code, reason });
                });
        } else {
            this.readyState = WebSocket.CLOSED;
            this.onclose?.({ type: 'close', code, reason });
        }
    }

    reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.readyState = WebSocket.CLOSED;
            this.onerror?.({ type: 'error', error: 'Max reconnect attempts reached' });
            return;
        }

        this.reconnectAttempts++;
        this.readyState = WebSocket.CONNECTING;

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)); // Exponential backoff
    }

    // Method to join a collaboration session
    async joinSession(sessionToken) {
        try {
            const response = await window.app.apiClient.get(`/collaboration/sessions/${sessionToken}`);
            
            if (response.success) {
                this.sessionId = sessionToken;
                this.readyState = WebSocket.OPEN;
                this.onopen?.({ type: 'open' });
                this.startPolling();
                return response.data;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            this.readyState = WebSocket.CLOSED;
            this.onerror?.({ type: 'error', error });
            throw error;
        }
    }

    // Method to update cursor position
    updateCursor(position) {
        if (this.readyState !== WebSocket.OPEN || !this.sessionId) {
            return;
        }

        window.app.apiClient.post(`/collaboration/sessions/${this.sessionId}/updates`, {
            type: 'cursor',
            position: position,
            user_id: window.app.authManager.user.id
        }).catch(error => {
            console.error('Failed to update cursor:', error);
        });
    }

    // Method to get participants
    async getParticipants() {
        if (!this.sessionId) {
            return [];
        }

        try {
            const response = await window.app.apiClient.get(`/collaboration/sessions/${this.sessionId}`);
            return response.success ? response.data.participants : [];
        } catch (error) {
            console.error('Failed to get participants:', error);
            return [];
        }
    }

    // Static method to create WebSocket-like object
    static create(url, protocols) {
        // Check if native WebSocket is available and if the URL is ws:// or wss://
        if (typeof WebSocket !== 'undefined' && (url.startsWith('ws://') || url.startsWith('wss://'))) {
            try {
                return new WebSocket(url, protocols);
            } catch (error) {
                console.warn('Native WebSocket failed, falling back to HTTP long polling:', error);
            }
        }

        // Fall back to our HTTP long polling implementation
        return new WebSocketPolyfill(url, protocols);
    }
}

// Define WebSocket constants
WebSocketPolyfill.CONNECTING = 0;
WebSocketPolyfill.OPEN = 1;
WebSocketPolyfill.CLOSING = 2;
WebSocketPolyfill.CLOSED = 3;

// Auto-replace native WebSocket with our polyfill
if (typeof window !== 'undefined') {
    window.WebSocket = WebSocketPolyfill;
}

// Export for use in other modules
window.WebSocketPolyfill = WebSocketPolyfill;