/**
 * Custom Animation & Face Creator Studio - Frame-by-Frame Pixel Engine
 */
const Animator = {
    width: 64,
    height: 32,
    frames: [],
    activeFrameIndex: 0,
    isPlaying: false,
    playTimer: null,
    fps: 8,
    onionSkin: true,
    isDrawing: false,
    drawMode: 1, // 1 = White, 0 = Black

    // Presets
    presets: {
        blinking_eyes: [
            // Frame 1: Open Eyes
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000001111110000000000000000000000000000000000000000111111000000" +
            "0000011111111000000000000000000000000000000000000001111111100000" +
            "0000111000011100000000000000000000000000000000000011100001110000" +
            "0001110000001110000000000000000000000000000000000111000000111000" +
            "0001110011001110000000000000000000000000000000000111001100111000" +
            "0001110011001110000000000000000000000000000000000111001100111000" +
            "0000111000011100000000000000000000000000000000000011100001110000" +
            "0000011111111000000000000000000000000000000000000001111111100000" +
            "0000001111110000000000000000000000000000000000000000111111000000",
            // Frame 2: Half Closed
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000001111110000000000000000000000000000000000000000111111000000" +
            "0000111111111100000000000000000000000000000000000011111111110000" +
            "0001111111111110000000000000000000000000000000000111111111111000" +
            "0000111000011100000000000000000000000000000000000011100001110000" +
            "0000011111111000000000000000000000000000000000000001111111100000",
            // Frame 3: Blink Closed Line
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000000000000000000000000000000000000000000000000000000000000000" +
            "0000111111111100000000000000000000000000000000000011111111110000" +
            "0000000000000000000000000000000000000000000000000000000000000000"
        ]
    },

    init() {
        this.createEmptyFrame();
        this.createEmptyFrame();
        this.createEmptyFrame();
        this.loadPreset('blinking_eyes');

        this.bindEvents();
        this.renderTimeline();
        this.renderEditor();
        this.updateExportJson();

        console.log('[Animator] Frame-by-Frame Pixel Studio initialized.');
    },

    createEmptyFrame() {
        const grid = new Uint8Array(64 * 32);
        this.frames.push(grid);
        return grid;
    },

    bindEvents() {
        const canvas = document.getElementById('animGridCanvas');
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            const pt = this.getGridPoint(e, canvas);
            const currentVal = this.getPixel(this.activeFrameIndex, pt.x, pt.y);
            this.drawMode = currentVal === 1 ? 0 : 1;
            this.setPixel(this.activeFrameIndex, pt.x, pt.y, this.drawMode);
            this.renderEditor();
            this.renderTimeline();
        });

        window.addEventListener('mouseup', () => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.updateExportJson();
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const pt = this.getGridPoint(e, canvas);
            const coords = document.getElementById('animCoords');
            if (coords) coords.textContent = `X: ${pt.x}, Y: ${pt.y}`;

            if (this.isDrawing) {
                this.setPixel(this.activeFrameIndex, pt.x, pt.y, this.drawMode);
                this.renderEditor();
                this.renderTimeline();
            }
        });

        // Controls
        document.getElementById('btnAnimAddFrame')?.addEventListener('click', () => {
            this.createEmptyFrame();
            this.activeFrameIndex = this.frames.length - 1;
            this.renderTimeline();
            this.renderEditor();
            App.showToast(`Added Frame #${this.frames.length}`);
        });

        document.getElementById('btnAnimDuplicateFrame')?.addEventListener('click', () => {
            if (this.frames.length === 0) return;
            const current = this.frames[this.activeFrameIndex];
            const copy = new Uint8Array(current);
            this.frames.splice(this.activeFrameIndex + 1, 0, copy);
            this.activeFrameIndex++;
            this.renderTimeline();
            this.renderEditor();
            App.showToast(`Duplicated Frame #${this.activeFrameIndex + 1}`);
        });

        document.getElementById('btnAnimDeleteFrame')?.addEventListener('click', () => {
            if (this.frames.length <= 1) {
                App.showToast('Must keep at least 1 frame!', 'error');
                return;
            }
            this.frames.splice(this.activeFrameIndex, 1);
            if (this.activeFrameIndex >= this.frames.length) {
                this.activeFrameIndex = this.frames.length - 1;
            }
            this.renderTimeline();
            this.renderEditor();
            App.showToast('Deleted Frame');
        });

        document.getElementById('btnAnimClearFrame')?.addEventListener('click', () => {
            if (this.frames[this.activeFrameIndex]) {
                this.frames[this.activeFrameIndex].fill(0);
                this.renderEditor();
                this.renderTimeline();
            }
        });

        document.getElementById('btnAnimInvertFrame')?.addEventListener('click', () => {
            const f = this.frames[this.activeFrameIndex];
            if (f) {
                for (let i = 0; i < f.length; i++) f[i] = f[i] === 1 ? 0 : 1;
                this.renderEditor();
                this.renderTimeline();
            }
        });

        // Play/Pause Loop Toggle
        document.getElementById('btnAnimPlayToggle')?.addEventListener('click', () => {
            this.togglePlay();
        });

        // FPS Slider
        const fpsSlider = document.getElementById('animFpsSlider');
        fpsSlider?.addEventListener('input', (e) => {
            this.fps = parseInt(e.target.value, 10);
            const fpsText = document.getElementById('animFpsText');
            if (fpsText) fpsText.textContent = `${this.fps} FPS`;
            if (this.isPlaying) {
                this.stopPlay();
                this.startPlay();
            }
        });

        // Onion skin toggle
        document.getElementById('chkOnionSkin')?.addEventListener('change', (e) => {
            this.onionSkin = e.target.checked;
            this.renderEditor();
        });

        // Presets
        document.querySelectorAll('.anim-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                this.loadPreset(preset);
            });
        });

        // Stream to ESP32 OLED
        document.getElementById('btnAnimStreamEsp')?.addEventListener('click', () => {
            this.streamActiveFrameToEsp32();
            App.showToast('Pushed Animation Frame to ESP32 OLED! 🎬');
        });

        // Copy JSON
        document.getElementById('btnCopyAnimJson')?.addEventListener('click', () => {
            const textarea = document.getElementById('animExportText');
            if (textarea) {
                navigator.clipboard.writeText(textarea.value);
                App.showToast('Copied Animation JSON to Clipboard!');
            }
        });
    },

    getGridPoint(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;

        const cellW = canvas.width / this.width;
        const cellH = canvas.height / this.height;

        return {
            x: Math.max(0, Math.min(this.width - 1, Math.floor(rawX / cellW))),
            y: Math.max(0, Math.min(this.height - 1, Math.floor(rawY / cellH)))
        };
    },

    getPixel(frameIdx, x, y) {
        const frame = this.frames[frameIdx];
        if (!frame || x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return frame[y * this.width + x];
    },

    setPixel(frameIdx, x, y, val) {
        const frame = this.frames[frameIdx];
        if (!frame || x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        frame[y * this.width + x] = val;
    },

    renderEditor() {
        const canvas = document.getElementById('animGridCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cellW = canvas.width / this.width;
        const cellH = canvas.height / this.height;

        // Onion Skinning (Previous Frame in Dim Orange/Gray)
        if (this.onionSkin && this.activeFrameIndex > 0) {
            const prev = this.frames[this.activeFrameIndex - 1];
            ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (prev[y * this.width + x] === 1) {
                        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                    }
                }
            }
        }

        // Active Frame Pixels
        const active = this.frames[this.activeFrameIndex];
        if (active) {
            ctx.fillStyle = '#ffffff';
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (active[y * this.width + x] === 1) {
                        ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                    }
                }
            }
        }

        // Subtle Pixel Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= canvas.width; x += cellW) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += cellH) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    },

    renderTimeline() {
        const strip = document.getElementById('animTimelineStrip');
        if (!strip) return;
        strip.innerHTML = '';

        this.frames.forEach((frame, idx) => {
            const thumb = document.createElement('div');
            thumb.className = `anim-frame-thumb ${idx === this.activeFrameIndex ? 'active' : ''}`;
            thumb.innerHTML = `
                <span class="anim-frame-thumb-badge">#${idx + 1}</span>
                <canvas width="64" height="32" style="width: 56px; height: 28px; image-rendering: pixelated;"></canvas>
            `;

            // Draw miniature preview
            const canvas = thumb.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, 64, 32);
                ctx.fillStyle = '#ffffff';
                for (let y = 0; y < this.height; y++) {
                    for (let x = 0; x < this.width; x++) {
                        if (frame[y * this.width + x] === 1) {
                            ctx.fillRect(x, y, 1, 1);
                        }
                    }
                }
            }

            thumb.addEventListener('click', () => {
                this.activeFrameIndex = idx;
                this.renderTimeline();
                this.renderEditor();
                this.renderPreview(idx);
            });

            strip.appendChild(thumb);
        });

        this.renderPreview(this.activeFrameIndex);
    },

    renderPreview(frameIdx) {
        const canvas = document.getElementById('animPreviewCanvas');
        const indicator = document.getElementById('animFrameIndicator');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 128, 64);

        const frame = this.frames[frameIdx];
        if (frame) {
            ctx.fillStyle = '#ffffff';
            // Scale 64x32 to 128x64 (2x)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (frame[y * this.width + x] === 1) {
                        ctx.fillRect(x * 2, y * 2, 2, 2);
                    }
                }
            }
        }

        if (indicator) {
            indicator.textContent = `Frame ${frameIdx + 1} of ${this.frames.length}`;
        }
    },

    togglePlay() {
        if (this.isPlaying) this.stopPlay();
        else this.startPlay();
    },

    startPlay() {
        this.isPlaying = true;
        const icon = document.getElementById('animPlayIcon');
        const text = document.getElementById('animPlayText');
        if (icon) icon.textContent = 'pause';
        if (text) text.textContent = 'Pause';

        let cur = 0;
        const interval = Math.max(30, Math.floor(1000 / this.fps));
        this.playTimer = setInterval(() => {
            this.renderPreview(cur);
            cur = (cur + 1) % this.frames.length;
        }, interval);
    },

    stopPlay() {
        this.isPlaying = false;
        if (this.playTimer) clearInterval(this.playTimer);
        const icon = document.getElementById('animPlayIcon');
        const text = document.getElementById('animPlayText');
        if (icon) icon.textContent = 'play_arrow';
        if (text) text.textContent = 'Play Loop';
        this.renderPreview(this.activeFrameIndex);
    },

    loadPreset(presetKey) {
        if (presetKey === 'blinking_eyes') {
            this.frames = [];
            // Create 3 frames of animated eye expressions
            for (let f = 0; f < 3; f++) {
                const grid = new Uint8Array(64 * 32);
                const eyeY = 12;
                const eye1X = 14;
                const eye2X = 38;

                if (f === 0) { // Big Open Eyes
                    this.drawCircleToGrid(grid, eye1X, eyeY, 7);
                    this.drawCircleToGrid(grid, eye2X, eyeY, 7);
                } else if (f === 1) { // Half Open
                    for (let x = eye1X - 7; x <= eye1X + 7; x++) grid[(eyeY + 2) * 64 + x] = 1;
                    for (let x = eye2X - 7; x <= eye2X + 7; x++) grid[(eyeY + 2) * 64 + x] = 1;
                } else { // Blink Line
                    for (let x = eye1X - 8; x <= eye1X + 8; x++) grid[eyeY * 64 + x] = 1;
                    for (let x = eye2X - 8; x <= eye2X + 8; x++) grid[eyeY * 64 + x] = 1;
                }
                this.frames.push(grid);
            }
        } else if (presetKey === 'pulsing_heart') {
            this.frames = [];
            for (let s = 1; s <= 3; s++) {
                const grid = new Uint8Array(64 * 32);
                this.drawHeartToGrid(grid, 32, 16, s * 3);
                this.frames.push(grid);
            }
        }

        this.activeFrameIndex = 0;
        this.renderTimeline();
        this.renderEditor();
        this.updateExportJson();
        App.showToast(`Loaded Preset: ${presetKey}`);
    },

    drawCircleToGrid(grid, cx, cy, r) {
        for (let y = -r; y <= r; y++) {
            for (let x = -r; x <= r; x++) {
                if (x * x + y * y <= r * r) {
                    const gx = cx + x;
                    const gy = cy + y;
                    if (gx >= 0 && gx < 64 && gy >= 0 && gy < 32) {
                        grid[gy * 64 + gx] = 1;
                    }
                }
            }
        }
    },

    drawHeartToGrid(grid, cx, cy, size) {
        for (let y = -size; y <= size; y++) {
            for (let x = -size; x <= size; x++) {
                const nx = x / size;
                const ny = y / size;
                const formula = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);
                if (formula <= 0) {
                    const gx = cx + x;
                    const gy = cy - y;
                    if (gx >= 0 && gx < 64 && gy >= 0 && gy < 32) {
                        grid[gy * 64 + gx] = 1;
                    }
                }
            }
        }
    },

    streamActiveFrameToEsp32() {
        const frame = this.frames[this.activeFrameIndex];
        if (!frame) return;

        // Convert 64x32 grid to 1024-byte (128x64 / 8) bitmap buffer
        const buffer = new Uint8Array(1024);
        for (let y = 0; y < 64; y++) {
            const srcY = Math.floor(y / 2);
            for (let x = 0; x < 128; x++) {
                const srcX = Math.floor(x / 2);
                if (frame[srcY * 64 + srcX] === 1) {
                    const byteIdx = (y * 128 + x) >> 3;
                    const bitIdx = 7 - (x & 7);
                    buffer[byteIdx] |= (1 << bitIdx);
                }
            }
        }

        // Send binary buffer directly via WebSocket
        if (Connection.ws && Connection.ws.readyState === WebSocket.OPEN) {
            Connection.ws.send(buffer);
        }
    },

    updateExportJson() {
        const exportArea = document.getElementById('animExportText');
        if (!exportArea) return;
        const data = {
            framesCount: this.frames.length,
            fps: this.fps,
            resolution: `${this.width}x${this.height}`
        };
        exportArea.value = JSON.stringify(data, null, 2);
    }
};

window.Animator = Animator;
