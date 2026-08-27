/**
 * Face Studio - 12 Animated Facial Expressions & Parameter Tuning Engine
 */

const FACES_LIST = [
    { id: 'happy', name: 'Happy', emoji: '😊' },
    { id: 'normal', name: 'Normal', emoji: '😐' },
    { id: 'laugh', name: 'Laughing', emoji: '😆' },
    { id: 'love', name: 'Love', emoji: '😍' },
    { id: 'sleep', name: 'Sleep', emoji: '💤' },
    { id: 'sleepy', name: 'Sleepy', emoji: '😴' },
    { id: 'angry', name: 'Angry', emoji: '😠' },
    { id: 'sad', name: 'Sad', emoji: '😢' },
    { id: 'cry', name: 'Crying', emoji: '😭' },
    { id: 'shock', name: 'Shocked', emoji: '😱' },
    { id: 'thinking', name: 'Thinking', emoji: '🤔' },
    { id: 'confused', name: 'Confused', emoji: '😕' },
    { id: 'cool', name: 'Cool Glasses', emoji: '😎' },
    { id: 'robot', name: 'Pixel Robot', emoji: '🤖' },
    { id: 'surprised', name: 'Surprised', emoji: '😮' },
    { id: 'heart_eyes', name: 'Heart Eyes', emoji: '💖' },
    { id: 'dizzy', name: 'Dizzy Swirl', emoji: '💫' },
    { id: 'excited', name: 'Excited', emoji: '🤩' },
    { id: 'scared', name: 'Scared', emoji: '😨' },
    { id: 'nervous', name: 'Nervous', emoji: '😬' },
    { id: 'sweat', name: 'Hot Sweat', emoji: '🥵' },
    { id: 'shiver', name: 'Cold Shiver', emoji: '🥶' },
    { id: 'wink', name: 'Wink', emoji: '😉' },
    { id: 'yawn', name: 'Yawn', emoji: '🥱' },
    { id: 'neutral', name: 'Neutral', emoji: '😶' },
    { id: 'suspicious', name: 'Suspicious', emoji: '🤨' },
    { id: 'look_left', name: 'Look Left', emoji: '👈' },
    { id: 'look_right', name: 'Look Right', emoji: '👉' },
    { id: 'look_up', name: 'Look Up', emoji: '👆' },
    { id: 'look_down', name: 'Look Down', emoji: '👇' }
];

