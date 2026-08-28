/**
 * Main Application Orchestrator & UI Tab Switcher
 */

class AppController {
    constructor() {
        this.activeTab = 'dashboard';
    }

    init() {
        const nav = document.querySelector('.app-nav');
        if (nav) {
            nav.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    nav.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }

        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                if (targetTab) this.switchTab(targetTab);
            });
        });

        // Initialize subsystems safely with individual error boundaries
        const subsystems = [
            { name: 'Dashboard', init: () => window.Dashboard?.init() },
            { name: 'FaceStudio', init: () => window.FaceStudio?.init() },
            { name: 'Pages', init: () => window.Pages?.init() },
            { name: 'DrawingStudio', init: () => window.DrawingStudio?.init() },
            { name: 'GameCenter', init: () => window.GameCenter?.init() },
            { name: 'Spotify', init: () => window.Spotify?.init() },
            { name: 'Pet', init: () => window.Pet?.init() },
            { name: 'PcMonitor', init: () => window.PcMonitor?.init() },
            { name: 'Animator', init: () => window.Animator?.init() },
            { name: 'Jukebox', init: () => window.Jukebox?.init() },
            { name: 'Notifications', init: () => window.Notifications?.init() },
            { name: 'Settings', init: () => window.Settings?.init() }
        ];

        subsystems.forEach(sub => {
            try {
                if (typeof sub.init === 'function') sub.init();
            } catch (err) {
                console.warn(`[APP] Error initializing ${sub.name}:`, err);
            }
        });

        console.log('[APP] ESP32 Smart Assistant Web Dashboard fully initialized.');
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        // Auto-exit active arcade game when navigating away from Game Center
        if (tabId !== 'games' && window.GameCenter && window.GameCenter.activeGame !== 'none') {
            Connection.sendWs({ type: 'game_input', action: 'EXIT' });
            Connection.post('/api/game/exit', {});
            window.GameCenter.activeGame = 'none';
            window.GameCenter.updateControllerLayout();
            document.querySelectorAll('.game-tile').forEach(tile => tile.classList.remove('active-game'));
        }

        // Auto-sync OLED page on primary tab selection
        if (tabId === 'drawing') {
            Connection.sendWs({ type: 'set_page', page: 'drawing' });
            Connection.post('/api/page', { page: 'drawing' });
        } else if (tabId === 'faces') {
            Connection.sendWs({ type: 'set_page', page: 'face' });
            Connection.post('/api/page', { page: 'face' });
        } else if (tabId === 'pet') {
            Connection.sendWs({ type: 'set_page', page: 'pet' });
            Connection.post('/api/page', { page: 'pet' });
        } else if (tabId === 'pc_monitor') {
            Connection.sendWs({ type: 'set_page', page: 'pc_monitor' });
            Connection.post('/api/page', { page: 'pc_monitor' });
            if (window.PcMonitor) window.PcMonitor.syncToEsp32(true);
        } else if (tabId === 'spotify') {
            Connection.sendWs({ type: 'set_page', page: 'spotify' });
            Connection.post('/api/page', { page: 'spotify' });
            if (window.Spotify) window.Spotify.syncToEsp32();
        }

        // Update nav styling & scroll tab into view
        document.querySelectorAll('.nav-tab').forEach(t => {
            const isActive = t.getAttribute('data-tab') === tabId;
            t.classList.toggle('active', isActive);
            if (isActive) {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        // Show active pane
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-tab`);
        });
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        // Limit concurrent toasts so they never block or overlap the screen
        while (container.children.length >= 3) {
            container.removeChild(container.firstChild);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 18px; color: ${type === 'error' ? 'var(--status-rose)' : 'var(--color-sage)'};">${type === 'error' ? 'error' : 'check_circle'}</span>
            <span style="font-size: 0.85rem; font-weight: 500; line-height: 1.3;">${message}</span>
        `;

        const dismiss = () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 250);
        };

        // Click to dismiss immediately
        toast.addEventListener('click', dismiss);
        container.appendChild(toast);

        setTimeout(dismiss, 2800);
    }
}

window.App = new AppController();

document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});
