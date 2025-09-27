const { sendToPlayersRolledNumber, sendWinner, sendScoreUpdate, sendLeaderboard } = require('../socket/emits');

const rollDice = () => {
    const rolledNumber = Math.ceil(Math.random() * 6);
    return rolledNumber;
};

const makeRandomMove = async roomId => {
    const { updateRoom, getRoom } = require('../services/roomService');
    const room = await getRoom(roomId);
    if (room.winner) return;
    if (room.rolledNumber === null) {
        room.rolledNumber = rollDice();
        sendToPlayersRolledNumber(room._id.toString(), room.rolledNumber);
    }

    const pawnsThatCanMove = room.getPawnsThatCanMove();
    if (pawnsThatCanMove.length > 0) {
        const randomPawn = pawnsThatCanMove[Math.floor(Math.random() * pawnsThatCanMove.length)];
        room.movePawn(randomPawn);
    }

    room.changeMovingPlayer();
    const winner = room.getWinner();
    if (winner) {
        room.endGame(winner);
    }

    // Save room first, then send updates
    await updateRoom(room);

    // Send score updates after room is saved
    const scores = room.players.map(player => ({
        color: player.color,
        name: player.name,
        score: player.score,
        pawnsInHome: player.pawnsInHome,
        pawnsCaptured: player.pawnsCaptured,
    }));
    sendScoreUpdate(room._id.toString(), scores);
    sendLeaderboard(room._id.toString(), room.getLeaderboard());

    if (winner) {
        sendWinner(room._id.toString(), winner);
    }
};

const isMoveValid = (session, pawn, room) => {
    if (session.color !== pawn.color) {
        return false;
    }
    if (session.playerId !== room.getCurrentlyMovingPlayer()._id.toString()) {
        return false;
    }
    return true;
};

module.exports = { rollDice, makeRandomMove, isMoveValid };
