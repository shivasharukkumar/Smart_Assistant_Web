/**
 * Buzzer Jukebox & 8-Bit Synthesizer Manager
 */
const Jukebox = {
    audioCtx: null,

    init() {
        this.bindEvents();
        console.log('[Jukebox] Buzzer Jukebox & 8-Bit Synthesizer initialized.');
    },

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    bindEvents() {
        // Pirates of the Caribbean
        document.getElementById('btnPlayPirates')?.addEventListener('click', () => {
            this.playSong('pirates', '🏴‍☠️ Playing "He\'s a Pirate" on ESP32 Buzzer!');
        });

        // Stop Melody
        document.getElementById('btnStopMelody')?.addEventListener('click', () => {
            this.stopMelody();
        });

        // Playlist song buttons
        document.querySelectorAll('.btn-play-song').forEach(btn => {
            btn.addEventListener('click', () => {
                const song = btn.getAttribute('data-song');
                this.playSong(song, `Playing ${song.toUpperCase()} on ESP32 Buzzer! 🎵`);
            });
        });

        // Sound effects
        document.querySelectorAll('.btn-sfx').forEach(btn => {
            btn.addEventListener('click', () => {
                const sfx = btn.getAttribute('data-sfx');
                this.playSfx(sfx);
            });
        });

        // Piano keys
        document.querySelectorAll('.piano-key').forEach(key => {
            key.addEventListener('mousedown', () => {
                const freq = parseInt(key.getAttribute('data-freq'), 10);
                if (freq) this.playTone(freq, 200);
            });
        });
    },

    playSong(songName, toastMsg) {
        Connection.sendWs({ type: 'play_melody', song: songName });
        Connection.post('/api/buzzer/song', { song: songName }).catch(() => {});
        if (toastMsg) App.showToast(toastMsg);
    },

    stopMelody() {
        Connection.sendWs({ type: 'play_melody', song: 'stop' });
        Connection.post('/api/buzzer/song', { song: 'stop' }).catch(() => {});
        App.showToast('Melody stopped.');
    },

    playSfx(sfxName) {
        Connection.sendWs({ type: 'play_sound', sound: sfxName });

        // Local browser audio fallback
        this.playLocalSfx(sfxName);
        App.showToast(`Sound FX: ${sfxName}`);
    },

    playTone(freq, durationMs) {
        Connection.sendWs({ type: 'buzzer_tone', freq, duration: durationMs });
        Connection.post('/api/buzzer/tone', { freq, duration: durationMs }).catch(() => {});

        // Local Web Audio beep
        try {
            const ctx = this.getAudioContext();
            if (ctx) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + durationMs / 1000);
            }
        } catch (e) {}
    },

    playLocalSfx(name) {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            if (name === 'laser') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.12);
            } else if (name === 'dino_jump') {
                this.playTone(987, 40);
                setTimeout(() => this.playTone(1318, 55), 45);
            } else if (name === 'explosion') {
                this.playTone(400, 40);
                setTimeout(() => this.playTone(200, 80), 45);
            } else if (name === 'pet_feed') {
                this.playTone(1046, 50);
                setTimeout(() => this.playTone(1568, 80), 55);
            } else if (name === 'pet_happy') {
                this.playTone(1318, 40);
                setTimeout(() => this.playTone(2093, 90), 50);
            } else if (name === 'success') {
                this.playTone(1046, 60);
                setTimeout(() => this.playTone(1318, 60), 65);
                setTimeout(() => this.playTone(1568, 120), 130);
            }
        } catch (e) {}
    }
};

window.Jukebox = Jukebox;
