/**
 * Game Center & Controller - Handles 6 Games, Virtual Overlays, Synchronized Tic-Tac-Toe AI, and Keyboard Controls
 */

const GAMES_LIST = [
    { id: 'snake', name: 'SNAKE', desc: 'Classic retro snake. Collect food and beat high score.', icon: 'gesture' },
    { id: 'flappy', name: 'FLAPPY', desc: 'Flap through pipes without crashing. Jump with Space/Touch.', icon: 'flight' },
    { id: 'pong', name: 'PONG', desc: 'Face off against ESP32 AI in high-speed paddle rallies.', icon: 'sports_tennis' },
    { id: 'reaction', name: 'REACTION TEST', desc: 'Test human nerve response speed in milliseconds.', icon: 'bolt' },
    { id: 'tictactoe', name: 'TIC-TAC-TOE', desc: 'Classic 3x3 strategy against ESP32 Minimax AI.', icon: 'grid_3x3' },
    { id: 'flappy_face', name: 'FLAPPY FACE', desc: 'Your active Assistant Face becomes the flying player!', icon: 'mood' }
];

class GameCenter {
    constructor() {
        this.activeGame = 'none';
        this.score = 0;
        this.highScores = {};
        this.isListeningKeyboard = false;

        // Tic-Tac-Toe State
        this.tttBoard = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        this.tttGameOver = false;
    }

    init() {
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

    startGame(gameId) {
        this.activeGame = gameId;
        Connection.sendWs({ type: 'game_start', game: gameId });
        Connection.post('/api/game/start', { game: gameId });
        this.updateControllerLayout();
        App.showToast(`Started Game: ${gameId.toUpperCase()}`);

        if (gameId === 'tictactoe') {
            this.clearTicTacToeBoard();
        }

        // Highlight active tile in UI
        document.querySelectorAll('.game-tile').forEach(tile => {
            tile.classList.toggle('active-game', tile.getAttribute('data-game') === gameId);
        });

        // Scroll smoothly to controller panel
        document.getElementById('gameControllerPanel')?.scrollIntoView({ behavior: 'smooth' });
    }

    updateControllerLayout() {
        const dpadSection = document.querySelector('.dpad-container')?.closest('div')?.parentElement;
        const actionSection = document.getElementById('btnGameAction')?.closest('div');
        const tttContainer = document.getElementById('tttContainer');
        const activeTitle = document.getElementById('activeGameTitle');

        // Update game title badge
        const game = GAMES_LIST.find(g => g.id === this.activeGame);
        if (activeTitle) {
            activeTitle.textContent = game ? game.name : 'No Game Active';
            activeTitle.className = game ? 'status-badge connected' : 'status-badge';
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
                const actionBtn = document.getElementById('btnGameAction');
                if (actionBtn) {
                    actionBtn.innerHTML = `
                        <span class="material-symbols-outlined" style="font-size: 28px;">touch_app</span>
                        ${this.activeGame === 'reaction' ? 'TOUCH (Space)' : 'JUMP (Space)'}
                    `;
                }
                break;
            }

            case 'tictactoe':
                if (tttContainer) {
                    tttContainer.style.display = 'block';
                    this.clearTicTacToeBoard();
                }
                break;

            default:
                if (dpadSection) dpadSection.style.display = 'block';
                if (actionSection) actionSection.style.display = 'flex';
                break;
        }
    }