const FaceRenderer = {
    drawFace(ctx, faceType, frame = 0, color = '#00f0ff') {
        const sine = Math.sin(frame * 0.08) * 2;
        const blinkCycle = frame % 90;
        const isBlinking = blinkCycle >= 84;

        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        switch (faceType) {
            case 'happy': {
                // Curved smiling eyes
                if (isBlinking) {
                    ctx.beginPath(); ctx.moveTo(28, 26 + sine); ctx.lineTo(52, 26 + sine); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(76, 26 + sine); ctx.lineTo(100, 26 + sine); ctx.stroke();
                } else {
                    ctx.beginPath(); ctx.arc(40, 26 + sine, 12, Math.PI, 0, false); ctx.stroke();
                    ctx.beginPath(); ctx.arc(88, 26 + sine, 12, Math.PI, 0, false); ctx.stroke();
                }
                // Joyful mouth
                ctx.beginPath(); ctx.arc(64, 42 + sine, 14, 0, Math.PI, false); ctx.fill();
                break;
            }

            case 'normal': {
                // Round blinking eyes
                const ry = isBlinking ? 1 : 10;
                ctx.beginPath(); ctx.ellipse(40, 26 + sine, 10, ry, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(88, 26 + sine, 10, ry, 0, 0, Math.PI * 2); ctx.fill();
                // Gentle smile
                ctx.beginPath(); ctx.arc(64, 46 + sine, 12, 0.2 * Math.PI, 0.8 * Math.PI, false); ctx.stroke();
                break;
            }

            case 'sad': {
                // Slanted eyebrows
                ctx.beginPath(); ctx.moveTo(26, 16); ctx.lineTo(48, 22); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(102, 16); ctx.lineTo(80, 22); ctx.stroke();
                // Drooping eyes
                ctx.beginPath(); ctx.arc(40, 28, 8, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(88, 28, 8, 0, Math.PI * 2); ctx.fill();
                // Frown mouth
                ctx.beginPath(); ctx.arc(64, 54, 12, Math.PI * 1.1, Math.PI * 1.9, false); ctx.stroke();
                break;
            }

            case 'angry': {
                // Slanted eyebrows
                ctx.beginPath(); ctx.moveTo(26, 22); ctx.lineTo(50, 16); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(102, 22); ctx.lineTo(78, 16); ctx.stroke();
                // Narrow eyes
                ctx.fillRect(28, 24, 22, 8);
                ctx.fillRect(78, 24, 22, 8);
                // Jagged frown
                ctx.beginPath();
                ctx.moveTo(50, 48); ctx.lineTo(58, 44); ctx.lineTo(64, 48); ctx.lineTo(72, 44); ctx.lineTo(78, 48);
                ctx.stroke();
                break;
            }

            case 'sleepy': {
                // Slit eyes
                ctx.fillRect(28, 30 + sine, 22, 2);
                ctx.fillRect(78, 30 + sine, 22, 2);
                // Calm small mouth
                ctx.beginPath(); ctx.arc(64, 48 + sine, 4, 0, Math.PI * 2); ctx.stroke();
                // Floating Z
                ctx.font = '10px monospace';
                ctx.fillText('Z', 104, 20 - (frame % 20));
                break;
            }

            case 'surprised': {
                // Wide eyes
                ctx.beginPath(); ctx.arc(40, 24, 12, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(88, 24, 12, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(40, 24, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(88, 24, 3, 0, Math.PI * 2); ctx.fill();
                // Big O mouth
                ctx.beginPath(); ctx.arc(64, 48, 8, 0, Math.PI * 2); ctx.stroke();
                break;
            }

            case 'love': {
                const beat = Math.abs(Math.sin(frame * 0.15) * 3);
                // Heart eyes
                ctx.beginPath(); ctx.arc(36, 24, 6 + beat, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(44, 24, 6 + beat, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(84, 24, 6 + beat, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(92, 24, 6 + beat, 0, Math.PI * 2); ctx.fill();
                // Cute mouth
                ctx.beginPath(); ctx.arc(64, 46, 10, 0, Math.PI, false); ctx.stroke();
                break;
            }

            case 'wink': {
                // Left open, right wink
                ctx.beginPath(); ctx.arc(40, 26, 10, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(76, 28); ctx.lineTo(88, 22); ctx.lineTo(100, 28); ctx.stroke();
                // Smirk
                ctx.beginPath(); ctx.arc(68, 46, 10, 0, Math.PI * 0.8, false); ctx.stroke();
                break;
            }

            case 'confused': {
                ctx.beginPath(); ctx.moveTo(28, 12); ctx.lineTo(50, 16); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(78, 20); ctx.lineTo(100, 20); ctx.stroke();
                ctx.beginPath(); ctx.arc(38, 26, 10, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(88, 28, 6, 0, Math.PI * 2); ctx.fill();
                // Squiggle
                ctx.beginPath();
                ctx.moveTo(52, 48); ctx.lineTo(58, 51); ctx.lineTo(64, 46); ctx.lineTo(70, 50); ctx.lineTo(76, 47);
                ctx.stroke();
                break;
            }

            case 'excited': {
                const bounce = Math.abs(sine * 2);
                ctx.fillRect(28, 20 - bounce, 24, 14);
                ctx.fillRect(76, 20 - bounce, 24, 14);
                ctx.beginPath(); ctx.arc(64, 46 - bounce, 12, 0, Math.PI, false); ctx.fill();
                break;
            }

            case 'laughing': {
                const shake = (frame % 4 < 2) ? 1 : -1;
                ctx.beginPath(); ctx.moveTo(28 + shake, 20); ctx.lineTo(48 + shake, 28); ctx.lineTo(28 + shake, 36); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(100 + shake, 20); ctx.lineTo(80 + shake, 28); ctx.lineTo(100 + shake, 36); ctx.stroke();
                ctx.beginPath(); ctx.arc(64, 44, 14, 0, Math.PI, false); ctx.fill();
                break;
            }

            case 'crying': {
                ctx.beginPath(); ctx.moveTo(28, 28); ctx.lineTo(48, 24); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(100, 28); ctx.lineTo(80, 24); ctx.stroke();
                // Falling tears
                const tearY = 30 + ((frame * 2) % 25);
                ctx.fillRect(38, tearY, 4, 6);
                ctx.fillRect(88, tearY, 4, 6);
                ctx.beginPath(); ctx.arc(64, 52, 10, Math.PI * 1.1, Math.PI * 1.9, false); ctx.stroke();
                break;
            }

            default:
                break;
        }
    }
};

class FaceStudioManager {
    constructor() {
        this.activeFace = 'happy';
        this.miniCanvases = [];
    }

    init() {
        // ID in index.html is 'facesGrid'
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
            title.textContent = `${face.emoji} ${face.name}`;

            card.appendChild(canvas);
            card.appendChild(title);
            grid.appendChild(card);

            this.miniCanvases.push({ id: face.id, canvas, ctx: canvas.getContext('2d') });

            card.addEventListener('click', () => {
                this.selectFace(face.id);
            });
        });

        // Sliders & Controls (only bind if elements exist in HTML)
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

        // Start animation loop for cards
        let frame = 0;
        setInterval(() => {
            frame++;
            this.miniCanvases.forEach(item => {
                item.ctx.fillStyle = '#05080f';
                item.ctx.fillRect(0, 0, 128, 64);
                FaceRenderer.drawFace(item.ctx, item.id, frame);
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
        App.showToast(`Active Face: ${faceId.toUpperCase()} 😊`);
    }
}

window.FaceStudio = new FaceStudioManager();
