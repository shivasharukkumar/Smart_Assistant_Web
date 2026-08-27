/**
 * SpotifyManager - Real Official Spotify Web Player & ESP32 OLED Live Sync
 * Embeds official Spotify playlists/tracks directly and bridges real song telemetry
 * from Spotify Web API or manual inputs to the physical ESP32 OLED screen.
 */
const SpotifyManager = {
    // Current Active Track State
    currentTitle: "Shiva's Favorite Hits",
    currentArtist: "Tamil Mix & Classics",
    progressSec: 45,
    durationSec: 215,
    isPlaying: true,
    activePreset: "custom1",

    // Spotify Web API Token & Polling
    apiToken: localStorage.getItem('spotify_access_token') || '',
    apiPollInterval: null,
    visualizerAnimId: null,

    // Real Playlist Embed URLs
    playlists: {
        custom1: {
            title: "Shiva's Favorite Hits",
            artist: "Tamil Mix & Classics",
            embedUrl: "https://open.spotify.com/embed/playlist/3a8vuZph9RQsd2uLSVQ6PN?utm_source=generator&theme=0"
        },
        ar_rahman: {
            title: "AR Rahman Masterpieces",
            artist: "A.R. Rahman (1992~2026)",
            embedUrl: "https://open.spotify.com/embed/playlist/6PHSBLLzNLHjobls3gd3kg?utm_source=generator&theme=0"
        },
        trending_tamil: {
            title: "Trending Now Tamil",
            artist: "Official Hot Hits Tamil",
            embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4Im4BTs2WMg?utm_source=generator&theme=0"
        },
        travel_tamil: {
            title: "90's Bus Travel Tamil",
            artist: "Ilaiyaraaja & SPB Classics",
            embedUrl: "https://open.spotify.com/embed/playlist/32O1UkxKFbhFGZrzYccTCc?utm_source=generator&theme=0"
        },
        energy_tamil: {
            title: "Tamil Energy Beats",
            artist: "High Tempo Tamil Hits",
            embedUrl: "https://open.spotify.com/embed/playlist/4Xg9aD8rEg9lIALLQclLg6?utm_source=generator&theme=0"
        }
    },

    init() {
        this.bindEvents();
        this.startVisualizer();

        // Restore saved Spotify token if present
        const tokenInput = document.getElementById('spotifyAccessTokenInput');
        if (tokenInput && this.apiToken) {
            tokenInput.value = this.apiToken;
            this.startSpotifyApiPolling();
        }

        // Initial sync to ESP32
        this.syncToEsp32();
        console.log('[Spotify] Real Spotify Player & ESP32 Bridge initialized.');
    },

    bindEvents() {
        // Quick Playlist Pills
        document.querySelectorAll('.spotify-quick-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetKey = btn.getAttribute('data-preset');
                this.loadPreset(presetKey);
            });
        });

        // Push to OLED Now
        const pushOledBtn = document.getElementById('btnPushSpotifyToOled');
        if (pushOledBtn) {
            pushOledBtn.addEventListener('click', () => {
                this.readInputsAndSync(true);
                App.showToast('Pushed Real Song to ESP32 OLED! ♫');
            });
        }

        // Toggle Play/Pause on OLED
        const togglePlayBtn = document.getElementById('btnToggleOledPlay');
        const playIcon = document.getElementById('oledPlayIcon');
        if (togglePlayBtn) {
            togglePlayBtn.addEventListener('click', () => {
                this.isPlaying = !this.isPlaying;
                if (playIcon) playIcon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
                this.syncToEsp32();
                App.showToast(this.isPlaying ? 'ESP32 Status: Playing ▶' : 'ESP32 Status: Paused ⏸');
            });
        }

        // Real-time text changes in Song Title & Artist
        const titleInput = document.getElementById('liveSongTitleInput');
        const artistInput = document.getElementById('liveArtistInput');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                this.currentTitle = titleInput.value.trim() || 'Spotify Stream';
                this.syncToEsp32();
            });
        }
        if (artistInput) {
            artistInput.addEventListener('input', () => {
                this.currentArtist = artistInput.value.trim() || 'Spotify Audio';
                this.syncToEsp32();
            });
        }

        // Connect Real Spotify Web API (OAuth Token)
        const connectApiBtn = document.getElementById('btnConnectSpotifyApi');
        const tokenInput = document.getElementById('spotifyAccessTokenInput');
        if (connectApiBtn && tokenInput) {
            connectApiBtn.addEventListener('click', () => {
                const token = tokenInput.value.trim();
                if (token) {
                    this.apiToken = token;
                    localStorage.setItem('spotify_access_token', token);
                    this.startSpotifyApiPolling();
                    App.showToast('Connecting to Spotify Web API... 🎧');
                } else {
                    App.showToast('Please enter a valid Spotify OAuth token');
                }
            });
        }

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
                if (e.key === 'Enter') loadUrlBtn.click();
            });
        }
    },

    loadPreset(presetKey) {
        if (!this.playlists[presetKey]) return;

        const data = this.playlists[presetKey];
        this.activePreset = presetKey;
        this.currentTitle = data.title;
        this.currentArtist = data.artist;

        // Update pills
        document.querySelectorAll('.spotify-quick-pill').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-preset') === presetKey);
        });

        // Update iframe embed at the top
        const iframe = document.getElementById('spotifyIframe');
        if (iframe) {
            iframe.src = data.embedUrl;
        }

        // Update input boxes
        const titleInput = document.getElementById('liveSongTitleInput');
        const artistInput = document.getElementById('liveArtistInput');
        if (titleInput) titleInput.value = this.currentTitle;
        if (artistInput) artistInput.value = this.currentArtist;

        this.syncToEsp32(true);
        App.showToast(`Loaded: ${data.title} ♫`);
    },

    loadCustomUrl(rawUrl) {
        let embedSrc = rawUrl;
        if (embedSrc.includes('open.spotify.com/') && !embedSrc.includes('/embed/')) {
            embedSrc = embedSrc.replace('open.spotify.com/', 'open.spotify.com/embed/');
            if (!embedSrc.includes('?')) embedSrc += '?utm_source=generator&theme=0';
        }

        const iframe = document.getElementById('spotifyIframe');
        if (iframe) {
            iframe.src = embedSrc;
        }

        const cleanTitle = rawUrl.split('/').pop().split('?')[0].replace(/[-_]/g, ' ') || 'Custom Spotify Track';
        this.currentTitle = cleanTitle.toUpperCase();
        const titleInput = document.getElementById('liveSongTitleInput');
        if (titleInput) titleInput.value = this.currentTitle;

        this.syncToEsp32(true);
        App.showToast('Loaded Custom Spotify Stream! ♫');
    },

    readInputsAndSync(forceSwitchPage = false) {
        const titleInput = document.getElementById('liveSongTitleInput');
        const artistInput = document.getElementById('liveArtistInput');
        if (titleInput) this.currentTitle = titleInput.value.trim() || 'Spotify Stream';
        if (artistInput) this.currentArtist = artistInput.value.trim() || 'Spotify Audio';
        this.syncToEsp32(forceSwitchPage);
    },

    syncToEsp32(forceSwitchPage = false) {
        const payload = {
            type: 'spotify_track',
            title: this.currentTitle,
            artist: this.currentArtist,
            progress: this.progressSec,
            duration: this.durationSec,
            playing: this.isPlaying
        };

        if (typeof Connection !== 'undefined') {
            Connection.sendWs(payload);
            if (forceSwitchPage) {
                Connection.sendWs({ type: 'set_page', page: 'spotify' });
            }
        }
    },

    startSpotifyApiPolling() {
        if (!this.apiToken) return;
        if (this.apiPollInterval) clearInterval(this.apiPollInterval);

        const badge = document.getElementById('spotifyApiStatusBadge');
        if (badge) {
            badge.textContent = 'API Live Polling';
            badge.className = 'status-badge connected';
        }

        // Poll immediately and then every 2000ms
        this.pollSpotifyCurrentlyPlaying();
        this.apiPollInterval = setInterval(() => {
            this.pollSpotifyCurrentlyPlaying();
        }, 2000);
    },

    async pollSpotifyCurrentlyPlaying() {
        if (!this.apiToken) return;
        try {
            const resp = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { 'Authorization': `Bearer ${this.apiToken}` }
            });

            if (resp.status === 200) {
                const data = await resp.json();
                if (data && data.item) {
                    const songName = data.item.name;
                    const artists = data.item.artists.map(a => a.name).join(', ');
                    const progSec = Math.floor((data.progress_ms || 0) / 1000);
                    const durSec = Math.floor((data.item.duration_ms || 180000) / 1000);
                    const isPlay = data.is_playing;

                    this.currentTitle = songName;
                    this.currentArtist = artists;
                    this.progressSec = progSec;
                    this.durationSec = durSec;
                    this.isPlaying = isPlay;

                    // Update UI inputs
                    const titleInput = document.getElementById('liveSongTitleInput');
                    const artistInput = document.getElementById('liveArtistInput');
                    if (titleInput && document.activeElement !== titleInput) titleInput.value = songName;
                    if (artistInput && document.activeElement !== artistInput) artistInput.value = artists;

                    // Broadcast real track to ESP32 OLED
                    this.syncToEsp32();
                }
            } else if (resp.status === 401) {
                console.warn('[Spotify] Token expired. Please refresh token.');
                const badge = document.getElementById('spotifyApiStatusBadge');
                if (badge) {
                    badge.textContent = 'Token Expired';
                    badge.className = 'status-badge';
                }
                clearInterval(this.apiPollInterval);
            }
        } catch (err) {
            console.debug('[Spotify] Polling error:', err);
        }
    },

    startVisualizer() {
        const canvas = document.getElementById('spotifyVisualizerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const numBars = 28;
        let tick = 0;

        const render = () => {
            tick++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = Math.floor(canvas.width / numBars) - 2;
            for (let i = 0; i < numBars; i++) {
                let h = 3;
                if (this.isPlaying) {
                    const noise = Math.sin(tick * 0.09 + i * 0.45) * 0.5 + 0.5;
                    const noise2 = Math.cos(tick * 0.14 - i * 0.3) * 0.5 + 0.5;
                    h = Math.floor((noise * 0.6 + noise2 * 0.4) * (canvas.height - 6)) + 4;
                }

                const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
                grad.addColorStop(0, '#14833b');
                grad.addColorStop(1, '#1DB954');

                ctx.fillStyle = grad;
                ctx.fillRect(i * (barWidth + 2) + 2, canvas.height - h, barWidth, h);
            }

            this.visualizerAnimId = requestAnimationFrame(render);
        };

        render();
    }
};

// Global export
window.Spotify = SpotifyManager;
