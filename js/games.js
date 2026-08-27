/**
 * Game Center & Controller - Handles 6 Games, Virtual Overlays, and Keyboard Input Mapping
 */

const GAMES_LIST = [
    { id: 'snake', name: 'SNAKE', desc: 'Classic retro snake. Collect food and beat high score.', icon: '🐍' },
    { id: 'flappy', name: 'FLAPPY', desc: 'Flap through pipes without crashing. Jump with Space/Touch.', icon: '🐦' },
    { id: 'pong', name: 'PONG', desc: 'Face off against ESP32 AI in high-speed paddle rallies.', icon: '🏓' },
    { id: 'reaction', name: 'REACTION TEST', desc: 'Test human nerve response speed in milliseconds.', icon: '⚡' },
    { id: 'tictactoe', name: 'TIC-TAC-TOE', desc: 'Classic 3x3 strategy against ESP32 Minimax AI.', icon: '❌' },
    { id: 'flappy_face', name: 'FLAPPY FACE', desc: 'Your active Assistant Face becomes the flying player!', icon: '🤩' }
];

class GameCenter {
    constructor() {
        this.activeGame = 'none';
        this.score = 0;
        this.highScores = {};
        this.isListeningKeyboard = false;
    }

    init() {
        this.renderGameCards();
        this.bindControllerEvents();
        this.initKeyboardListener();

        // Listen for telemetry updates to sync score & active game
        Connection.on('telemetry', (data) => {
            if (data.game && data.game !== this.activeGame) {
                this.activeGame = data.game;
                this.updateControllerLayout();
            }
            if (data.score !== undefined) {
                this.score = data.score;
            }
        });
    }

    renderGameCards() {
        const grid = document.getElementById('gamesGrid');
        if (!grid) return;
        grid.innerHTML = '';

        GAMES_LIST.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div>
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">${game.icon}</div>
                    <div class="card-title" style="font-size: 1.1rem;">${game.name}</div>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px;">${game.desc}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span class="font-mono" style="font-size: 0.8rem; color: var(--accent-amber);" id="hs-${game.id}">HI: --</span>
                    <button class="btn btn-primary btn-play-game" data-game="${game.id}">
                        ▶ PLAY
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Play buttons
        document.querySelectorAll('.btn-play-game').forEach(btn => {
            btn.addEventListener('click', () => {
                const gameId = btn.getAttribute('data-game');
                if (gameId) this.startGame(gameId);
            });
        });
    }

    startGame(gameId) {
        this.activeGame = gameId;
        Connection.sendWs({ type: 'game_start', game: gameId });
        Connection.post('/api/game/start', { game: gameId });
        this.updateControllerLayout();
        App.showToast(`Started Game: ${gameId.toUpperCase()}`);

        // Scroll smoothly to controller panel
        document.getElementById('gameControllerPanel')?.scrollIntoView({ behavior: 'smooth' });
    }

    updateControllerLayout() {
        // HTML element IDs from index.html
        // D-pad container = the div wrapping btnDpadUp etc. — we target the parent div
        const dpadSection = document.querySelector('.dpad-container')?.closest('div')?.parentElement;
        const actionSection = document.getElementById('btnGameAction')?.closest('div[style]');
        const tttContainer = document.getElementById('tttContainer');
        const activeTitle = document.getElementById('activeGameTitle');

        // Update game title badge
        const game = GAMES_LIST.find(g => g.id === this.activeGame);
        if (activeTitle) {
            activeTitle.textContent = game ? `${game.icon} ${game.name}` : 'No Game Active';
        }

        // Show/hide controller sections based on active game
        if (dpadSection) dpadSection.style.display = 'none';
        if (actionSection) actionSection.style.display = 'none';
        if (tttContainer) tttContainer.style.display = 'none';

        switch (this.activeGame) {
            case 'snake':
            case 'pong':
                if (dpadSection) dpadSection.style.display = 'block';
                break;

            case 'flappy':
            case 'flappy_face':
            case 'reaction': {
                if (actionSection) actionSection.style.display = 'flex';
                // Update button label
                const actionBtn = document.getElementById('btnGameAction');
                if (actionBtn) actionBtn.textContent = this.activeGame === 'reaction' ? 'TOUCH!' : 'JUMP';
                break;
            }

            case 'tictactoe':
                if (tttContainer) {
                    tttContainer.style.display = 'block';
                    this.clearTicTacToeBoard();
                }
                break;

            default:
                // Show D-pad by default (when no game is active, show all)
                if (dpadSection) dpadSection.style.display = 'block';
                if (actionSection) actionSection.style.display = 'flex';
                break;
        }
    }

    bindControllerEvents() {
        // D-Pad buttons — class="dpad-btn" with id btnDpadUp/Down/Left/Right/Center
        const dpadMap = {
            btnDpadUp: 'UP',
            btnDpadDown: 'DOWN',
            btnDpadLeft: 'LEFT',
            btnDpadRight: 'RIGHT',
            btnDpadCenter: 'SELECT'
        };
        Object.entries(dpadMap).forEach(([id, action]) => {
            document.getElementById(id)?.addEventListener('click', () => this.sendInput(action));
        });

        // Action Button (Jump / Touch) — id="btnGameAction"
        document.getElementById('btnGameAction')?.addEventListener('click', () => {
            this.sendInput(this.activeGame === 'reaction' ? 'TOUCH' : 'JUMP');
        });

        // Pause button
        document.getElementById('btnGamePause')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'PAUSE' });
            Connection.post('/api/game/pause', {});
        });

        // Resume button
        document.getElementById('btnGameResume')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'RESUME' });
            Connection.post('/api/game/resume', {});
        });

        // Exit button
        document.getElementById('btnGameExit')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'EXIT' });
            Connection.post('/api/game/exit', {});
            this.activeGame = 'none';
            this.updateControllerLayout();
        });

        // Game tile selection (index.html has .game-tile elements, not a dynamic grid)
        document.querySelectorAll('.game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                const gameId = tile.getAttribute('data-game');
                if (gameId) this.startGame(gameId);
            });
        });

        // Tic-Tac-Toe Cells
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                if (this.activeGame !== 'tictactoe' || cell.textContent !== '') return;
                const r = cell.getAttribute('data-r');
                const c = cell.getAttribute('data-c');

                cell.textContent = 'X';
                cell.classList.add('x');

                Connection.sendWs({ type: 'game_input', cell: `${r},${c}` });
                Connection.post('/api/game/input', { cell: `${r},${c}` });
            });
        });
    }

    clearTicTacToeBoard() {
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.textContent = '';
            cell.className = 'ttt-cell';
        });
    }

    sendInput(action) {
        Connection.sendWs({ type: 'game_input', action: action });
        Connection.post('/api/game/input', { action: action });
    }

    initKeyboardListener() {
        if (this.isListeningKeyboard) return;
        this.isListeningKeyboard = true;

        window.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.sendInput('UP');
                    break;

                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.sendInput('DOWN');
                    break;

                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.sendInput('LEFT');
                    break;

                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.sendInput('RIGHT');
                    break;

                case ' ':
                case 'Enter':
                    e.preventDefault();
                    if (this.activeGame === 'reaction') this.sendInput('TOUCH');
                    else this.sendInput('JUMP');
                    break;

                case 'Escape':
                    this.sendInput('EXIT');
                    break;

                case 'p':
                case 'P':
                    this.sendInput('PAUSE');
                    break;
            }
        });
    }
}

window.GameCenterInstance = new GameCenter();
