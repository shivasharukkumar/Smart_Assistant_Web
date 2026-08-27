/**
 * Drawing Studio - 128x64 Monochrome Pixel Canvas, High-Performance Tools & 1024-Byte SSD1306 Encoder
 */

// 5x7 Basic ASCII Bitmap Font for text stamp tool
const BITMAP_FONT_5X7 = {
    'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
    'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
    'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
    'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
    'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
    'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
    'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
    'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
    'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
    'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
    'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
    'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
    'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
    'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
    'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
    'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
    'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
    'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
    'S': [0x46, 0x49, 0x49, 0x49, 0x31],
    'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
    'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
    'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
    'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
    'X': [0x63, 0x14, 0x08, 0x14, 0x63],
    'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
    'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
    '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
    '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
    '2': [0x42, 0x61, 0x51, 0x49, 0x46],
    '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
    '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
    '5': [0x27, 0x45, 0x45, 0x45, 0x39],
    '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
    '7': [0x01, 0x71, 0x09, 0x05, 0x03],
    '8': [0x36, 0x49, 0x49, 0x49, 0x36],
    '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
    '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
    '?': [0x02, 0x01, 0x51, 0x09, 0x06],
    ':': [0x00, 0x36, 0x36, 0x00, 0x00],
    '-': [0x08, 0x08, 0x08, 0x08, 0x08],
    '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
    '.': [0x00, 0x60, 0x60, 0x00, 0x00]
};

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
        this.syncTimer = null;

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
        this.saveState(false);

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
                App.showToast(`Tool: ${this.currentTool.replace('_', ' ').toUpperCase()} ✏️`);
            });
        });

        // Preset shape buttons — class="preset-btn" data-preset="..."
        document.querySelectorAll('.preset-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.getAttribute('data-preset');
                if (preset) this.loadPreset(preset);
            });
        });

        // Transform buttons — class="transform-btn" data-action="..."
        document.querySelectorAll('.transform-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'flip_h') this.flipHorizontal();
                else if (action === 'flip_v') this.flipVertical();
                else if (action === 'shift_left') this.shiftCanvas(-4, 0);
                else if (action === 'shift_right') this.shiftCanvas(4, 0);
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

        // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
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
        } else if (this.currentTool === 'text') {
            this.isDrawing = false;
            const text = prompt('Enter text to stamp on OLED canvas (max 20 chars):', 'HELLO');
            if (text) {
                this.stampText(x, y, text.toUpperCase());
                this.renderFromMatrix();
                this.saveState();
            }
        } else if (this.currentTool === 'pencil') {
            this.plotPoint(x, y, 1);
            this.renderFromMatrix();
        } else if (this.currentTool === 'brush') {
            this.drawBrushDab(x, y, 1);
            this.renderFromMatrix();
        } else if (this.currentTool === 'spray') {
            this.drawSpray(x, y, 1);
            this.renderFromMatrix();
        } else if (this.currentTool === 'eraser') {
            this.drawBrushDab(x, y, 0);
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
        } else if (this.currentTool === 'brush') {
            this.drawLineBrush(this.lastX, this.lastY, x, y, 1);
            this.renderFromMatrix();
            this.lastX = x;
            this.lastY = y;
        } else if (this.currentTool === 'spray') {
            this.drawSpray(x, y, 1);
            this.renderFromMatrix();
            this.lastX = x;
            this.lastY = y;
        } else if (this.currentTool === 'eraser') {
            this.drawLineBrush(this.lastX, this.lastY, x, y, 0);
            this.renderFromMatrix();
            this.lastX = x;
            this.lastY = y;
        } else if (['line', 'rect', 'filled_rect', 'circle', 'filled_circle'].includes(this.currentTool)) {
            // Live preview while dragging
            this.previewShape(this.startX, this.startY, x, y);
            this.lastX = x;
            this.lastY = y;
        }
    }

    onPointerUp() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (['line', 'rect', 'filled_rect', 'circle', 'filled_circle'].includes(this.currentTool)) {
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

    drawBrushDab(cx, cy, val, targetMatrix = this.pixels) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                this.plotPoint(cx + dx, cy + dy, val, targetMatrix);
            }
        }
    }

    drawSpray(cx, cy, val, targetMatrix = this.pixels) {
        const dots = 6;
        for (let i = 0; i < dots; i++) {
            const rad = Math.random() * Math.PI * 2;
            const r = Math.random() * 5;
            const px = Math.round(cx + Math.cos(rad) * r);
            const py = Math.round(cy + Math.sin(rad) * r);
            this.plotPoint(px, py, val, targetMatrix);
        }
    }

    drawLineBrush(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let currX = x0;
        let currY = y0;

        while (true) {
            this.drawBrushDab(currX, currY, val, targetMatrix);
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

    drawFilledRect(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const minX = Math.min(x0, x1);
        const maxX = Math.max(x0, x1);
        const minY = Math.min(y0, y1);
        const maxY = Math.max(y0, y1);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.plotPoint(x, y, val, targetMatrix);
            }
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

    drawFilledCircle(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        const r = Math.round(Math.hypot(x1 - x0, y1 - y0));
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r) {
                    this.plotPoint(x0 + dx, y0 + dy, val, targetMatrix);
                }
            }
        }
    }

    stampText(startX, startY, text) {
        let cursorX = startX;
        let cursorY = startY;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (cursorX + 5 >= this.width) {
                cursorX = startX;
                cursorY += 8;
            }
            if (cursorY + 7 >= this.height) break;

            const cols = BITMAP_FONT_5X7[char] || BITMAP_FONT_5X7['?'];
            for (let c = 0; c < 5; c++) {
                const colBits = cols[c];
                for (let r = 0; r < 7; r++) {
                    if (colBits & (1 << r)) {
                        this.plotPoint(cursorX + c, cursorY + r, 1);
                    }
                }
            }
            cursorX += 6; // 5 width + 1 spacing
        }
    }

    applyShape(x0, y0, x1, y1, val, targetMatrix = this.pixels) {
        if (this.currentTool === 'line') {
            this.drawLineInterpolated(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'rect') {
            this.drawRect(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'filled_rect') {
            this.drawFilledRect(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'circle') {
            this.drawCircle(x0, y0, x1, y1, val, targetMatrix);
        } else if (this.currentTool === 'filled_circle') {
            this.drawFilledCircle(x0, y0, x1, y1, val, targetMatrix);
        }
    }

    previewShape(x0, y0, x1, y1) {
        this.previewPixels.set(this.pixels);
        this.applyShape(x0, y0, x1, y1, 1, this.previewPixels);
        this.renderFromMatrix(this.previewPixels);
    }

    flipHorizontal() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width / 2; x++) {
                const idx1 = y * this.width + x;
                const idx2 = y * this.width + (this.width - 1 - x);
                const temp = this.pixels[idx1];
                this.pixels[idx1] = this.pixels[idx2];
                this.pixels[idx2] = temp;
            }
        }
        this.renderFromMatrix();
        this.saveState();
        App.showToast('Flipped Horizontally ↔️');
    }

    flipVertical() {
        for (let y = 0; y < this.height / 2; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx1 = y * this.width + x;
                const idx2 = (this.height - 1 - y) * this.width + x;
                const temp = this.pixels[idx1];
                this.pixels[idx1] = this.pixels[idx2];
                this.pixels[idx2] = temp;
            }
        }
        this.renderFromMatrix();
        this.saveState();
        App.showToast('Flipped Vertically ↕️');
    }

    shiftCanvas(dx, dy) {
        const copy = new Uint8Array(this.pixels);
        this.pixels.fill(0);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    this.pixels[ny * this.width + nx] = copy[y * this.width + x];
                }
            }
        }
        this.renderFromMatrix();
        this.saveState();
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
            if (this.pixels[y * this.width + x] !== targetVal) continue;

            this.pixels[y * this.width + x] = fillVal;
            queue.push([x + 1, y]);
            queue.push([x - 1, y]);
            queue.push([x, y + 1]);
            queue.push([x, y - 1]);
        }
    }

    renderFromMatrix(matrix = this.pixels) {
        if (!this.ctx) return;
        const imgData = this.ctx.createImageData(this.width, this.height);
        const data = imgData.data;

        for (let i = 0; i < matrix.length; i++) {
            const val = matrix[i] ? 255 : 0;
            const idx = i * 4;
            // Cyan-Neon glowing pixels (#22d3ee) on deep OLED slate (#090d16)
            if (val) {
                data[idx] = 34;      // R
                data[idx + 1] = 211; // G
                data[idx + 2] = 238; // B
                data[idx + 3] = 255; // A
            } else {
                data[idx] = 9;
                data[idx + 1] = 13;
                data[idx + 2] = 22;
                data[idx + 3] = 255;
            }
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        tempCanvas.getContext('2d').putImageData(imgData, 0, 0);

        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);
    }

    saveState(autoSync = true) {
        this.history.push(new Uint8Array(this.pixels));
        if (this.history.length > this.maxHistory) this.history.shift();
        this.redoStack = [];
        if (autoSync) {
            this.debounceSyncToOled();
        }
    }

    debounceSyncToOled() {
        if (this.syncTimer) clearTimeout(this.syncTimer);
        this.syncTimer = setTimeout(() => {
            this.sendToOled(false);
        }, 120);
    }

    undo() {
        if (this.history.length > 1) {
            this.redoStack.push(this.history.pop());
            const prevState = this.history[this.history.length - 1];
            this.pixels.set(prevState);
            this.renderFromMatrix();
            this.debounceSyncToOled();
            App.showToast('Undo ↩️');
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const nextState = this.redoStack.pop();
            this.history.push(nextState);
            this.pixels.set(nextState);
            this.renderFromMatrix();
            this.debounceSyncToOled();
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
        } else if (presetName === 'skull') {
            // Skull cranium
            this.drawFilledCircle(cx, 26, cx + 18, 26, 1);
            this.drawFilledRect(52, 34, 76, 48, 1);
            // Eye sockets
            this.drawFilledCircle(56, 26, 60, 26, 0);
            this.drawFilledCircle(72, 26, 76, 26, 0);
            // Nose cavity
            this.plotPoint(64, 34, 0);
            this.plotPoint(63, 35, 0);
            this.plotPoint(65, 35, 0);
            // Teeth slits
            for (let x = 56; x <= 72; x += 4) {
                this.drawLineInterpolated(x, 42, x, 48, 0);
            }
        } else if (presetName === 'fire') {
            // Flame outer curves
            this.drawLineInterpolated(cx, 8, 44, 46, 1);
            this.drawLineInterpolated(44, 46, cx, 56, 1);
            this.drawLineInterpolated(cx, 56, 84, 46, 1);
            this.drawLineInterpolated(84, 46, cx, 8, 1);
            // Inner flame tongue
            this.drawLineInterpolated(cx, 22, 54, 46, 1);
            this.drawLineInterpolated(54, 46, cx, 50, 1);
            this.drawLineInterpolated(cx, 50, 74, 46, 1);
            this.drawLineInterpolated(74, 46, cx, 22, 1);
            this.floodFill(cx, 34, 1);
        } else if (presetName === 'bolt') {
            // Lightning zig-zag
            this.drawLineInterpolated(68, 8, 48, 30, 1);
            this.drawLineInterpolated(48, 30, 64, 30, 1);
            this.drawLineInterpolated(64, 30, 52, 56, 1);
            this.drawLineInterpolated(52, 56, 80, 24, 1);
            this.drawLineInterpolated(80, 24, 64, 24, 1);
            this.drawLineInterpolated(64, 24, 68, 8, 1);
            this.floodFill(62, 28, 1);
        } else if (presetName === 'robot') {
            this.drawRect(44, 18, 84, 48, 1);
            this.drawLineInterpolated(64, 18, 64, 10, 1);
            this.drawCircle(64, 8, 64 + 3, 8, 1);
            this.drawRect(50, 26, 58, 34, 1);
            this.drawRect(70, 26, 78, 34, 1);
            this.drawLineInterpolated(52, 42, 76, 42, 1);
            for (let x = 54; x <= 74; x += 4) {
                this.drawLineInterpolated(x, 40, x, 44, 1);
            }
        } else if (presetName === 'cat') {
            this.drawCircle(cx, 36, cx + 20, 36, 1);
            this.drawLineInterpolated(48, 22, 42, 8, 1);
            this.drawLineInterpolated(42, 8, 56, 18, 1);
            this.drawLineInterpolated(80, 22, 86, 8, 1);
            this.drawLineInterpolated(86, 8, 72, 18, 1);
            this.plotPoint(56, 32, 1);
            this.plotPoint(72, 32, 1);
            this.plotPoint(64, 38, 1);
            this.drawLineInterpolated(42, 36, 54, 37, 1);
            this.drawLineInterpolated(42, 42, 54, 40, 1);
            this.drawLineInterpolated(86, 36, 74, 37, 1);
            this.drawLineInterpolated(86, 42, 74, 40, 1);
        } else if (presetName === 'ghost') {
            this.drawRect(48, 24, 80, 48, 1);
            this.drawCircle(64, 24, 64 + 16, 24, 1);
            this.drawLineInterpolated(48, 48, 54, 54, 1);
            this.drawLineInterpolated(54, 54, 60, 48, 1);
            this.drawLineInterpolated(60, 48, 66, 54, 1);
            this.drawLineInterpolated(66, 54, 72, 48, 1);
            this.drawLineInterpolated(72, 48, 78, 54, 1);
            this.drawLineInterpolated(78, 54, 80, 48, 1);
            this.drawRect(54, 24, 60, 30, 1);
            this.drawRect(68, 24, 74, 30, 1);
            this.floodFill(64, 32, 1);
        } else if (presetName === 'space_invader') {
            const invader = [
                "00011000",
                "00111100",
                "01111110",
                "11011011",
                "11111111",
                "00100100",
                "01011010",
                "10100101"
            ];
            const startX = 64 - 16;
            const startY = 32 - 16;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (invader[r][c] === '1') {
                        for (let py = 0; py < 4; py++) {
                            for (let px = 0; px < 4; px++) {
                                this.plotPoint(startX + c * 4 + px, startY + r * 4 + py, 1);
                            }
                        }
                    }
                }
            }
        } else if (presetName === 'gamepad') {
            this.drawRect(36, 20, 92, 44, 1);
            this.drawCircle(44, 32, 44 + 12, 32, 1);
            this.drawCircle(84, 32, 84 + 12, 32, 1);
            this.drawRect(46, 26, 50, 38, 1);
            this.drawRect(42, 30, 54, 34, 1);
            this.drawCircle(78, 28, 80, 28, 1);
            this.drawCircle(84, 34, 86, 34, 1);
        } else if (presetName === 'pacman') {
            this.drawFilledCircle(cx - 8, cy, cx + 16, cy, 1);
            // Mouth wedge
            for (let a = -35; a <= 35; a++) {
                const rad = a * (Math.PI / 180);
                this.drawLineInterpolated(cx - 8, cy, Math.round(cx - 8 + Math.cos(rad) * 26), Math.round(cy + Math.sin(rad) * 26), 0);
            }
            // Eye
            this.plotPoint(cx - 10, cy - 14, 0);
            this.plotPoint(cx - 9, cy - 14, 0);
            // Food dots
            this.drawFilledCircle(cx + 24, cy, cx + 27, cy, 1);
            this.drawFilledCircle(cx + 42, cy, cx + 45, cy, 1);
        } else if (presetName === 'sword') {
            // Blade
            this.drawLineInterpolated(36, 12, 84, 36, 1);
            this.drawLineInterpolated(38, 10, 86, 34, 1);
            this.drawLineInterpolated(36, 12, 38, 10, 1);
            // Crossguard
            this.drawLineInterpolated(80, 26, 90, 44, 1);
            this.drawLineInterpolated(78, 28, 88, 46, 1);
            // Hilt & Pommel
            this.drawLineInterpolated(85, 35, 96, 46, 1);
            this.drawFilledCircle(98, 48, 100, 48, 1);
        } else if (presetName === 'shield') {
            this.drawLineInterpolated(42, 14, 86, 14, 1);
            this.drawLineInterpolated(86, 14, 86, 36, 1);
            this.drawLineInterpolated(86, 36, 64, 54, 1);
            this.drawLineInterpolated(64, 54, 42, 36, 1);
            this.drawLineInterpolated(42, 36, 42, 14, 1);
            // Emblem Cross
            this.drawFilledRect(61, 20, 67, 44, 1);
            this.drawFilledRect(50, 27, 78, 33, 1);
        } else if (presetName === 'crown') {
            this.drawLineInterpolated(38, 48, 90, 48, 1);
            this.drawLineInterpolated(38, 48, 34, 20, 1);
            this.drawLineInterpolated(34, 20, 48, 32, 1);
            this.drawLineInterpolated(48, 32, 64, 14, 1);
            this.drawLineInterpolated(64, 14, 80, 32, 1);
            this.drawLineInterpolated(80, 32, 94, 20, 1);
            this.drawLineInterpolated(94, 20, 90, 48, 1);
            this.floodFill(64, 38, 1);
            this.drawFilledCircle(34, 18, 36, 18, 1);
            this.drawFilledCircle(64, 12, 66, 12, 1);
            this.drawFilledCircle(94, 18, 96, 18, 1);
        } else if (presetName === 'trophy') {
            this.drawFilledRect(48, 12, 80, 30, 1);
            this.drawLineInterpolated(48, 30, 64, 42, 1);
            this.drawLineInterpolated(80, 30, 64, 42, 1);
            this.floodFill(64, 34, 1);
            // Handles
            this.drawCircle(44, 22, 44 + 6, 22, 1);
            this.drawCircle(84, 22, 84 + 6, 22, 1);
            // Stem & Base
            this.drawFilledRect(61, 42, 67, 50, 1);
            this.drawFilledRect(48, 50, 80, 54, 1);
        } else if (presetName === 'diamond') {
            this.drawLineInterpolated(64, 12, 92, 28, 1);
            this.drawLineInterpolated(92, 28, 64, 52, 1);
            this.drawLineInterpolated(64, 52, 36, 28, 1);
            this.drawLineInterpolated(36, 28, 64, 12, 1);
            this.drawLineInterpolated(50, 28, 78, 28, 1);
            this.drawLineInterpolated(64, 12, 64, 52, 1);
            this.drawLineInterpolated(50, 28, 64, 52, 1);
            this.drawLineInterpolated(78, 28, 64, 52, 1);
        } else if (presetName === 'battery') {
            this.drawRect(36, 20, 88, 44, 1);
            this.drawFilledRect(88, 26, 92, 38, 1);
            this.drawFilledRect(42, 24, 52, 40, 1);
            this.drawFilledRect(56, 24, 66, 40, 1);
            this.drawFilledRect(70, 24, 80, 40, 1);
        } else if (presetName === 'wifi') {
            this.drawFilledCircle(cx, 48, cx + 4, 48, 1);
            for (let a = 210; a <= 330; a++) {
                const rad = a * (Math.PI / 180);
                this.plotPoint(Math.round(cx + Math.cos(rad) * 16), Math.round(52 + Math.sin(rad) * 16), 1);
                this.plotPoint(Math.round(cx + Math.cos(rad) * 26), Math.round(52 + Math.sin(rad) * 26), 1);
                this.plotPoint(Math.round(cx + Math.cos(rad) * 36), Math.round(52 + Math.sin(rad) * 36), 1);
            }
        } else if (presetName === 'coffee') {
            this.drawRect(44, 24, 76, 50, 1);
            this.drawCircle(82, 36, 82 + 6, 36, 1);
            this.drawLineInterpolated(50, 18, 52, 12, 1);
            this.drawLineInterpolated(60, 18, 60, 10, 1);
            this.drawLineInterpolated(70, 18, 68, 12, 1);
        } else if (presetName === 'music') {
            this.drawCircle(48, 44, 54, 44, 1);
            this.drawCircle(72, 38, 78, 38, 1);
            this.drawLineInterpolated(54, 44, 54, 18, 1);
            this.drawLineInterpolated(78, 38, 78, 12, 1);
            this.drawLineInterpolated(54, 18, 78, 12, 1);
            this.drawLineInterpolated(54, 22, 78, 16, 1);
        } else if (presetName === 'sun') {
            this.drawCircle(cx, cy, cx + 12, cy, 1);
            for (let a = 0; a < 360; a += 45) {
                const rad = a * (Math.PI / 180);
                const x1 = Math.round(cx + Math.cos(rad) * 16);
                const y1 = Math.round(cy + Math.sin(rad) * 16);
                const x2 = Math.round(cx + Math.cos(rad) * 24);
                const y2 = Math.round(cy + Math.sin(rad) * 24);
                this.drawLineInterpolated(x1, y1, x2, y2, 1);
            }
        } else if (presetName === 'flower') {
            // Flower Center
            this.drawFilledCircle(cx, cy, cx + 6, cy, 1);
            // 6 Petals
            for (let a = 0; a < 360; a += 60) {
                const rad = a * (Math.PI / 180);
                const px = Math.round(cx + Math.cos(rad) * 16);
                const py = Math.round(cy + Math.sin(rad) * 16);
                this.drawCircle(px, py, px + 7, py, 1);
            }
            // Stem
            this.drawLineInterpolated(cx, cy + 8, cx, 58, 1);
            this.drawLineInterpolated(cx, 48, cx + 8, 42, 1);
        } else if (presetName === 'tree') {
            // Pine Triangles
            this.drawLineInterpolated(cx, 8, 46, 26, 1);
            this.drawLineInterpolated(46, 26, 82, 26, 1);
            this.drawLineInterpolated(82, 26, cx, 8, 1);
            this.drawLineInterpolated(cx, 20, 42, 38, 1);
            this.drawLineInterpolated(42, 38, 86, 38, 1);
            this.drawLineInterpolated(86, 38, cx, 20, 1);
            this.drawLineInterpolated(cx, 32, 36, 50, 1);
            this.drawLineInterpolated(36, 50, 92, 50, 1);
            this.drawLineInterpolated(92, 50, cx, 32, 1);
            this.floodFill(cx, 22, 1);
            this.floodFill(cx, 34, 1);
            this.floodFill(cx, 44, 1);
            // Trunk
            this.drawFilledRect(60, 50, 68, 58, 1);
        } else if (presetName === 'rocket') {
            // Body
            this.drawFilledRect(58, 18, 70, 46, 1);
            // Nose Cone
            this.drawLineInterpolated(58, 18, cx, 6, 1);
            this.drawLineInterpolated(70, 18, cx, 6, 1);
            this.floodFill(cx, 14, 1);
            // Porthole
            this.drawFilledCircle(cx, 28, cx + 4, 28, 0);
            // Fins
            this.drawLineInterpolated(58, 38, 46, 48, 1);
            this.drawLineInterpolated(46, 48, 58, 48, 1);
            this.drawLineInterpolated(70, 38, 82, 48, 1);
            this.drawLineInterpolated(82, 48, 70, 48, 1);
            // Flame
            this.drawLineInterpolated(61, 46, cx, 58, 1);
            this.drawLineInterpolated(67, 46, cx, 58, 1);
        } else if (presetName === 'alien') {
            // UFO Dome
            this.drawCircle(cx, 26, cx + 12, 26, 1);
            // Saucer disk
            this.drawLineInterpolated(34, 34, 94, 34, 1);
            this.drawLineInterpolated(34, 34, 48, 44, 1);
            this.drawLineInterpolated(94, 34, 80, 44, 1);
            this.drawLineInterpolated(48, 44, 80, 44, 1);
            this.floodFill(cx, 38, 1);
            // Beams
            for (let x = 48; x <= 80; x += 8) {
                this.drawFilledCircle(x, 40, x + 2, 40, 0);
            }
        } else if (presetName === 'car') {
            // Roof
            this.drawLineInterpolated(48, 28, 60, 18, 1);
            this.drawLineInterpolated(60, 18, 80, 18, 1);
            this.drawLineInterpolated(80, 18, 92, 28, 1);
            // Body
            this.drawFilledRect(34, 28, 98, 42, 1);
            this.floodFill(68, 22, 1);
            // Windows
            this.drawFilledRect(52, 22, 62, 28, 0);
            this.drawFilledRect(66, 22, 78, 28, 0);
            // Wheels
            this.drawFilledCircle(48, 44, 54, 44, 1);
            this.drawFilledCircle(84, 44, 90, 44, 1);
            this.drawFilledCircle(48, 44, 50, 44, 0);
            this.drawFilledCircle(84, 44, 86, 44, 0);
        } else if (presetName === 'bell') {
            this.drawFilledCircle(cx, 22, cx + 14, 22, 1);
            this.drawFilledRect(50, 22, 78, 42, 1);
            this.drawFilledRect(44, 42, 84, 46, 1);
            // Clapper
            this.drawFilledCircle(cx, 48, cx + 4, 48, 1);
            // Top loop
            this.drawCircle(cx, 12, cx + 4, 12, 1);
        }

        this.renderFromMatrix();
        this.saveState();
        App.showToast(`Loaded Stamp: ${presetName.replace('_', ' ').toUpperCase()}`);
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

    sendToOled(showToast = false) {
        const buffer = this.encode1BitBitmap();
        const hexData = this.bitmapToHex(buffer);

        const sentWs = Connection.sendWs({
            type: 'drawing_bitmap',
            data: hexData
        });

        if (!sentWs) {
            Connection.post('/api/drawing', { bitmap: hexData });
        }

        // Switch ESP32 display to Drawing page
        Connection.sendWs({ type: 'set_page', page: 'drawing' });
        Connection.post('/api/page', { page: 'drawing' });

        if (showToast && window.App) {
            App.showToast('Drawing Sent to ESP32 OLED Screen!');
        }
    }
}

window.DrawingStudioInstance = new DrawingStudio();
window.DrawingStudio = window.DrawingStudioInstance;
document.addEventListener('DOMContentLoaded', () => window.DrawingStudio.init());
