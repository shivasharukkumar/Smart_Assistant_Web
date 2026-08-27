/**
 * Dashboard View - Live OLED simulation mirror, telemetry metrics, and quick companion triggers
 */

class DashboardManager {
    constructor() {
        this.canvas = document.getElementById('oledMirrorCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.currentFace = 'happy';
        this.currentPage = 'face';
        this.frameCounter = 0;
        this.animInterval = null;
    }

    init() {
        if (!this.canvas || !this.ctx) return;

        // Register telemetry listener
        Connection.on('telemetry', (data) => this.updateTelemetry(data));

        // Prev / Next / Home buttons
        document.getElementById('btnOledPrev')?.addEventListener('click', () => {
            Connection.post('/api/page', { page: 'prev' });
            if (window.Pages) Pages.prevPage();
        });

        document.getElementById('btnOledNext')?.addEventListener('click', () => {
            Connection.post('/api/page', { page: 'next' });
            if (window.Pages) Pages.nextPage();
        });

        document.getElementById('btnOledHome')?.addEventListener('click', () => {
            Connection.post('/api/page', { page: 'face' });
            this.currentPage = 'face';
            this.updateBadges();
        });

        // Quick mood buttons — class="quick-mood-btn" data-mood="..."
        document.querySelectorAll('.quick-mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const face = btn.getAttribute('data-mood');
                if (face) {
                    Connection.sendWs({ type: 'set_face', face: face });
                    Connection.post('/api/face', { face: face });
                    this.currentFace = face;
                    this.updateBadges();
                    App.showToast(`Assistant Face: ${face.toUpperCase()}`);
                }
            });
        });

        // Start 30 FPS OLED simulation canvas rendering loop
        this.startMirrorLoop();
    }

    updateTelemetry(data) {
        if (!data) return;

        if (data.face) this.currentFace = data.face;
        if (data.page) this.currentPage = data.page;

        // Update DOM elements — IDs match index.html
        const statGame = document.getElementById('statGame');
        if (statGame) statGame.textContent = data.game ? data.game.toUpperCase() : 'None';

        const statUptime = document.getElementById('statUptime');
        if (statUptime && data.uptime !== undefined) {
            const h = Math.floor(data.uptime / 3600);
            const m = Math.floor((data.uptime % 3600) / 60);
            const s = data.uptime % 60;
            statUptime.textContent = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
        }

        const statHeap = document.getElementById('statHeap');
        if (statHeap && data.heap !== undefined) {
            statHeap.textContent = `${(data.heap / 1024).toFixed(1)} KB`;
        }

        const statTemp = document.getElementById('statTemp');
        if (statTemp && data.temp !== undefined) {
            statTemp.textContent = `${parseFloat(data.temp).toFixed(1)} °C`;
        }

        const statHum = document.getElementById('statHum');
        if (statHum && data.hum !== undefined) {
            statHum.textContent = `${parseFloat(data.hum).toFixed(1)} %`;
        }

        const statRssi = document.getElementById('statRssi');
        if (statRssi && data.rssi !== undefined) {
            statRssi.textContent = `${data.rssi} dBm`;
        }

        this.updateBadges();
    }

    updateBadges() {
        const pageBadge = document.getElementById('oledPageBadge');
        if (pageBadge) pageBadge.textContent = `Page: ${this.currentPage.toUpperCase()}`;

        const faceBadge = document.getElementById('activeFaceNameBadge');
        if (faceBadge) faceBadge.textContent = this.currentFace.toUpperCase();
    }

    startMirrorLoop() {
        if (this.animInterval) clearInterval(this.animInterval);
        this.animInterval = setInterval(() => {
            this.frameCounter++;
            this.renderMirrorCanvas();
        }, 33);
    }

    renderMirrorCanvas() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#05080f';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;

        if (this.currentPage === 'face') {
            FaceRenderer.drawFace(ctx, this.currentFace, this.frameCounter);
        } else if (this.currentPage === 'clock') {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(timeStr, 64, 36);
            ctx.strokeRect(8, 48, 112, 6);
            ctx.fillRect(10, 50, (now.getSeconds() * 108) / 60, 2);
        } else if (this.currentPage === 'temperature') {
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TEMP: 24.5 C', 64, 34);
            ctx.strokeRect(14, 46, 100, 8);
            ctx.fillRect(16, 48, 50, 4);
        } else if (this.currentPage === 'drawing') {
            if (window.DrawingStudioInstance) {
                ctx.drawImage(window.DrawingStudioInstance.canvas, 0, 0, 128, 64);
            }
        } else {
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`PAGE: ${this.currentPage.toUpperCase()}`, 64, 34);
        }
    }
}

window.Dashboard = new DashboardManager();