    bindControllerEvents() {
        // D-Pad buttons
        const dpadMap = {
            btnDpadUp: 'UP',
            btnDpadDown: 'DOWN',
            btnDpadLeft: 'LEFT',
            btnDpadRight: 'RIGHT',
            btnDpadCenter: 'SELECT'
        };
        Object.entries(dpadMap).forEach(([id, action]) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.triggerButtonPress(btn);
                    this.sendInput(action);
                });
            }
        });

        // Action Button (Jump / Touch)
        const actionBtn = document.getElementById('btnGameAction');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                this.triggerButtonPress(actionBtn);
                this.sendInput(this.activeGame === 'reaction' ? 'TOUCH' : 'JUMP');
            });
        }

        // Pause button
        document.getElementById('btnGamePause')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'PAUSE' });
            Connection.post('/api/game/pause', {});
            App.showToast('Game Paused');
        });

        // Resume button
        document.getElementById('btnGameResume')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'RESUME' });
            Connection.post('/api/game/resume', {});
            App.showToast('Game Resumed');
        });

        // Exit button
        document.getElementById('btnGameExit')?.addEventListener('click', () => {
            Connection.sendWs({ type: 'game_input', action: 'EXIT' });
            Connection.post('/api/game/exit', {});
            this.activeGame = 'none';
            this.updateControllerLayout();
            document.querySelectorAll('.game-tile').forEach(tile => tile.classList.remove('active-game'));
            App.showToast('Exited Game');
        });

        // Game tile selection
        document.querySelectorAll('.game-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                const gameId = tile.getAttribute('data-game');
                if (gameId) this.startGame(gameId);
            });
        });

        // Tic-Tac-Toe Reset button
        document.getElementById('btnTttReset')?.addEventListener('click', () => {
            this.clearTicTacToeBoard();
            Connection.sendWs({ type: 'game_start', game: 'tictactoe' });
            Connection.post('/api/game/start', { game: 'tictactoe' });
            App.showToast('Tic-Tac-Toe Board Reset');
        });

        // Tic-Tac-Toe Cells
        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const r = parseInt(cell.getAttribute('data-r'));
                const c = parseInt(cell.getAttribute('data-c'));
                this.playTicTacToeMove(r, c);
            });
        });
    }

    playTicTacToeMove(r, c) {
        if (this.activeGame !== 'tictactoe') return;
        if (this.tttGameOver) return;
        if (this.tttBoard[r][c] !== 0) return;

        const cell = document.querySelector(`.ttt-cell[data-r="${r}"][data-c="${c}"]`);
        if (!cell) return;

        // 1. Place Player 'X'
        this.tttBoard[r][c] = 1;
        cell.textContent = 'X';
        cell.className = 'ttt-cell x';
        this.triggerButtonPress(cell);

        // Send move to ESP32
        Connection.sendWs({ type: 'game_input', cell: `${r},${c}` });
        Connection.post('/api/game/input', { cell: `${r},${c}` });

        // Check if player won
        const winResult = this.checkWin();
        if (winResult) {
            this.handleGameOver(winResult);
            return;
        }

        // Check for draw
        if (this.isBoardFull()) {
            this.handleGameOver({ winner: 0, line: [] });
            return;
        }

        // 2. Trigger AI Move ('O')
        const banner = document.getElementById('tttStatusBanner');
        if (banner) banner.textContent = 'AI Thinking (O)...';

        setTimeout(() => {
            if (this.tttGameOver || this.activeGame !== 'tictactoe') return;
            this.executeAiMove();
        }, 320);
    }

    executeAiMove() {
        const move = this.findBestAiMove();
        if (!move) return;

        const [aiR, aiC] = move;
        this.tttBoard[aiR][aiC] = 2; // AI = 2 ('O')

        const cell = document.querySelector(`.ttt-cell[data-r="${aiR}"][data-c="${aiC}"]`);
        if (cell) {
            cell.textContent = 'O';
            cell.className = 'ttt-cell o';
            this.triggerButtonPress(cell);
        }

        const winResult = this.checkWin();
        if (winResult) {
            this.handleGameOver(winResult);
            return;
        }

        if (this.isBoardFull()) {
            this.handleGameOver({ winner: 0, line: [] });
            return;
        }

        const banner = document.getElementById('tttStatusBanner');
        if (banner) banner.textContent = 'Your Turn (X)';
    }

    findBestAiMove() {
        const b = this.tttBoard;

        // 1. Check if AI can win in one move
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (b[r][c] === 0) {
                    b[r][c] = 2;
                    if (this.checkWin()?.winner === 2) {
                        b[r][c] = 0;
                        return [r, c];
                    }
                    b[r][c] = 0;
                }
            }
        }

        // 2. Block player if they can win in one move
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (b[r][c] === 0) {
                    b[r][c] = 1;
                    if (this.checkWin()?.winner === 1) {
                        b[r][c] = 0;
                        return [r, c];
                    }
                    b[r][c] = 0;
                }
            }
        }

        // 3. Take center if open
        if (b[1][1] === 0) return [1, 1];

        // 4. Take corners
        const corners = [[0, 0], [0, 2], [2, 0], [2, 2]];
        const openCorners = corners.filter(([r, c]) => b[r][c] === 0);
        if (openCorners.length > 0) {
            return openCorners[Math.floor(Math.random() * openCorners.length)];
        }

        // 5. Take any remaining open cell
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (b[r][c] === 0) return [r, c];
            }
        }
        return null;
    }

    checkWin() {
        const b = this.tttBoard;
        const lines = [
            // Rows
            [[0,0], [0,1], [0,2]],
            [[1,0], [1,1], [1,2]],
            [[2,0], [2,1], [2,2]],
            // Columns
            [[0,0], [1,0], [2,0]],
            [[0,1], [1,1], [2,1]],
            [[0,2], [1,2], [2,2]],
            // Diagonals
            [[0,0], [1,1], [2,2]],
            [[0,2], [1,1], [2,0]]
        ];

        for (const line of lines) {
            const [p1, p2, p3] = line;
            const val = b[p1[0]][p1[1]];
            if (val !== 0 && val === b[p2[0]][p2[1]] && val === b[p3[0]][p3[1]]) {
                return { winner: val, line: line };
            }
        }
        return null;
    }

    isBoardFull() {
        return this.tttBoard.every(row => row.every(cell => cell !== 0));
    }

    handleGameOver(result) {
        this.tttGameOver = true;
        const banner = document.getElementById('tttStatusBanner');

        if (result.winner === 1) {
            // Player won
            if (banner) banner.textContent = 'You Won! Click Reset to play again.';
            App.showToast('You Won Tic-Tac-Toe!', 'success');
            // Highlight winning line
            result.line.forEach(([r, c]) => {
                const cell = document.querySelector(`.ttt-cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) cell.classList.add('win');
            });
        } else if (result.winner === 2) {
            // AI won
            if (banner) banner.textContent = 'ESP32 AI Won! Click Reset to try again.';
            App.showToast('ESP32 AI Won Tic-Tac-Toe!');
            result.line.forEach(([r, c]) => {
                const cell = document.querySelector(`.ttt-cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) cell.classList.add('win');
            });
        } else {
            // Draw
            if (banner) banner.textContent = 'Game Draw! Click Reset to play again.';
            App.showToast('Tic-Tac-Toe Draw!');
        }
    }

    clearTicTacToeBoard() {
        this.tttBoard = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        this.tttGameOver = false;

        document.querySelectorAll('.ttt-cell').forEach(cell => {
            cell.textContent = '';
            cell.className = 'ttt-cell';
        });

        const banner = document.getElementById('tttStatusBanner');
        if (banner) banner.textContent = 'Your Turn (X)';
    }

    triggerButtonPress(el) {
        if (!el) return;
        el.classList.add('key-active');
        setTimeout(() => el.classList.remove('key-active'), 150);
    }

    sendInput(action) {
        Connection.sendWs({ type: 'game_input', action: action });
        Connection.post('/api/game/input', { action: action });
    }

    initKeyboardListener() {
        if (this.isListeningKeyboard) return;
        this.isListeningKeyboard = true;

        window.addEventListener('keydown', (e) => {
            // Ignore keystrokes when typing in text fields
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

            const key = e.key;
            const code = e.code;

            // Direction UP (ArrowUp or W)
            if (key === 'ArrowUp' || key === 'w' || key === 'W' || code === 'KeyW') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnDpadUp'));
                if (this.activeGame === 'flappy' || this.activeGame === 'flappy_face') {
                    this.sendInput('JUMP');
                } else {
                    this.sendInput('UP');
                }
            }
            // Direction DOWN (ArrowDown or S)
            else if (key === 'ArrowDown' || key === 's' || key === 'S' || code === 'KeyS') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnDpadDown'));
                this.sendInput('DOWN');
            }
            // Direction LEFT (ArrowLeft or A)
            else if (key === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'KeyA') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnDpadLeft'));
                this.sendInput('LEFT');
            }
            // Direction RIGHT (ArrowRight or D)
            else if (key === 'ArrowRight' || key === 'd' || key === 'D' || code === 'KeyD') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnDpadRight'));
                this.sendInput('RIGHT');
            }
            // Action button (Space or Enter)
            else if (key === ' ' || key === 'Enter' || code === 'Space' || code === 'Enter') {
                e.preventDefault();
                const actionBtn = document.getElementById('btnGameAction');
                this.triggerButtonPress(actionBtn);

                if (this.activeGame === 'reaction') {
                    this.sendInput('TOUCH');
                } else if (this.activeGame === 'tictactoe') {
                    this.playTicTacToeMove(1, 1);
                } else {
                    this.sendInput('JUMP');
                }
            }
            // Pause toggle (P key)
            else if (key === 'p' || key === 'P' || code === 'KeyP') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnGamePause'));
                this.sendInput('PAUSE');
                App.showToast('Game Paused');
            }
            // Resume (R key)
            else if (key === 'r' || key === 'R' || code === 'KeyR') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnGameResume'));
                this.sendInput('RESUME');
                App.showToast('Game Resumed');
            }
            // Exit game (Escape or Q)
            else if (key === 'Escape' || key === 'q' || key === 'Q' || code === 'KeyQ') {
                e.preventDefault();
                this.triggerButtonPress(document.getElementById('btnGameExit'));
                this.sendInput('EXIT');
                this.activeGame = 'none';
                this.updateControllerLayout();
                document.querySelectorAll('.game-tile').forEach(tile => tile.classList.remove('active-game'));
                App.showToast('Exited Game');
            }
            // Number keys 1-9 for Tic-Tac-Toe or Fast Game Launch
            else if (/^[1-9]$/.test(key)) {
                const num = parseInt(key);
                if (this.activeGame === 'tictactoe') {
                    e.preventDefault();
                    const r = Math.floor((num - 1) / 3);
                    const c = (num - 1) % 3;
                    this.playTicTacToeMove(r, c);
                } else if (this.activeGame === 'none' && num <= GAMES_LIST.length) {
                    e.preventDefault();
                    this.startGame(GAMES_LIST[num - 1].id);
                }
            }
        });
    }
}

window.GameCenterInstance = new GameCenter();
document.addEventListener('DOMContentLoaded', () => window.GameCenterInstance.init());
