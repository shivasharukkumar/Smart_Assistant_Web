/**
 * Snake Game Web Controller & Simulator Module
 */

class SnakeGameModule {
    constructor() {
        this.gameId = 'snake';
    }

    start() {
        Connection.sendWs({ type: 'game_start', game: 'snake' });
        Connection.apiPost('/api/game/start', { game: 'snake' });
    }

    sendDirection(dir) {
        Connection.sendWs({ type: 'game_input', action: dir });
        Connection.apiPost('/api/game/input', { action: dir });
    }
}

window.SnakeGame = new SnakeGameModule();
