const { WebSocketServer } = require('ws');
const url = require('url');

/**
 * Initializes the WebSocket server and attaches it to the provided HTTP server.
 * @param {import('http').Server} server 
 */
function initWebSocket(server) {
    const wss = new WebSocketServer({ noServer: true });

    // Manage rooms: { [session_token]: Set<WebSocket> }
    const rooms = new Map();

    server.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url).pathname;

        /**
         * Real-time collaboration endpoint pattern: /collaboration/[session_token]
         */
        const match = pathname.match(/^\/collaboration\/([^/]+)$/);

        if (match) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.sessionToken = match[1];
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', (ws) => {
        const token = ws.sessionToken;
        console.log(`[WS] New connection for session: ${token}`);

        if (!rooms.has(token)) {
            rooms.set(token, new Set());
        }
        rooms.get(token).add(ws);

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);

                /**
                 * Broadcasts incoming messages to all other clients joined in the same session room.
                 * Includes a server-side timestamp for synchronization.
                 */
                const room = rooms.get(token);
                if (room) {
                    const broadcastData = JSON.stringify({
                        ...message,
                        timestamp: new Date().toISOString()
                    });

                    room.forEach((client) => {
                        if (client !== ws && client.readyState === 1) { // 1 = OPEN
                            client.send(broadcastData);
                        }
                    });
                }
            } catch (err) {
                console.error('[WS] Error parsing message:', err);
            }
        });

        ws.on('close', () => {
            console.log(`[WS] Connection closed for session: ${token}`);
            const room = rooms.get(token);
            if (room) {
                room.delete(ws);
                if (room.size === 0) {
                    rooms.delete(token);
                }
            }
        });

        // Send confirmation
        ws.send(JSON.stringify({ type: 'sys', message: 'Connected to Sunder Neural Sync' }));
    });

    return wss;
}

module.exports = { initWebSocket };
