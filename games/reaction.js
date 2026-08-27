/**
 * Reaction Test Game Web Controller Module
 */

class ReactionGameModule {
    constructor() {
        this.gameId = 'reaction';
    }

    start() {
        Connection.sendWs({ type: 'game_start', game: 'reaction' });
        Connection.apiPost('/api/game/start', { game: 'reaction' });
    }

    touch() {
        Connection.sendWs({ type: 'game_input', action: 'TOUCH' });
        Connection.apiPost('/api/game/input', { action: 'TOUCH' });
    }
}

window.ReactionGame = new ReactionGameModule();
