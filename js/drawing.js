/**
 * Drawing Studio - 128x64 Monochrome Pixel Canvas, High-Performance Tools & 1024-Byte SSD1306 Encoder
 */

class DrawingStudio {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d', { willReadFrequently: true }) : null;
        this.width = 128;
        this.height = 64;

        this.currentTool = 'pencil';
        this.brushSize = 1;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;

        // Undo & Redo stacks
        this.history = [];
        this.redoStack = [];
        this.maxHistory = 30;

        // 128x64 binary pixel matrix (0 or 1)
        this.pixels = new Uint8Array(this.width * this.height);
        // Temporary preview matrix for shapes
        this.previewPixels = new Uint8Array(this.width * this.height);
    }

    init() {
        if (!this.canvas || !this.ctx) return;

        this.clearCanvas(false);
        this.saveState();

        // Pointer event listeners (Mouse, Touch, Stylus)
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', () => this.onPointerUp());
        window.addEventListener('pointercancel', () => this.onPointerUp());

        // Tool buttons — class="tool-btn" data-tool="..."
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.getAttribute('data-tool');
                App.showToast(`Tool: ${this.currentTool.toUpperCase()} ✏️`);
            });
        });

        // Preset shape buttons — class="preset-btn" data-preset="..."
        document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                if (preset) this.loadPreset(preset);
            });
        });

        // Action buttons — IDs from index.html
        document.getElementById('btnClearDrawing')?.addEventListener('click', () => {
            this.clearCanvas();
            this.saveState();
            App.showToast('Canvas Cleared 🧹');
        });
        
        document.getElementById('btnInvertDrawing')?.addEventListener('click', () => {
            this.invertCanvas();
            App.showToast('Canvas Inverted 🌓');
        });
        
        document.getElementById('btnSendDrawing')?.addEventListener('click', () => {
            this.sendToOled();
        });

        // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete)
        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) this.redo();
                else this.undo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
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
        this.canvas.setPointerCapture?.(e.pointerId);
        this.isDrawing = true;
        const { x, y } = this.getCanvasCoords(e);
        this.startX = x;
        this.startY = y;
        this.lastX = x;
        this.lastY = y;

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

        if (!this.isDrawing) return;

        if (this.currentTool === 'pencil') {
            this.drawLineInterpolated(this.lastX, this.lastY, x, y, 1);
            this.renderFromMatrix();
            this.lastX = x;
            this.lastY = y;
        } else if (this.currentTool === 'eraser') {
            this.drawLineInterpolated(this.lastX, this.lastY, x, y, 0);
            this.renderFromMatrix();
            this.lastX = x;
            this.lastY = y;
        } else if (['line', 'rect', 'circle'].includes(this.currentTool)) {
            // Live preview while dragging
            this.previewShape(this.startX, this.startY, x, y);
            this.lastX = x;
            this.lastY = y;
        }
    }

    onPointerUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (['line', 'rect', 'circle'].includes(this.currentTool)) {
            this.applyShape(this.startX, this.startY, this.lastX, this.lastY, 1);
            this.renderFromMatrix();
        }

        this.saveState();
    }

    plotPoint(cx, cy, val, targetMatrix = this.pixels) {
        if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) {
            targetMatrix[cy * this.width + cx] = val;
        }
    }

    drawLineInterpolated(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        let currX = x0;
        let currY = y0;

        while (true) {
            this.plotPoint(currX, currY, val, targetMatrix);
            if (currX === x1 && currY === y1) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currY += sy;
            }
        }
    }

    drawRect(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        for (let x = minX; x <= maxX; x++) {
            this.plotPoint(x, minY, val, targetMatrix);
            this.plotPoint(x, maxY, val, targetMatrix);
        }
        for (let y = minY; y <= maxY; y++) {
            this.plotPoint(minX, y, val, targetMatrix);
            this.plotPoint(maxX, y, val, targetMatrix);
        }
    }

    drawCircle(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const r = Math.round(Math.hypot(x1 - x0, y1 - y0));
        let x = r;
        let y = 0;
        let err = 0;

        while (x >= y) {
            this.plotPoint(x0 + x, y0 + y, val, targetMatrix);
            this.plotPoint(x0 + y, y0 + x, val, targetMatrix);
            this.plotPoint(x0 - y, y0 + x, val, targetMatrix);
            this.plotPoint(x0 - x, y0 + y, val, targetMatrix);
            this.plotPoint(x0 - x, y0 - y, val, targetMatrix);
            this.plotPoint(x0 - y, y0 - x, val, targetMatrix);
            this.plotPoint(x0 + y, y0 - x, val, targetMatrix);
            this.plotPoint(x0 + x, y0 - y, val, targetMatrix);

            if (err <= 0) {
                y += 1;
                err += 2 * y + 1;
            }
            if (err > 0) {
                x -= 1;
                err -= 2 * x + 1;
            }
        }
    }

    applyShape(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        if (this.currentTool === 'line') {
            this.drawLineInterpolated(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'rect') {
            this.drawRect(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'circle') {
            this.drawCircle(x0, y0, x1, y1, val, targetMatrix);
        }
    }

    previewShape(x0, y0, x1, y1) {
        this.previewPixels.set(this.pixels);
        this.applyShape(x0, y0, x1, y1, 1, this.previewPixels);
        this.renderFromMatrix(this.previewPixels);
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

    renderFromMatrix(matrix = this.pixels) {
        if (!this.ctx) return;
        const imgData = this.ctx.createImageData(this.width, this.height);
        for (let i = 0; i < matrix.length; i++) {
            const val = matrix[i] ? 255 : 0;
            const idx = i * 4;
            // Clouds #ECF0F1 pixels on deep midnight navy (#141d26) backdrop
            imgData.data[idx] = val ? 236 : 20;     // R
            imgData.data[idx + 1] = val ? 240 : 29; // G
            imgData.data[idx + 2] = val ? 241 : 38; // B
            imgData.data[idx + 3] = 255;            // Alpha
        }

        // Render at 128x64 offscreen, then draw scaled to 512x256
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        tempCanvas.getContext('2d').putImageData(imgData, 0, 0);

        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);
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
            App.showToast('Undo ↩️');
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.history.push(nextState);
            this.pixels.set(nextState);
            this.renderFromMatrix();
            App.showToast('Redo ↪️');
        }
    }

    loadPreset(presetName) {
        this.clearCanvas(false);
        const cx = 64;
        const cy = 32;

        if (presetName === 'heart') {
            for (let y = 0; y < 64; y++) {
                for (let x = 0; x < 128; x++) {
                    const nx = (x - cx) / 22;
                    const ny = -(y - cy) / 22;
                    const f = nx * nx + ny * ny - 1;
                    if (f * f * f - nx * nx * ny * ny * ny <= 0) {
                        this.pixels[y * 128 + x] = 1;
                    }
                }
            }
        } else if (presetName === 'smile') {
            this.drawCircle(cx, cy, cx + 24, cy, 1);
            this.plotPoint(54, 25, 1);
            this.plotPoint(74, 25, 1);
            for (let a = 20; a <= 160; a++) {
                const rad = a * (Math.PI / 180);
                const x = Math.round(cx + Math.cos(rad) * 14);
                const y = Math.round(cy + Math.sin(rad) * 14);
                if (x >= 0 && x < 128 && y >= 0 && y < 64) this.pixels[y * 128 + x] = 1;
            }
        } else if (presetName === 'star') {
            const points = [];
            for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? 24 : 10;
                const a = (i * Math.PI) / 5 - Math.PI / 2;
                points.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
            }
            for (let i = 0; i < points.length; i++) {
                const p1 = points[i];
                const p2 = points[(i + 1) % points.length];
                this.drawLineInterpolated(p1[0], p1[1], p2[0], p2[1], 1);
            }
            this.floodFill(cx, cy, 1);
        } else if (presetName === 'robot') {
            // Head
            this.drawRect(44, 18, 84, 48, 1);
            // Antenna
            this.drawLineInterpolated(64, 18, 64, 10, 1);
            this.drawCircle(64, 8, 64 + 3, 8, 1);
            // Eyes
            this.drawRect(50, 26, 58, 34, 1);
            this.drawRect(70, 26, 78, 34, 1);
            // Mouth
            this.drawLineInterpolated(52, 42, 76, 42, 1);
            for (let x = 54; x <= 74; x += 4) {
                this.drawLineInterpolated(x, 40, x, 44, 1);
            }
        } else if (presetName === 'cat') {
            // Head outline
            this.drawCircle(cx, 36, cx + 20, 36, 1);
            // Left Ear
            this.drawLineInterpolated(48, 22, 42, 8, 1);
            this.drawLineInterpolated(42, 8, 56, 18, 1);
            // Right Ear
            this.drawLineInterpolated(80, 22, 86, 8, 1);
            this.drawLineInterpolated(86, 8, 72, 18, 1);
            // Eyes
            this.plotPoint(56, 32, 1);
            this.plotPoint(72, 32, 1);
            // Nose
            this.plotPoint(64, 38, 1);
            // Whiskers
            this.drawLineInterpolated(42, 36, 54, 37, 1);
            this.drawLineInterpolated(42, 42, 54, 40, 1);
            this.drawLineInterpolated(86, 36, 74, 37, 1);
            this.drawLineInterpolated(86, 42, 74, 40, 1);
        } else if (presetName === 'ghost') {
            // Retro Pac-Man Ghost
            this.drawRect(48, 24, 80, 48, 1);
            this.drawCircle(64, 24, 64 + 16, 24, 1);
            // Bottom waves
            this.drawLineInterpolated(48, 48, 54, 54, 1);
            this.drawLineInterpolated(54, 54, 60, 48, 1);
            this.drawLineInterpolated(60, 48, 66, 54, 1);
            this.drawLineInterpolated(66, 54, 72, 48, 1);
            this.drawLineInterpolated(72, 48, 78, 54, 1);
            this.drawLineInterpolated(78, 54, 80, 48, 1);
            // Eyes
            this.drawRect(54, 24, 60, 30, 1);
            this.drawRect(68, 24, 74, 30, 1);
            this.floodFill(64, 32, 1);
        }

        this.renderFromMatrix();
        this.saveState();
        App.showToast(`Loaded Shape: ${presetName.toUpperCase()} ✨`);
    }

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

        const sentWs = Connection.sendWs({
            type: 'drawing_bitmap',
            data: hexData
        });

        if (!sentWs) {
            Connection.post('/api/drawing', { bitmap: hexData });
        }

        // Switch ESP32 display to Drawing page immediately
        Connection.sendWs({ type: 'set_page', page: 'drawing' });
        Connection.post('/api/page', { page: 'drawing' });

        App.showToast('Drawing Sent to ESP32 OLED Screen!');
    }
}

window.DrawingStudioInstance = new DrawingStudio();
document.addEventListener('DOMContentLoaded', () => window.DrawingStudioInstance.init());
