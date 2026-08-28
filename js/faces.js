/**
 * Face Studio - 30 Animated Physical Eye Expressions matching ESP32 FaceManager
 */

const FACES_LIST = [
    { id: 'happy', name: 'Happy' },
    { id: 'normal', name: 'Normal' },
    { id: 'laugh', name: 'Laughing' },
    { id: 'love', name: 'Love' },
    { id: 'sleep', name: 'Sleep' },
    { id: 'sleepy', name: 'Sleepy' },
    { id: 'angry', name: 'Angry' },
    { id: 'sad', name: 'Sad' },
    { id: 'cry', name: 'Crying' },
    { id: 'shock', name: 'Shocked' },
    { id: 'thinking', name: 'Thinking' },
    { id: 'confused', name: 'Confused' },
    { id: 'cool', name: 'Cool Glasses' },
    { id: 'robot', name: 'Pixel Robot' },
    { id: 'surprised', name: 'Surprised' },
    { id: 'heart_eyes', name: 'Heart Eyes' },
    { id: 'dizzy', name: 'Dizzy Swirl' },
    { id: 'excited', name: 'Excited' },
    { id: 'scared', name: 'Scared' },
    { id: 'nervous', name: 'Nervous' },
    { id: 'sweat', name: 'Hot Sweat' },
    { id: 'shiver', name: 'Cold Shiver' },
    { id: 'wink', name: 'Wink' },
    { id: 'yawn', name: 'Yawn' },
    { id: 'neutral', name: 'Neutral' },
    { id: 'suspicious', name: 'Suspicious' },
    { id: 'look_left', name: 'Look Left' },
    { id: 'look_right', name: 'Look Right' },
    { id: 'look_up', name: 'Look Up' },
    { id: 'look_down', name: 'Look Down' }
];

function drawHeart(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + size / 5);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 2, x + size / 2, y + (size + topCurveHeight) / 1.5, x + size / 2, y + size);
    ctx.bezierCurveTo(x + size / 2, y + (size + topCurveHeight) / 1.5, x + size, y + (size + topCurveHeight) / 2, x + size, y + topCurveHeight);
    ctx.bezierCurveTo(x + size, y, x + size / 2, y, x + size / 2, y + size / 5);
    ctx.fill();
}

function drawDrop(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + size, y + size, x, y + size * 1.5);
    ctx.quadraticCurveTo(x - size, y + size, x, y);
    ctx.fill();
}

