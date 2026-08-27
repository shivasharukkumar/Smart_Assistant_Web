/**
 * Tic-Tac-Toe Game Web Controller Module
 */

class TicTacToeGameModule {
    constructor() {
        this.gameId = 'tictactoe';
    }

    start() {
        Connection.sendWs({ type: 'game_start', game: 'tictactoe' });
        Connection.apiPost('/api/game/start', { game: 'tictactoe' });
    }

    pickCell(row, col) {
        Connection.sendWs({ type: 'game_input', cell: `${row},${col}` });
        Connection.apiPost('/api/game/input', { cell: `${row},${col}` });
    }
}

window.TicTacToeGame = new TicTacToeGameModule();
