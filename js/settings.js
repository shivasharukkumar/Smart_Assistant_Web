/**
 * Settings Manager - System Preferences, Wi-Fi Configuration & Diagnostics
 */

class SettingsManagerWeb {
    init() {
        // Brightness slider
        const bSlider = document.getElementById('settingBrightness');
        const bLabel = document.getElementById('valBrightness');
        if (bSlider) {
            bSlider.addEventListener('input', (e) => {
                if (bLabel) bLabel.textContent = e.target.value;
            });
        }

        // Save Display & Audio Settings
        document.getElementById('btnSaveDisplaySettings')?.addEventListener('click', () => {
            const brightness = parseInt(document.getElementById('settingBrightness')?.value || '255');
            const sound = document.getElementById('settingSound')?.checked || false;

            Connection.apiPost('/api/settings', {
                brightness: brightness,
                sound: sound
            });

            App.showToast('Display & Audio settings saved! 💾');
        });

        // Save Wi-Fi Credentials
        document.getElementById('btnSaveWifi')?.addEventListener('click', () => {
            const ssid = document.getElementById('settingSsid')?.value.trim();
            const pass = document.getElementById('settingPass')?.value.trim();

            if (!ssid) {
                App.showToast('Please enter a valid Wi-Fi SSID', 'error');
                return;
            }

            Connection.apiPost('/api/settings', {
                wifiSsid: ssid,
                wifiPass: pass
            });

            App.showToast('Wi-Fi credentials updated. ESP32 will reconnect.');
        });

        // Restart ESP32
        document.getElementById('btnRestartEsp')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reboot the ESP32?')) {
                Connection.apiPost('/api/restart', {});
                App.showToast('ESP32 Rebooting... 🔄');
            }
        });

        // Reset High Scores
        document.getElementById('btnResetHighScores')?.addEventListener('click', () => {
            if (confirm('Reset all saved game high scores?')) {
                Connection.apiPost('/api/settings', { resetScores: true });
                App.showToast('High scores cleared.');
            }
        });

        // Factory Reset
        document.getElementById('btnFactoryReset')?.addEventListener('click', () => {
            if (confirm('WARNING: This will wipe all NVS settings, Wi-Fi credentials, and high scores. Proceed?')) {
                Connection.apiPost('/api/factory-reset', {});
                App.showToast('Factory reset complete. Rebooting...');
            }
        });
    }
}

window.SettingsWeb = new SettingsManagerWeb();