const FaceRenderer = {
    drawFace(ctx, mood, frame = 0, color = '#ffffff', bgColor = '#0f172a') {
        const breath = Math.sin(frame * 0.05) * 1.5;
        const blinkCycle = frame % 100;
        const isBlinking = (mood !== 'sleep' && mood !== 'wink' && mood !== 'heart_eyes') && (blinkCycle >= 92);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 128, 64);

        const fillRoundRect = (x, y, w, h, r) => {
            if (w <= 0 || h <= 0) return;
            r = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.fill();
        };

        // Base geometry matching ESP32 FaceManager.cpp
        let lw = 36, rw = 36, lh = 36 + breath, rh = 36 + breath;
        let lx = 18, rx = 74, ly = 14, ry = 14;
        let pupilX = 0, pupilY = 0;

        switch (mood) {
            case 'happy': case 'love': case 'heart_eyes':
                lw = rw = 40; lh = rh = 32; break;
            case 'laugh': case 'excited':
                lw = rw = 42; lh = rh = 26; break;
            case 'shock': case 'surprised': case 'scared':
                lw = rw = 30; lh = rh = 45; break;
            case 'sleepy': case 'yawn':
                lw = rw = 38; lh = rh = 30; break;
            case 'sleep':
                lw = rw = 36; lh = rh = 4; break;
            case 'angry':
                lw = rw = 34; lh = rh = 32; break;
            case 'sad': case 'cry':
                lw = rw = 34; lh = rh = 40; break;
            case 'suspicious':
                lw = 36; lh = 20; rw = 36; rh = 42; break;
            case 'cool': case 'robot': case 'neutral':
                lw = rw = 34; lh = rh = 28; break;
            case 'nervous': case 'confused': case 'thinking':
            case 'sweat': case 'shiver':
                lw = rw = 32; lh = rh = 34; break;
            case 'wink':
                lw = rw = 36; lh = rh = 32; break;
        }

        // Gaze simulation
        if (mood === 'look_left') pupilX = -9;
        else if (mood === 'look_right') pupilX = 9;
        else if (mood === 'look_up') pupilY = -7;
        else if (mood === 'look_down') pupilY = 7;
        else if (mood === 'dizzy') {
            pupilX = Math.cos(frame * 0.15) * 7;
            pupilY = Math.sin(frame * 0.15) * 7;
        } else {
            const wander = Math.floor(frame / 60) % 4;
            if (wander === 1) { pupilX = 4; pupilY = 2; }
            else if (wander === 3) { pupilX = -4; pupilY = -2; }
        }

        if (isBlinking) {
            lh = 3; rh = 3;
        }

        // 1. Emotion Particles
        ctx.fillStyle = color;
        if (mood === 'love') {
            drawHeart(ctx, 58, 2, 12, color);
        } else if (mood === 'sleep' || mood === 'sleepy') {
            ctx.font = 'bold 9px monospace';
            const floatZ = (frame % 30);
            ctx.fillText('Z', 106, 16 - floatZ * 0.4);
            ctx.font = 'bold 7px monospace';
            ctx.fillText('z', 116, 11 - floatZ * 0.4);
        } else if (mood === 'angry') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(59, 3); ctx.lineTo(65, 9);
            ctx.moveTo(65, 3); ctx.lineTo(59, 9);
            ctx.stroke();
        } else if (mood === 'sweat') {
            drawDrop(ctx, 102, 6, 5, color);
        } else if (mood === 'thinking' || mood === 'confused') {
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('?', 104, 14);
        } else if (mood === 'dizzy') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(64, 8, 5, 0, Math.PI * 2.5);
            ctx.stroke();
        } else if (mood === 'cry') {
            drawDrop(ctx, 46, 36, 5, color);
            drawDrop(ctx, 76, 36, 5, color);
        }

        // 2. Eyes Drawing Routine
        const drawEye = (x, y, w, h, isLeft) => {
            if (mood === 'heart_eyes') {
                drawHeart(ctx, x + 8, y + 4, 20, color);
                return;
            }

            ctx.fillStyle = color;
            fillRoundRect(x, y, w, h, w < 20 ? 3 : 8);

            const pw = w / 2.2;
            const ph = h / 2.2;
            let px = x + w / 2 + pupilX - pw / 2;
            let py = y + h / 2 + pupilY - ph / 2;
            px = Math.max(x, Math.min(x + w - pw, px));
            py = Math.max(y, Math.min(y + h - ph, py));

            ctx.fillStyle = bgColor;
            if (mood === 'robot') {
                ctx.fillRect(px, py, pw, ph);
            } else {
                fillRoundRect(px, py, pw, ph, 4);
            }

            // Catchlight glint
            if (w > 15 && h > 15 && mood !== 'robot') {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(px + pw - 4, py + 4, 1.8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Eyelid masks matching FaceManager.cpp
            ctx.fillStyle = bgColor;
            if (mood === 'angry') {
                ctx.beginPath();
                if (isLeft) {
                    ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + w + 2, y + 10); ctx.lineTo(x - 2, y + 10);
                } else {
                    ctx.moveTo(x + w + 2, y - 2); ctx.lineTo(x - 2, y + 10); ctx.lineTo(x + w + 2, y + 10);
                }
                ctx.fill();
            } else if (mood === 'sad' || mood === 'cry') {
                ctx.beginPath();
                if (isLeft) {
                    ctx.moveTo(x + w + 2, y - 2); ctx.lineTo(x - 2, y + 10); ctx.lineTo(x + w + 2, y + 10);
                } else {
                    ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + w + 2, y + 10); ctx.lineTo(x - 2, y + 10);
                }
                ctx.fill();
            } else if (mood === 'happy' || mood === 'laugh' || mood === 'love' || mood === 'excited') {
                ctx.beginPath();
                ctx.arc(x + w / 2, y + h + 6, w / 1.3, 0, Math.PI * 2);
                ctx.fill();
            } else if (mood === 'sleepy' || mood === 'yawn') {
                ctx.fillRect(x - 1, y - 1, w + 2, h / 2 + 2);
            } else if (mood === 'sleep') {
                ctx.fillRect(x - 1, y - 1, w + 2, h);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 2, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2);
                ctx.stroke();
            } else if (mood === 'wink' && isLeft) {
                ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 2, y + h / 2); ctx.lineTo(x + w - 2, y + h / 2);
                ctx.stroke();
            } else if (mood === 'cool') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(x - 2, y + h / 2 - 4, w + 4, 10);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y + h / 2 - 6, w, 12);
            }
        };

        drawEye(lx, ly, lw, lh, true);
        drawEye(rx, ry, rw, rh, false);
    }
};

