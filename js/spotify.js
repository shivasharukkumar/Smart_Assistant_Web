/**
 * SpotifyManager - Neural Spotify Player & OLED Visualizer Synchronizer
 * Handles playback simulation, preset playlists, iframe embeds, audio visualizer,
 * and real-time hardware sync with the ESP32 OLED display.
 */
const SpotifyManager = {
    // Playback State
    isPlaying: true,
    progress: 45,
    duration: 195,
    volume: 80,
    isShuffle: false,
    isRepeat: false,
    currentTrackIndex: 0,
    timerInterval: null,
    visualizerAnimId: null,

    // Curated Track Catalog
    tracks: [
        {
            title: "Midnight Cyber Beats",
            artist: "Synthwave Lo-Fi",
            album: "Neon Cyber Companion OST",
            duration: 195,
            preset: "lofi",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
        },
        {
            title: "Neon Horizons",
            artist: "Cyberpunk Audio Lab",
            album: "Grid City 2088",
            duration: 210,
            preset: "synthwave",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
        },
        {
            title: "Coffee & Code",
            artist: "Chilled Cow Vibes",
            album: "Dev Flow Sessions",
            duration: 165,
            preset: "electronic",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
        },
        {
            title: "Electric Dreams",
            artist: "Retro 80s Grid",
            album: "Outrun Nostalgia",
            duration: 240,
            preset: "tophits",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0"
        },
        {
            title: "Neural Synapse Flow",
            artist: "Nexus AI Engine",
            album: "Smart Companion v2.4",
            duration: 180,
            preset: "lofi",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdLEN7aqioXM?utm_source=generator&theme=0"
        }
    ],

    init() {
        this.bindEvents();
        this.startTicker();
        this.startVisualizer();
        this.updateUi();
        this.syncToEsp32();
        console.log('[Spotify] Neural Audio Player & Visualizer initialized.');
    },

    bindEvents() {
        // Play / Pause
        const playPauseBtn = document.getElementById('btnSpotifyPlayPause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Next / Prev
        const nextBtn = document.getElementById('btnSpotifyNext');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextTrack());
        }

        const prevBtn = document.getElementById('btnSpotifyPrev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevTrack());
        }

        // Shuffle / Repeat
        const shuffleBtn = document.getElementById('btnSpotifyShuffle');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                this.isShuffle = !this.isShuffle;
                shuffleBtn.classList.toggle('active', this.isShuffle);
                App.showToast(this.isShuffle ? 'Shuffle Enabled 🔀' : 'Shuffle Disabled');
            });
        }

        const repeatBtn = document.getElementById('btnSpotifyRepeat');
        if (repeatBtn) {
            repeatBtn.addEventListener('click', () => {
                this.isRepeat = !this.isRepeat;
                repeatBtn.classList.toggle('active', this.isRepeat);
                App.showToast(this.isRepeat ? 'Repeat Track Active 🔁' : 'Repeat Disabled');
            });
        }

        // Seek Progress Slider
        const progSlider = document.getElementById('spotifyProgressSlider');
        if (progSlider) {
            progSlider.addEventListener('input', (e) => {
                this.progress = parseInt(e.target.value, 10);
                this.updateTimeDisplay();
            });
            progSlider.addEventListener('change', () => {
                this.syncToEsp32();
            });
        }

        // Volume Slider
        const volSlider = document.getElementById('spotifyVolumeSlider');
        const volLabel = document.getElementById('spotifyVolumeLabel');
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                this.volume = parseInt(e.target.value, 10);
                if (volLabel) volLabel.textContent = `${this.volume}%`;
            });
        }

        // Push to OLED Now
        const pushOledBtn = document.getElementById('btnPushSpotifyToOled');
        if (pushOledBtn) {
            pushOledBtn.addEventListener('click', () => {
                this.syncToEsp32(true);
                App.showToast('Pushed Spotify Stream to ESP32 OLED! ♫');
            });
        }

        // Preset Playlist Cards
        document.querySelectorAll('.spotify-preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const preset = card.getAttribute('data-preset');
                document.querySelectorAll('.spotify-preset-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.loadPreset(preset);
            });
        });

        // Load Custom Spotify URL
        const loadUrlBtn = document.getElementById('btnLoadSpotifyUrl');
        const urlInput = document.getElementById('spotifyUrlInput');
        if (loadUrlBtn && urlInput) {
            loadUrlBtn.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) {
                    this.loadCustomUrl(url);
                }
            });
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    loadUrlBtn.click();
                }
            });
        }
    },

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        const disc = document.getElementById('spotifyVinylDisc');
        const icon = document.getElementById('spotifyPlayIcon');
        const badge = document.getElementById('spotifyPlaybackBadge');

        if (disc) {
            disc.classList.toggle('playing', this.isPlaying);
        }
        if (icon) {
            icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
        }
        if (badge) {
            badge.textContent = this.isPlaying ? 'Streaming Active' : 'Playback Paused';
            badge.className = this.isPlaying ? 'status-badge connected' : 'status-badge';
        }

        this.syncToEsp32();
        App.showToast(this.isPlaying ? 'Spotify Playing ▶' : 'Spotify Paused ⏸');
    },

    nextTrack() {
        if (this.isShuffle) {
            this.currentTrackIndex = Math.floor(Math.random() * this.tracks.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        }
        this.progress = 0;
        this.updateUi();
        this.syncToEsp32();
        const current = this.tracks[this.currentTrackIndex];
        App.showToast(`Track: ${current.title} ♫`);
    },

    prevTrack() {
        if (this.progress > 4) {
            this.progress = 0;
        } else {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
            this.progress = 0;
        }
        this.updateUi();
        this.syncToEsp32();
        const current = this.tracks[this.currentTrackIndex];
        App.showToast(`Track: ${current.title} ♫`);
    },

    loadPreset(presetName) {
        const idx = this.tracks.findIndex(t => t.preset === presetName);
        if (idx !== -1) {
            this.currentTrackIndex = idx;
            this.progress = 0;
            this.isPlaying = true;
            this.updateUi();
            this.syncToEsp32();

            // Update iframe embed if provided
            const iframe = document.getElementById('spotifyIframe');
            if (iframe && this.tracks[idx].embedUrl) {
                iframe.src = this.tracks[idx].embedUrl;
            }
            App.showToast(`Loaded Preset: ${this.tracks[idx].title}`);
        }
    },

    loadCustomUrl(rawUrl) {
        let embedSrc = rawUrl;
        // Transform standard open.spotify.com link into embed link
        // Example: https://open.spotify.com/track/123 -> https://open.spotify.com/embed/track/123?utm_source=generator&theme=0
        if (embedSrc.includes('open.spotify.com/') && !embedSrc.includes('/embed/')) {
            embedSrc = embedSrc.replace('open.spotify.com/', 'open.spotify.com/embed/');
            if (!embedSrc.includes('?')) embedSrc += '?utm_source=generator&theme=0';
        }

        const iframe = document.getElementById('spotifyIframe');
        if (iframe) {
            iframe.src = embedSrc;
        }

        // Parse human-readable title if possible
        const cleanTitle = rawUrl.split('/').pop().split('?')[0].replace(/[-_]/g, ' ') || 'Spotify Stream';
        this.tracks[this.currentTrackIndex].title = cleanTitle.toUpperCase();
        this.progress = 0;
        this.isPlaying = true;
        this.updateUi();
        this.syncToEsp32(true);
        App.showToast('Loaded Custom Spotify Embed! ♫');
    },

    updateUi() {
        const track = this.tracks[this.currentTrackIndex];
        const titleEl = document.getElementById('spotifyTrackTitle');
        const artistEl = document.getElementById('spotifyArtistName');
        const albumEl = document.getElementById('spotifyAlbumName');
        const progSlider = document.getElementById('spotifyProgressSlider');

        if (titleEl) titleEl.textContent = track.title;
        if (artistEl) artistEl.textContent = track.artist;
        if (albumEl) albumEl.textContent = `Album: ${track.album}`;

        if (progSlider) {
            progSlider.max = track.duration;
            progSlider.value = this.progress;
        }

        this.updateTimeDisplay();
    },

    updateTimeDisplay() {
        const track = this.tracks[this.currentTrackIndex];
        const elapsedEl = document.getElementById('spotifyTimeElapsed');
        const durEl = document.getElementById('spotifyTimeDuration');

        if (elapsedEl) elapsedEl.textContent = this.formatTime(this.progress);
        if (durEl) durEl.textContent = this.formatTime(track.duration);
    },

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    startTicker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isPlaying) return;

            const track = this.tracks[this.currentTrackIndex];
            this.progress++;
            if (this.progress >= track.duration) {
                if (this.isRepeat) {
                    this.progress = 0;
                } else {
                    this.nextTrack();
                    return;
                }
            }

            const progSlider = document.getElementById('spotifyProgressSlider');
            if (progSlider) progSlider.value = this.progress;
            this.updateTimeDisplay();

            // Periodic 5s sync to ESP32
            if (this.progress % 5 === 0) {
                this.syncToEsp32();
            }
        }, 1000);
    },

    startVisualizer() {
        const canvas = document.getElementById('spotifyVisualizerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const numBars = 22;
        let tick = 0;

        const render = () => {
            tick++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = Math.floor(canvas.width / numBars) - 2;
            for (let i = 0; i < numBars; i++) {
                let h = 4;
                if (this.isPlaying) {
                    const noise = Math.sin(tick * 0.08 + i * 0.5) * 0.5 + 0.5;
                    const noise2 = Math.cos(tick * 0.12 - i * 0.3) * 0.5 + 0.5;
                    h = Math.floor((noise * 0.6 + noise2 * 0.4) * (canvas.height - 6)) + 4;
                }

                // Gradient from Spotify Green (#1DB954) to Emerald
                const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
                grad.addColorStop(0, '#14833b');
                grad.addColorStop(1, '#1DB954');

                ctx.fillStyle = grad;
                ctx.fillRect(i * (barWidth + 2) + 2, canvas.height - h, barWidth, h);
            }

            this.visualizerAnimId = requestAnimationFrame(render);
        };

        render();
    },

    syncToEsp32(forceSwitchPage = false) {
        const track = this.tracks[this.currentTrackIndex];
        const payload = {
            type: 'spotify_track',
            title: track.title,
            artist: track.artist,
            progress: this.progress,
            duration: track.duration,
            playing: this.isPlaying
        };

        if (typeof Connection !== 'undefined') {
            Connection.sendWs(payload);
            if (forceSwitchPage) {
                Connection.sendWs({ type: 'set_page', page: 'spotify' });
            }
        }
    }
};

// Global export
window.Spotify = SpotifyManager;
