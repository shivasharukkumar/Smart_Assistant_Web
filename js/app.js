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

        // Initialize subsystems that don't self-initialize
        Dashboard.init();
        FaceStudio.init();
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
