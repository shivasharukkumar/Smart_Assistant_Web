/**
 * Flappy & Flappy Face Game Web Controller Module
 */

class FlappyGameModule {
    constructor() {
        this.gameId = 'flappy';
    }

    start(isFaceMode = false) {
        const game = isFaceMode ? 'flappy_face' : 'flappy';
        Connection.sendWs({ type: 'game_start', game: game });
        Connection.apiPost('/api/game/start', { game: game });
    }

    jump() {
        Connection.sendWs({ type: 'game_input', action: 'JUMP' });
        Connection.apiPost('/api/game/input', { action: 'JUMP' });
    }
}

window.FlappyGame = new FlappyGameModule();
