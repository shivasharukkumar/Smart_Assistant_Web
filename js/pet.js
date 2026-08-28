/**
 * PetManager - Virtual Pet / Tamagotchi Companion Hub
 */
const Pet = {
    stats: {
        name: "Pixel",
        hunger: 85,
        happiness: 90,
        energy: 80,
        hygiene: 85,
        level: 1,
        xp: 25,
        xpToNext: 100,
        isSleeping: false,
        status: "Feeling Good"
    },
    animFrame: 0,
    animTimer: null,

    // 16x16 Pixel Avatar Sprite Matrices
    frames: {
        awake1: [
            "0000011111100000",
            "0001100000011000",
            "0010000000000100",
            "0100000000000010",
            "1000100110010001",
            "1001111111111001",
            "1011111111111101",
            "1011111111111101",
            "1000100110010001",
            "1000000000000001",
            "0100000000000010",
            "0011000000001100",
            "0000111111110000",
            "0000100110010000",
            "0000000000000000",
            "0000000000000000"
        ],
        awake2: [
            "0000000000000000",
            "0000011111100000",
            "0001111111111000",
            "0010000000000100",
            "0100100110010010",
            "1001111111111001",
            "1011111111111101",
            "1011111111111101",
            "1000100110010001",
            "0100000000000010",
            "0011000000001100",
            "0000111111110000",
            "0000100110010000",
            "0000000000000000",
            "0000000000000000",
            "0000000000000000"
        ],
        sleep: [
            "0000011111100000",
            "0001100000011000",
            "0010000000000100",
            "0100000000000010",
            "1000000000000001",
            "1001100000011001",
            "1000000000000001",
            "1000100000010001",
            "1000011111100001",
            "0100000000000010",
            "0011000000001100",
            "0000111111110000",
            "0000100110010000",
            "0000000000000000",
            "0000000000000000",
            "0000000000000000"
        ]
    },

    init() {
        this.bindEvents();
        this.startAnimation();
        this.fetchStats();

        // Listen for live telemetry
        Connection.on('telemetry', (data) => {
            if (data.pet) {
                this.updateStats(data.pet);
            }
        });
        Connection.on('pet_update', (data) => {
            this.updateStats(data);
        });

        console.log('[Pet] Tamagotchi Hub initialized.');
    },

    bindEvents() {
        // Actions
        document.getElementById('btnPetFeed')?.addEventListener('click', () => this.sendAction('feed', 'Fed delicious snack! 🍎'));
        document.getElementById('btnPetPlay')?.addEventListener('click', () => this.sendAction('play', 'Played mini-game! 🎾'));
        document.getElementById('btnPetClean')?.addEventListener('click', () => this.sendAction('clean', 'Clean and sparkly! 🧼'));
        document.getElementById('btnPetSleep')?.addEventListener('click', () => this.sendAction('sleep', 'Toggled sleep state! 💤'));
        document.getElementById('btnPetTouch')?.addEventListener('click', () => this.sendAction('pet', 'Pet companion! 💖'));
        document.getElementById('btnResetPet')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset your pet data?')) {
                this.sendAction('reset', 'Pet stats reset to default.');
            }
        });

        // Save Pet Name
        document.getElementById('btnSavePetName')?.addEventListener('click', () => {
            const nameInput = document.getElementById('petNameInput');
            const name = nameInput ? nameInput.value.trim() : 'Pixel';
            if (name) {
                this.sendAction('setName', `Pet name set to ${name}!`, { name });
            }
        });

        // Switch OLED to Pet Screen
        document.getElementById('btnSwitchToPetOled')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'set_page', page: 'pet' });
            Connection.post('/api/page', { page: 'pet' });
            App.showToast('Switched OLED to Virtual Pet Page!');
        });
    },

    sendAction(action, toastMsg, extra = {}) {
        const payload = { action, ...extra };
        Connection.sendWs({ type: 'pet_action', ...payload });
        Connection.post('/api/pet/action', payload)
            .then(res => {
                if (res && res.name) this.updateStats(res);
            })
            .catch(() => {});

        if (toastMsg) App.showToast(toastMsg);
    },

    fetchStats() {
        Connection.get('/api/pet')
            .then(data => {
                if (data && data.name) this.updateStats(data);
            })
            .catch(() => {});
    },

    updateStats(data) {
        this.stats = { ...this.stats, ...data };

        // Update UI Elements
        const nameDisplay = document.getElementById('petDisplayName');
        const levelBadge = document.getElementById('petLevelBadge');
        const statusBadge = document.getElementById('petStatusBadge');

        if (nameDisplay) nameDisplay.textContent = this.stats.name || 'Pixel';
        if (levelBadge) levelBadge.textContent = `Level ${this.stats.level || 1}`;
        if (statusBadge) statusBadge.textContent = this.stats.status || 'Feeling Good';

        // Meters
        this.setMeter('petHungerBar', 'petHungerText', this.stats.hunger);
        this.setMeter('petHappyBar', 'petHappyText', this.stats.happiness);
        this.setMeter('petEnergyBar', 'petEnergyText', this.stats.energy);
        this.setMeter('petHygieneBar', 'petHygieneText', this.stats.hygiene);

        // XP
        const xpBar = document.getElementById('petXpBar');
        const xpText = document.getElementById('petXpText');
        if (xpBar && this.stats.xpToNext) {
            const pct = Math.min(100, Math.round((this.stats.xp / this.stats.xpToNext) * 100));
            xpBar.style.width = `${pct}%`;
        }
        if (xpText && this.stats.xpToNext) {
            xpText.textContent = `${this.stats.xp} / ${this.stats.xpToNext} XP`;
        }

        // Sleep button label
        const sleepText = document.getElementById('petSleepBtnText');
        if (sleepText) {
            sleepText.textContent = this.stats.isSleeping ? 'Wake Up ☀️' : 'Sleep / Nap 💤';
        }
    },

    setMeter(barId, textId, val) {
        const bar = document.getElementById(barId);
        const text = document.getElementById(textId);
        const clamped = Math.max(0, Math.min(100, val || 0));
        if (bar) bar.style.width = `${clamped}%`;
        if (text) text.textContent = `${clamped}%`;
    },

    startAnimation() {
        if (this.animTimer) clearInterval(this.animTimer);
        this.animTimer = setInterval(() => {
            this.animFrame = (this.animFrame + 1) % 2;
            this.drawAvatar();
        }, 400);
    },

    drawAvatar() {
        const canvas = document.getElementById('petCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 128);

        const frameData = this.stats.isSleeping
            ? this.frames.sleep
            : (this.animFrame === 0 ? this.frames.awake1 : this.frames.awake2);

        const pixelSize = 6;
        const startX = (128 - 16 * pixelSize) / 2;
        const startY = (128 - 16 * pixelSize) / 2;

        ctx.fillStyle = '#ffffff';
        for (let r = 0; r < 16; r++) {
            const row = frameData[r];
            for (let c = 0; c < 16; c++) {
                if (row[c] === '1') {
                    ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
                }
            }
        }

        // Sleeping Zzz particles
        if (this.stats.isSleeping) {
            ctx.fillStyle = '#60a5fa';
            ctx.font = '14px monospace';
            ctx.fillText('Z', 96, 32 + (this.animFrame * 3));
            ctx.font = '11px monospace';
            ctx.fillText('z', 108, 22 + (this.animFrame * 2));
        }
    }
};

window.Pet = Pet;
