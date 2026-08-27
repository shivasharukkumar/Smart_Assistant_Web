/**
 * Settings Manager - System Preferences, Wi-Fi Configuration & Diagnostics
 */

class SettingsManagerWeb {
    init() {
        // Brightness slider — IDs: settingBrightnessSlider / settingBrightnessLabel
        const bSlider = document.getElementById('settingBrightnessSlider');
        const bLabel = document.getElementById('settingBrightnessLabel');
        if (bSlider) {
            bSlider.addEventListener('input', (e) => {
                if (bLabel) bLabel.textContent = e.target.value;
                // Send live brightness update via WebSocket for real-time feedback
                Connection.sendWs({ type: 'set_brightness', value: parseInt(e.target.value) });
            });
            bSlider.addEventListener('change', (e) => {
                Connection.post('/api/settings', { brightness: parseInt(e.target.value) });
            });
        }

        // Auto-reconnect toggle
        const switchAutoReconnect = document.getElementById('switchAutoReconnect');
        if (switchAutoReconnect) {
            switchAutoReconnect.checked = Connection.autoReconnect;
            switchAutoReconnect.addEventListener('change', (e) => {
                Connection.autoReconnect = e.target.checked;
                localStorage.setItem('esp32_auto_reconnect', e.target.checked);
                App.showToast(`Auto-Reconnect ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }

        // PWA install button
        let deferredInstallPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
        });
        document.getElementById('pwaInstallBtn')?.addEventListener('click', () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
            } else {
                App.showToast('Open in Chrome on Android/Desktop to install as PWA 📲', 'info');
            }
        });

        // Save Wi-Fi Credentials — IDs: settingSsidInput / settingPassInput
        document.getElementById('btnSaveWifi')?.addEventListener('click', () => {
            const ssid = document.getElementById('settingSsidInput')?.value.trim();
            const pass = document.getElementById('settingPassInput')?.value.trim();

            if (!ssid) {
                App.showToast('Please enter a valid Wi-Fi SSID', 'error');
                return;
            }

            Connection.post('/api/settings', {
                wifiSsid: ssid,
                wifiPass: pass
            });

            App.showToast('Wi-Fi credentials updated. ESP32 will reconnect. 📶');
        });

        // Reboot ESP32 — ID: btnRebootEsp
        document.getElementById('btnRebootEsp')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reboot the ESP32?')) {
                Connection.post('/api/restart', {});
                App.showToast('ESP32 Rebooting... 🔄');
            }
        });

        // Factory Reset — ID: btnFactoryReset
        document.getElementById('btnFactoryReset')?.addEventListener('click', () => {
            if (confirm('WARNING: This will wipe all NVS settings, Wi-Fi credentials, and high scores. Proceed?')) {
                Connection.post('/api/factory-reset', {});
                App.showToast('Factory reset initiated. ESP32 rebooting... ⚠️');
            }
        });
    }
}

window.SettingsWeb = new SettingsManagerWeb();
