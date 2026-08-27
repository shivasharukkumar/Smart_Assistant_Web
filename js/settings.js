/**
 * Settings Manager - System Preferences, Wi-Fi Configuration & Hardware Sensors / Buzzer Studio
 */

class SettingsManagerWeb {
    init() {
        // Brightness slider — IDs: settingBrightnessSlider / settingBrightnessLabel
        const bSlider = document.getElementById('settingBrightnessSlider');
        const bLabel = document.getElementById('settingBrightnessLabel');
        if (bSlider) {
            bSlider.addEventListener('input', (e) => {
                if (bLabel) bLabel.textContent = e.target.value;
                Connection.sendWs({ type: 'set_brightness', value: parseInt(e.target.value) });
            });
            bSlider.addEventListener('change', (e) => {
                Connection.post('/api/settings', { brightness: parseInt(e.target.value) });
            });
        }

        // Buzzer Volume Slider & Real-time preview
        const buzzVolSlider = document.getElementById('buzzerVolumeSlider');
        const buzzVolLabel = document.getElementById('buzzerVolumeLabel');
        if (buzzVolSlider) {
            buzzVolSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                if (buzzVolLabel) buzzVolLabel.textContent = `${val}%`;
                Connection.sendWs({ type: 'set_buzzer_volume', volume: val });
            });
            buzzVolSlider.addEventListener('change', (e) => {
                Connection.post('/api/settings', { buzzerVolume: parseInt(e.target.value) });
            });
        }

        // Buzzer Master Mute Switch
        const switchBuzzerMute = document.getElementById('switchBuzzerMute');
        if (switchBuzzerMute) {
            switchBuzzerMute.addEventListener('change', (e) => {
                const isMuted = e.target.checked;
                Connection.sendWs({ type: 'set_buzzer_mute', muted: isMuted });
                Connection.post('/api/settings', { buzzerMuted: isMuted });
                App.showToast(isMuted ? 'Buzzer Muted (Silent Mode) 🔇' : 'Buzzer Unmuted 🔊');
            });
        }

        // Buzzer Notification Alert Theme
        const selectBuzzerTheme = document.getElementById('selectBuzzerTheme');
        if (selectBuzzerTheme) {
            selectBuzzerTheme.addEventListener('change', (e) => {
                const themeVal = parseInt(e.target.value);
                Connection.sendWs({ type: 'set_buzzer_theme', theme: themeVal });
                Connection.post('/api/settings', { buzzerTheme: themeVal });
                // Audition theme sound
                Connection.sendWs({ type: 'play_sound', sound: 'alert' });
                App.showToast('Notification Theme Updated 🎵');
            });
        }

        // Custom Frequency Tone Generator
        const customToneFreq = document.getElementById('customToneFreq');
        const customToneFreqLabel = document.getElementById('customToneFreqLabel');
        if (customToneFreq && customToneFreqLabel) {
            customToneFreq.addEventListener('input', (e) => {
                customToneFreqLabel.textContent = `${e.target.value} Hz`;
            });
        }

        const btnPlayCustomTone = document.getElementById('btnPlayCustomTone');
        if (btnPlayCustomTone) {
            btnPlayCustomTone.addEventListener('click', () => {
                const freq = parseInt(document.getElementById('customToneFreq')?.value) || 1200;
                const dur = parseInt(document.getElementById('customToneDur')?.value) || 150;
                Connection.sendWs({ type: 'play_tone', freq: freq, duration: dur });
                App.showToast(`Played Tone: ${freq} Hz (${dur}ms) ♫`);
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
                App.showToast('Open in Chrome on Android/Desktop to install as PWA', 'info');
            }
        });

        // Buzzer Soundboard Preset Buttons
        document.querySelectorAll('.btn-buzzer-sound').forEach(btn => {
            btn.addEventListener('click', () => {
                const sound = btn.getAttribute('data-sound');
                if (sound) {
                    Connection.sendWs({ type: 'play_sound', sound: sound });
                    App.showToast(`Played Buzzer: ${sound.toUpperCase()} 🔊`);
                }
            });
        });

        // Save Individual Sensor & GPIO Configurations
        document.getElementById('btnSaveSensorConfigs')?.addEventListener('click', () => {
            const payload = {
                buzzerVolume: parseInt(document.getElementById('buzzerVolumeSlider')?.value) || 80,
                buzzerMuted: document.getElementById('switchBuzzerMute')?.checked ?? false,
                buzzerTheme: parseInt(document.getElementById('selectBuzzerTheme')?.value) || 0,
                touchSoundEnabled: document.getElementById('switchTouchSound')?.checked ?? true,
                gameSoundEnabled: document.getElementById('switchGameSound')?.checked ?? true,

                buzzerEnabled: document.getElementById('cfgBuzzerEn')?.checked ?? true,
                buzzerPin: parseInt(document.getElementById('cfgBuzzerPin')?.value) || 18,
                pirEnabled: document.getElementById('cfgPirEn')?.checked ?? true,
                pirPin: parseInt(document.getElementById('cfgPirPin')?.value) || 27,
                autoWakeOnMotion: document.getElementById('cfgPirWake')?.checked ?? true,
                ldrEnabled: document.getElementById('cfgLdrEn')?.checked ?? true,
                ldrPin: parseInt(document.getElementById('cfgLdrPin')?.value) || 34,
                autoBrightness: document.getElementById('cfgLdrAuto')?.checked ?? true,
                ultrasonicEnabled: document.getElementById('cfgUsEn')?.checked ?? true,
                ultrasonicTrigPin: parseInt(document.getElementById('cfgUsTrig')?.value) || 5,
                ultrasonicEchoPin: parseInt(document.getElementById('cfgUsEcho')?.value) || 19,
                dhtEnabled: document.getElementById('cfgDhtEn')?.checked ?? true,
                dhtPin: parseInt(document.getElementById('cfgDhtPin')?.value) || 4,
                dhtType: parseInt(document.getElementById('cfgDhtType')?.value) || 11,
                rgbLedEnabled: document.getElementById('cfgRgbEn')?.checked ?? true,
                rgbLedPin: parseInt(document.getElementById('cfgRgbPin')?.value) || 13
            };

            Connection.post('/api/settings', payload);
            App.showToast('Saved Hardware, Sound & Sensor Settings to ESP32 Flash! ⚡');
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

            App.showToast('Wi-Fi credentials updated. ESP32 will reconnect.');
        });

        // Reboot ESP32 — ID: btnRebootEsp
        document.getElementById('btnRebootEsp')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reboot the ESP32?')) {
                Connection.post('/api/restart', {});
                App.showToast('ESP32 Rebooting...');
            }
        });

        // Factory Reset — ID: btnFactoryReset
        document.getElementById('btnFactoryReset')?.addEventListener('click', () => {
            if (confirm('WARNING: This will wipe all NVS settings, Wi-Fi credentials, and high scores. Proceed?')) {
                Connection.post('/api/factory-reset', {});
                App.showToast('Factory reset initiated. ESP32 rebooting...', 'error');
            }
        });

        // Initial settings fetch
        this.fetchSettings();
    }

    async fetchSettings() {
        const s = await Connection.get('/api/settings');
        if (!s) return;

        // Buzzer Audio Controls
        if (s.buzzerVolume !== undefined && document.getElementById('buzzerVolumeSlider')) {
            document.getElementById('buzzerVolumeSlider').value = s.buzzerVolume;
            if (document.getElementById('buzzerVolumeLabel')) {
                document.getElementById('buzzerVolumeLabel').textContent = `${s.buzzerVolume}%`;
            }
        }
        if (s.buzzerMuted !== undefined && document.getElementById('switchBuzzerMute')) {
            document.getElementById('switchBuzzerMute').checked = s.buzzerMuted;
        }
        if (s.buzzerTheme !== undefined && document.getElementById('selectBuzzerTheme')) {
            document.getElementById('selectBuzzerTheme').value = s.buzzerTheme;
        }
        if (s.touchSoundEnabled !== undefined && document.getElementById('switchTouchSound')) {
            document.getElementById('switchTouchSound').checked = s.touchSoundEnabled;
        }
        if (s.gameSoundEnabled !== undefined && document.getElementById('switchGameSound')) {
            document.getElementById('switchGameSound').checked = s.gameSoundEnabled;
        }

        // Hardware Sensor Settings
        if (s.buzzerEnabled !== undefined && document.getElementById('cfgBuzzerEn')) {
            document.getElementById('cfgBuzzerEn').checked = s.buzzerEnabled;
        }
        if (s.buzzerPin !== undefined && document.getElementById('cfgBuzzerPin')) {
            document.getElementById('cfgBuzzerPin').value = s.buzzerPin;
        }
        if (s.pirEnabled !== undefined && document.getElementById('cfgPirEn')) {
            document.getElementById('cfgPirEn').checked = s.pirEnabled;
        }
        if (s.pirPin !== undefined && document.getElementById('cfgPirPin')) {
            document.getElementById('cfgPirPin').value = s.pirPin;
        }
        if (s.autoWakeOnMotion !== undefined && document.getElementById('cfgPirWake')) {
            document.getElementById('cfgPirWake').checked = s.autoWakeOnMotion;
        }
        if (s.ldrEnabled !== undefined && document.getElementById('cfgLdrEn')) {
            document.getElementById('cfgLdrEn').checked = s.ldrEnabled;
        }
        if (s.ldrPin !== undefined && document.getElementById('cfgLdrPin')) {
            document.getElementById('cfgLdrPin').value = s.ldrPin;
        }
        if (s.autoBrightness !== undefined && document.getElementById('cfgLdrAuto')) {
            document.getElementById('cfgLdrAuto').checked = s.autoBrightness;
        }
        if (s.ultrasonicEnabled !== undefined && document.getElementById('cfgUsEn')) {
            document.getElementById('cfgUsEn').checked = s.ultrasonicEnabled;
        }
        if (s.ultrasonicTrigPin !== undefined && document.getElementById('cfgUsTrig')) {
            document.getElementById('cfgUsTrig').value = s.ultrasonicTrigPin;
        }
        if (s.ultrasonicEchoPin !== undefined && document.getElementById('cfgUsEcho')) {
            document.getElementById('cfgUsEcho').value = s.ultrasonicEchoPin;
        }
        if (s.dhtEnabled !== undefined && document.getElementById('cfgDhtEn')) {
            document.getElementById('cfgDhtEn').checked = s.dhtEnabled;
        }
        if (s.dhtPin !== undefined && document.getElementById('cfgDhtPin')) {
            document.getElementById('cfgDhtPin').value = s.dhtPin;
        }
        if (s.dhtType !== undefined && document.getElementById('cfgDhtType')) {
            document.getElementById('cfgDhtType').value = s.dhtType;
        }
        if (s.rgbLedEnabled !== undefined && document.getElementById('cfgRgbEn')) {
            document.getElementById('cfgRgbEn').checked = s.rgbLedEnabled;
        }
        if (s.rgbLedPin !== undefined && document.getElementById('cfgRgbPin')) {
            document.getElementById('cfgRgbPin').value = s.rgbLedPin;
        }
    }

    updateSensorTelemetry(data) {
        if (!data) return;
        const motionEl = document.getElementById('sensorMotionVal');
        const lightEl = document.getElementById('sensorLightVal');
        const distEl = document.getElementById('sensorDistanceVal');
        const dhtEl = document.getElementById('sensorDhtVal');

        if (motionEl && data.motion !== undefined) {
            motionEl.textContent = data.motion ? 'Active (Motion!)' : 'Idle (Clear)';
            motionEl.style.color = data.motion ? '#1DB954' : 'var(--color-midnight)';
        }
        if (lightEl && data.light !== undefined) {
            lightEl.textContent = `${data.light}%`;
        }
        if (distEl && data.distance !== undefined) {
            distEl.textContent = `${data.distance} cm`;
        }
        if (dhtEl && (data.temp !== undefined || data.temperature !== undefined)) {
            const t = data.temp !== undefined ? data.temp : data.temperature;
            const h = data.hum !== undefined ? data.hum : data.humidity;
            dhtEl.textContent = `${t}°C / ${h}%`;
        }
    }
}

window.Settings = new SettingsManagerWeb();
