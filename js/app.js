/**
 * Main Application Orchestrator & UI Tab Switcher
 */

class AppController {
    constructor() {
        this.activeTab = 'dashboard';
    }

    init() {
        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                if (targetTab) this.switchTab(targetTab);
            });
        });

        // Initialize all subsystems
        Connection.init();
        Dashboard.init();
        FaceStudio.init();
        PagesManagerInstance.init();
        DrawingStudioInstance.init();
        GameCenterInstance.init();
        NotificationManagerInstance.init();
        SettingsWeb.init();

        console.log('[APP] ESP32 Smart Assistant Web Dashboard initialized.');
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        // Update nav styling
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
        });

        // Show active pane
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-tab`);
        });
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span style="font-size: 1.1rem;">${type === 'error' ? '⚠️' : '✨'}</span>
            <span style="font-size: 0.88rem; font-weight: 500;">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
}

window.App = new AppController();

document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
});
