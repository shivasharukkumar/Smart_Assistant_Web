/**
 * Page Manager - Visual OLED Page Manager with Tactile Cyber Switches
 */

const PAGES_LIST = [
    { id: 'face', name: 'Face & Mood', desc: 'Companion animated physical eye expressions & reactions', icon: 'face' },
    { id: 'clock', name: 'Digital Clock', desc: 'FreeSans NTP synced digital time & calendar date', icon: 'schedule' },
    { id: 'weather', name: 'Live Weather', desc: 'Current city temperature, condition icon & humidity', icon: 'partly_cloudy_day' },
    { id: 'world_clock', name: 'World Clock', desc: 'Dual international timezones (India & Sydney)', icon: 'public' },
    { id: 'forecast', name: '3-Day Forecast', desc: 'Multi-day temperature predictions & mini weather icons', icon: 'calendar_month' },
    { id: 'temperature', name: 'Temperature', desc: 'Environmental thermometer gauge and status', icon: 'device_thermostat' },
    { id: 'humidity', name: 'Humidity', desc: 'Relative humidity droplet percentage meter', icon: 'humidity_mid' },
    { id: 'wifi', name: 'Wi-Fi Status', desc: 'Connected SSID, signal RSSI and MAC address', icon: 'wifi' },
    { id: 'ip', name: 'IP Address', desc: 'Device LAN IP address & API connection details', icon: 'lan' },
    { id: 'system', name: 'System Info', desc: 'ESP32 dual-core CPU, flash & firmware version', icon: 'memory' },
    { id: 'memory', name: 'Memory Usage', desc: 'Real-time Free Heap RAM & allocation monitor', icon: 'storage' },
    { id: 'drawing', name: 'Drawing Canvas', desc: '128x64 custom monochrome bitmap canvas', icon: 'draw' },
    { id: 'game_center', name: 'Game Center', desc: '6 interactive retro arcade games hub', icon: 'sports_esports' },
    { id: 'message', name: 'Custom Message', desc: 'Marquee scrolling banner announcement', icon: 'campaign' },
    { id: 'spotify', name: 'Spotify Music', desc: 'Now playing song, artist, progress & animated equalizer', icon: 'graphic_eq' },
    { id: 'settings', name: 'System Settings', desc: 'Brightness, sound, and rotation settings', icon: 'tune' }
];

class PageController {
    constructor() {
        this.activePage = localStorage.getItem('esp32_active_page') || 'face';
        this.autoRotate = localStorage.getItem('esp32_auto_rotate') === 'true';
        this.rotateInterval = parseInt(localStorage.getItem('esp32_rotate_interval') || '8');
        this.pageEnabledStates = {};
        
        try {
            const saved = localStorage.getItem('esp32_page_enabled_states');
            if (saved) this.pageEnabledStates = JSON.parse(saved);
        } catch (e) {}

        PAGES_LIST.forEach(p => {
            if (this.pageEnabledStates[p.id] === undefined) {
                this.pageEnabledStates[p.id] = true;
            }
        });

        this.grid = document.getElementById('pagesGrid');
        this.switchAutoRotate = document.getElementById('switchPageAutoRotate');
        this.intervalSlider = document.getElementById('pageIntervalSlider');
        this.intervalLabel = document.getElementById('pageIntervalLabel');
    }

    init() {
        this.renderPagesGrid();
        this.bindEvents();

        // Listen for telemetry
        Connection.on('telemetry', (data) => {
            if (data.page && data.page !== this.activePage) {
                this.activePage = data.page;
                this.updateActiveBadge();
            }
            if (data.autoRotate !== undefined) {
                this.autoRotate = data.autoRotate;
                if (this.switchAutoRotate) this.switchAutoRotate.checked = this.autoRotate;
                const dashSwitch = document.getElementById('switchAutoRotate');
                if (dashSwitch) dashSwitch.checked = this.autoRotate;
            }
        });
    }

