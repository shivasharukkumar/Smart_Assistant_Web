/**
 * Pong Game Web Controller Module
 */

class PongGameModule {
    constructor() {
        this.gameId = 'pong';
    }

    start() {
        Connection.sendWs({ type: 'game_start', game: 'pong' });
        Connection.apiPost('/api/game/start', { game: 'pong' });
    }

    moveUp() {
        Connection.sendWs({ type: 'game_input', action: 'UP' });
        Connection.apiPost('/api/game/input', { action: 'UP' });
    }

    moveDown() {
        Connection.sendWs({ type: 'game_input', action: 'DOWN' });
        Connection.apiPost('/api/game/input', { action: 'DOWN' });
    }
}

window.PongGame = new PongGameModule();