class FaceStudioManager {
    constructor() {
        this.activeFace = 'happy';
        this.miniCanvases = [];
    }

    init() {
        const grid = document.getElementById('facesGrid');
        if (!grid) return;
        grid.innerHTML = '';

        FACES_LIST.forEach(face => {
            const card = document.createElement('div');
            card.className = `face-card ${face.id === this.activeFace ? 'active' : ''}`;
            card.setAttribute('data-face-id', face.id);

            const canvas = document.createElement('canvas');
            canvas.className = 'face-canvas-mini';
            canvas.width = 128;
            canvas.height = 64;

            const title = document.createElement('div');
            title.className = 'face-title';
            title.textContent = face.name;

            card.appendChild(canvas);
            card.appendChild(title);
            grid.appendChild(card);

            this.miniCanvases.push({ id: face.id, canvas, ctx: canvas.getContext('2d') });

            card.addEventListener('click', () => {
                this.selectFace(face.id);
            });
        });

        // Switches
        const animToggle = document.getElementById('switchSaccades');
        if (animToggle) {
            animToggle.addEventListener('change', (e) => {
                Connection.sendWs({ type: 'set_face_anim', saccades: e.target.checked });
                Connection.post('/api/face', { saccades: e.target.checked });
            });
        }

        const blinkToggle = document.getElementById('switchBlinking');
        if (blinkToggle) {
            blinkToggle.addEventListener('change', (e) => {
                Connection.sendWs({ type: 'set_face_anim', blinking: e.target.checked });
                Connection.post('/api/face', { blinking: e.target.checked });
            });
        }

        const weatherMoodToggle = document.getElementById('switchWeatherMood');
        if (weatherMoodToggle) {
            weatherMoodToggle.addEventListener('change', (e) => {
                Connection.sendWs({ type: 'set_face_anim', weatherMood: e.target.checked });
                Connection.post('/api/face', { weatherMood: e.target.checked });
            });
        }

        // 30 FPS Render loop for all 30 mini cards
        let frame = 0;
        setInterval(() => {
            frame++;
            this.miniCanvases.forEach(item => {
                FaceRenderer.drawFace(item.ctx, item.id, frame, '#ffffff', '#0f172a');
            });
        }, 33);
    }

    selectFace(faceId) {
        this.activeFace = faceId;
        document.querySelectorAll('.face-card').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-face-id') === faceId);
        });

        Connection.sendWs({ type: 'set_face', face: faceId });
        Connection.post('/api/face', { face: faceId });

        if (window.App) App.showToast(`Active Face set to: ${faceId.toUpperCase()}`);
    }
}

window.FaceStudio = new FaceStudioManager();
window.FaceRenderer = FaceRenderer;
document.addEventListener('DOMContentLoaded', () => window.FaceStudio.init());