    renderPagesGrid() {
        if (!this.grid) return;
        this.grid.innerHTML = '';

        PAGES_LIST.forEach((page) => {
            const isCurrent = page.id === this.activePage;
            const isEnabled = this.pageEnabledStates[page.id] !== false;

            const card = document.createElement('div');
            card.className = `page-item-card ${isCurrent ? 'current-active' : ''}`;
            card.id = `pageCard_${page.id}`;

            card.innerHTML = `
                <div class="page-item-top">
                    <div class="page-item-title">
                        <span class="material-symbols-outlined" style="font-size: 20px; color: var(--color-midnight);">${page.icon}</span>
                        <span>${page.name}</span>
                    </div>
                    <label class="cyber-switch" title="Toggle page in auto-rotation">
                        <input type="checkbox" class="page-enable-switch" data-page="${page.id}" ${isEnabled ? 'checked' : ''}>
                        <span class="switch-slider"></span>
                    </label>
                </div>
                <div class="page-item-desc">${page.desc}</div>
                <div class="page-item-actions">
                    <span class="status-badge ${isCurrent ? 'connected' : ''}" id="pageStatusBadge_${page.id}" style="font-size: 0.72rem;">
                        ${isCurrent ? 'ACTIVE ON OLED' : 'Standby'}
                    </span>
                    <button class="btn btn-secondary activate-page-btn" data-page="${page.id}" style="padding: 5px 12px; font-size: 0.78rem;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">play_arrow</span> Activate
                    </button>
                </div>
            `;

            // Switch toggle event
            const toggle = card.querySelector('.page-enable-switch');
            toggle.addEventListener('change', (e) => {
                this.pageEnabledStates[page.id] = e.target.checked;
                localStorage.setItem('esp32_page_enabled_states', JSON.stringify(this.pageEnabledStates));
                App.showToast(`${page.name} ${e.target.checked ? 'Enabled' : 'Disabled'}`, 'info');
            });

            // Activate button event
            const btn = card.querySelector('.activate-page-btn');
            btn.addEventListener('click', () => {
                this.activatePage(page.id);
            });

            this.grid.appendChild(card);
        });
    }

    bindEvents() {
        if (this.switchAutoRotate) {
            this.switchAutoRotate.checked = this.autoRotate;
            this.switchAutoRotate.addEventListener('change', (e) => {
                this.setAutoRotate(e.target.checked);
            });
        }

        if (this.intervalSlider && this.intervalLabel) {
            this.intervalSlider.value = this.rotateInterval;
            this.intervalLabel.textContent = `${this.rotateInterval}s`;
            this.intervalSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                this.rotateInterval = parseInt(val);
                this.intervalLabel.textContent = `${val}s`;
                localStorage.setItem('esp32_rotate_interval', val);
            });

            this.intervalSlider.addEventListener('change', () => {
                if (this.autoRotate) {
                    this.setAutoRotate(true);
                }
            });
        }
    }

    activatePage(pageId) {
        this.activePage = pageId;
        localStorage.setItem('esp32_active_page', pageId);
        this.updateActiveBadge();

        Connection.sendWs({
            type: 'set_page',
            page: pageId
        });

        Connection.post('/api/page', {
            page: pageId
        });

        App.showToast(`OLED switched to ${pageId.toUpperCase()}`, 'success');
    }

    setAutoRotate(enabled) {
        this.autoRotate = enabled;
        localStorage.setItem('esp32_auto_rotate', enabled);
        if (this.switchAutoRotate) this.switchAutoRotate.checked = enabled;
        const dashSwitch = document.getElementById('switchAutoRotate');
        if (dashSwitch) dashSwitch.checked = enabled;

        Connection.post('/api/page', {
            autoRotate: enabled,
            interval: this.rotateInterval * 1000
        });

        App.showToast(`Auto-Rotate ${enabled ? 'ENABLED' : 'DISABLED'}`, 'info');
    }

    updateActiveBadge() {
        PAGES_LIST.forEach((p) => {
            const card = document.getElementById(`pageCard_${p.id}`);
            const badge = document.getElementById(`pageStatusBadge_${p.id}`);
            if (card && badge) {
                if (p.id === this.activePage) {
                    card.classList.add('current-active');
                    badge.className = 'status-badge connected';
                    badge.textContent = 'ACTIVE ON OLED';
                } else {
                    card.classList.remove('current-active');
                    badge.className = 'status-badge';
                    badge.textContent = 'Standby';
                }
            }
        });

        const oledBadge = document.getElementById('oledPageBadge');
        if (oledBadge) {
            oledBadge.textContent = `Page: ${this.activePage.toUpperCase()}`;
        }
    }

    prevPage() {
        const ids = PAGES_LIST.map(p => p.id);
        const enabledIds = ids.filter(id => this.pageEnabledStates[id] !== false);
        if (enabledIds.length === 0) return;
        const idx = enabledIds.indexOf(this.activePage);
        const prevId = enabledIds[(idx - 1 + enabledIds.length) % enabledIds.length];
        this.activatePage(prevId);
    }

    nextPage() {
        const ids = PAGES_LIST.map(p => p.id);
        const enabledIds = ids.filter(id => this.pageEnabledStates[id] !== false);
        if (enabledIds.length === 0) return;
        const idx = enabledIds.indexOf(this.activePage);
        const nextId = enabledIds[(idx + 1) % enabledIds.length];
        this.activatePage(nextId);
    }
}

// Export as both names so any caller works
window.Pages = new PageController();
window.PagesManagerInstance = window.Pages;
document.addEventListener('DOMContentLoaded', () => window.Pages.init());
