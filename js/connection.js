/**
 * Connection Manager - Handles REST API requests and real-time WebSocket communication
 * Supports Local LAN IP and Worldwide Cloud Tunnels (HTTPS / WSS)
 */

class ConnectionManager {
    constructor() {
        this.ip = localStorage.getItem('esp32_assistant_ip') || '192.168.1.105';
        this.mode = localStorage.getItem('esp32_conn_mode') || 'lan'; // 'lan' | 'cloud'
        this.autoReconnect = localStorage.getItem('esp32_auto_reconnect') !== 'false';
        this.ws = null;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.lastPingSent = 0;
        this.listeners = new Map();

        // UI Element references
        this.ipInput = document.getElementById('esp32IpInput');
        this.connectBtn = document.getElementById('connectBtn');
        this.statusBadge = document.getElementById('connectionStatus');
        this.statusText = document.getElementById('statusText');
        this.modeLanBtn = document.getElementById('modeLanBtn');
        this.modeCloudBtn = document.getElementById('modeCloudBtn');
        this.cloudGuideBtn = document.getElementById('cloudGuideBtn');
    }

    init() {
        if (this.ipInput) {
            this.ipInput.value = this.ip;
        }

        if (this.modeLanBtn && this.modeCloudBtn) {
            this.updateModeButtons();
            this.modeLanBtn.addEventListener('click', () => {
                this.mode = 'lan';
                localStorage.setItem('esp32_conn_mode', 'lan');
                this.updateModeButtons();
                if (!this.ip.includes('.') || this.ip.startsWith('http')) {
                    this.ip = '192.168.1.105';
                    this.ipInput.value = this.ip;
                }
            });

            this.modeCloudBtn.addEventListener('click', () => {
                this.mode = 'cloud';
                localStorage.setItem('esp32_conn_mode', 'cloud');
                this.updateModeButtons();
                if (!this.ip.startsWith('http')) {
                    this.ipInput.placeholder = 'https://xxxx.ngrok-free.app';
                }
            });
        }

        if (this.cloudGuideBtn) {
            this.cloudGuideBtn.addEventListener('click', () => {
                const modal = document.getElementById('cloudModal');
                if (modal) modal.classList.add('open');
            });
        }

        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => {
                const targetIp = this.ipInput.value.trim();
                if (targetIp) {
                    this.ip = targetIp;
                    localStorage.setItem('esp32_assistant_ip', this.ip);
                    this.connect();
                }
            });
        }

        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch((err) => {
                console.log('[PWA] ServiceWorker registration failed:', err);
            });
        }

        // Auto-connect on page load
        this.connect();
    }

    updateModeButtons() {
        if (!this.modeLanBtn || !this.modeCloudBtn) return;
        if (this.mode === 'lan') {
            this.modeLanBtn.classList.add('active');
            this.modeCloudBtn.classList.remove('active');
            this.ipInput.placeholder = '192.168.1.105';
        } else {
            this.modeCloudBtn.classList.add('active');
            this.modeLanBtn.classList.remove('active');
            this.ipInput.placeholder = 'https://xxxx.ngrok-free.app';
        }
    }

    getBaseUrl() {
        let clean = this.ip.trim();
        if (clean.startsWith('http://') || clean.startsWith('https://')) {
            return clean.replace(/\/$/, '');
        }
        return `http://${clean}`;
    }

    getWsUrl() {
        let clean = this.ip.trim();
        if (clean.startsWith('https://')) {
            return clean.replace('https://', 'wss://').replace(/\/$/, '');
        }
        if (clean.startsWith('http://')) {
            return clean.replace('http://', 'ws://').replace(/\/$/, '') + ':81';
        }
        return `ws://${clean}:81/`;
    }

    connect() {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.updateStatus('connecting', 'Connecting...');

        try {
            const wsUrl = this.getWsUrl();
            console.log('[WS] Connecting to:', wsUrl);
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                this.updateStatus('connected', 'Connected');
                this.startPingHeartbeat();
                this.emit('connected', { ip: this.ip });
                this.fetchStatus();
                if (window.App) App.showToast('Connected to ESP32 Assistant!', 'success');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') {
                        const latency = Date.now() - this.lastPingSent;
                        const pingEl = document.getElementById('statPing');
                        if (pingEl) pingEl.textContent = `${latency} ms`;
                    } else if (data.type === 'telemetry') {
                        this.emit('telemetry', data);
                    } else if (data.type === 'event') {
                        this.emit(data.event, data.data);
                    }
                } catch (e) {
                    console.error('[WS] Parse error:', e);
                }
            };

            this.ws.onerror = (err) => {
                console.warn('[WS] Error:', err);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.updateStatus('disconnected', 'Disconnected');
                this.stopPingHeartbeat();
                this.emit('disconnected', {});

                if (this.autoReconnect) {
                    this.reconnectTimer = setTimeout(() => {
                        this.connect();
                    }, 4000);
                }
            };
        } catch (err) {
            console.error('[WS] Initialization failed:', err);
            this.updateStatus('disconnected', 'Error');
        }
    }

    startPingHeartbeat() {
        this.stopPingHeartbeat();
        this.pingTimer = setInterval(() => {
            if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.lastPingSent = Date.now();
                this.sendWs({ type: 'ping' });
            }
        }, 3000);
    }

    stopPingHeartbeat() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    updateStatus(state, text) {
        if (!this.statusBadge || !this.statusText) return;
        this.statusBadge.className = `status-badge ${state}`;
        this.statusText.textContent = text;
    }

    sendWs(data) {
        if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
        }
        return false;
    }

    async post(endpoint, body) {
        try {
            const url = `${this.getBaseUrl()}${endpoint}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (err) {
            console.warn(`[REST] POST ${endpoint} failed:`, err);
            return null;
        }
    }

    async get(endpoint) {
        try {
            const url = `${this.getBaseUrl()}${endpoint}`;
            const res = await fetch(url);
            return await res.json();
        } catch (err) {
            console.warn(`[REST] GET ${endpoint} failed:`, err);
            return null;
        }
    }

    async fetchStatus() {
        const data = await this.get('/api/status');
        if (data) this.emit('status', data);
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try { cb(data); } catch (e) { console.error(e); }
            });
        }
    }
}

window.Connection = new ConnectionManager();
document.addEventListener('DOMContentLoaded', () => window.Connection.init());
