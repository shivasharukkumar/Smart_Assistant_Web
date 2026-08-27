/**
 * Drawing Studio - 128x64 Monochrome Pixel Canvas, Tools, and 1024-Byte Bitmap Encoder
 */

class DrawingStudio {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { willReadFrequently: true }) : null;
        this.width = 128;
        this.height = 64;
        this.scale = 4;

        this.currentTool = 'pencil';
        this.brushSize = 1;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;

        // Undo & Redo stacks
        this.history = [];
        this.redoStack = [];
        this.maxHistory = 20;

        // 128x64 binary pixel matrix (0 or 1)
        this.pixels = new Uint8Array(this.width * this.height);
    }

    init() {
        if (!this.canvas || !this.ctx) return;

        this.clearCanvas(false);
        this.saveState();

        // Pointer event listeners (Mouse, Touch, Stylus)
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', () => this.onPointerUp());

        // Tool buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.getAttribute('data-tool');
            });
        });

        // Brush size slider
        const brushSlider = document.getElementById('brushSize');
        if (brushSlider) {
            brushSlider.addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value);
                const valEl = document.getElementById('valBrushSize');
                if (valEl) valEl.textContent = `${this.brushSize}px`;
            });
        }

        // Action buttons
        document.getElementById('btnUndo')?.addEventListener('click', () => this.undo());
        document.getElementById('btnRedo')?.addEventListener('click', () => this.redo());
        document.getElementById('btnInvert')?.addEventListener('click', () => this.invertCanvas());
        document.getElementById('btnClear')?.addEventListener('click', () => {
            this.clearCanvas();
            this.saveState();
        });

        // Presets selector
        const presetSelect = document.getElementById('presetSelector');
        if (presetSelect) {
            presetSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadPreset(e.target.value);
                    e.target.value = '';
                }
            });
        }

        // Send to OLED button
        document.getElementById('btnSendToOled')?.addEventListener('click', () => {
            this.sendToOled();
        });
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        return {
            x: Math.max(0, Math.min(this.width - 1, x)),
            y: Math.max(0, Math.min(this.height - 1, y))
        };
    }

    onPointerDown(e) {
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoords(e);
        this.startX = x;
        this.startY = y;

        if (this.currentTool === 'fill') {
            this.floodFill(x, y, 1);
            this.renderFromMatrix();
            this.saveState();
        } else if (this.currentTool === 'pencil') {
            this.plotPoint(x, y, 1);
            this.renderFromMatrix();
        } else if (this.currentTool === 'eraser') {
            this.plotPoint(x, y, 0);
            this.renderFromMatrix();
        }
    }

    onPointerMove(e) {
        const { x, y } = this.getCanvasCoords(e);
        const coordsEl = document.getElementById('canvasCoords');
        if (coordsEl) coordsEl.textContent = `X: ${x}, Y: ${y}`;

        if (!this.isDrawing) return;

        if (this.currentTool === 'pencil') {
            this.plotPoint(x, y, 1);
            this.renderFromMatrix();
        } else if (this.currentTool === 'eraser') {
            this.plotPoint(x, y, 0);
            this.renderFromMatrix();
        }
    }

    onPointerUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (['line', 'rect', 'circle'].includes(this.currentTool)) {
            // Apply geometric shape
            this.applyShape(this.startX, this.startY, this.lastX || this.startX, this.lastY || this.startY);
        }

        this.saveState();
    }

    plotPoint(cx, cy, val) {
        const r = Math.floor(this.brushSize / 2);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const px = cx + dx;
                const py = cy + dy;
                if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                    this.pixels[py * this.width + px] = val;
                }
            }
        }
    }

    clearCanvas(render = true) {
        this.pixels.fill(0);
        if (render) this.renderFromMatrix();
    }

    invertCanvas() {
        for (let i = 0; i < this.pixels.length; i++) {
            this.pixels[i] = this.pixels[i] ? 0 : 1;
        }
        this.renderFromMatrix();
        this.saveState();
    }

    floodFill(startX, startY, fillVal) {
        const targetVal = this.pixels[startY * this.width + startX];
        if (targetVal === fillVal) return;

        const queue = [[startX, startY]];
        while (queue.length > 0) {
            const [x, y] = queue.pop();
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            const idx = y * this.width + x;
            if (this.pixels[idx] !== targetVal) continue;

            this.pixels[idx] = fillVal;
            queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
    }

    renderFromMatrix() {
        if (!this.ctx) return;
        const imgData = this.ctx.createImageData(this.width, this.height);
        for (let i = 0; i < this.pixels.length; i++) {
            const val = this.pixels[i] ? 255 : 0;
            const idx = i * 4;
            // Cyan colored pixels on dark backdrop
            imgData.data[idx] = val ? 0 : 8;       // R
            imgData.data[idx + 1] = val ? 240 : 12; // G
            imgData.data[idx + 2] = val ? 255 : 18; // B
            imgData.data[idx + 3] = 255;            // A
        }
        this.ctx.putImageData(imgData, 0, 0);
    }

    saveState() {
        this.history.push(new Uint8Array(this.pixels));
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = [];
    }

    undo() {
        if (this.history.length > 1) {
            this.redoStack.push(this.history.pop());
            const prevState = this.history[this.history.length - 1];
            this.pixels.set(prevState);
            this.renderFromMatrix();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.history.push(nextState);
            this.pixels.set(nextState);
            this.renderFromMatrix();
        }
    }

    loadPreset(presetName) {
        this.clearCanvas(false);
        const cx = 64;
        const cy = 32;

        if (presetName === 'heart') {
            for (let y = 0; y < 64; y++) {
                for (let x = 0; x < 128; x++) {
                    const nx = (x - cx) / 25;
                    const ny = -(y - cy) / 25;
                    const f = nx * nx + ny * ny - 1;
                    if (f * f * f - nx * nx * ny * ny * ny <= 0) {
                        this.pixels[y * 128 + x] = 1;
                    }
                }
            }
        } else if (presetName === 'smile') {
            for (let a = 0; a < 360; a++) {
                const rad = a * (Math.PI / 180);
                const x = Math.round(cx + Math.cos(rad) * 24);
                const y = Math.round(cy + Math.sin(rad) * 24);
                if (x >= 0 && x < 128 && y >= 0 && y < 64) this.pixels[y * 128 + x] = 1;
            }
            this.plotPoint(54, 25, 1);
            this.plotPoint(74, 25, 1);
            for (let a = 20; a <= 160; a++) {
                const rad = a * (Math.PI / 180);
                const x = Math.round(cx + Math.cos(rad) * 14);
                const y = Math.round(cy + Math.sin(rad) * 14);
                if (x >= 0 && x < 128 && y >= 0 && y < 64) this.pixels[y * 128 + x] = 1;
            }
        } else {
            // Send preset directly by name
            Connection.apiPost('/api/drawing', { preset: presetName });
        }

        this.renderFromMatrix();
        this.saveState();
        App.showToast(`Loaded Preset: ${presetName.toUpperCase()}`);
    }

    /**
     * Packs 128x64 (8192 pixels) into 1024 bytes (1-bit monochrome SSD1306 buffer)
     * Format: byte = x + Math.floor(y / 8) * 128, bit = (y % 8)
     */
    encode1BitBitmap() {
        const buffer = new Uint8Array(1024);
        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 128; x++) {
                const pixel = this.pixels[y * 128 + x];
                if (pixel) {
                    const byteIdx = x + Math.floor(y / 8) * 128;
                    const bitMask = 1 << (y % 8);
                    buffer[byteIdx] |= bitMask;
                }
            }
        }
        return buffer;
    }

    bitmapToHex(buffer) {
        let hex = '';
        for (let i = 0; i < buffer.length; i++) {
            hex += buffer[i].toString(16).padStart(2, '0');
        }
        return hex;
    }

    sendToOled() {
        const buffer = this.encode1BitBitmap();
        const hexData = this.bitmapToHex(buffer);

        // Try WebSocket first for ultra-low latency, fallback to REST
        const sentWs = Connection.sendWs({
            type: 'drawing_bitmap',
            data: hexData
        });

        if (!sentWs) {
            Connection.apiPost('/api/drawing', { bitmap: hexData });
        }

        App.showToast('Drawing Sent to ESP32 OLED Screen! 🚀');
    }
}

window.DrawingStudioInstance = new DrawingStudio();
