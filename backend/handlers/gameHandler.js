const { getRoom, updateRoom } = require('../services/roomService');
const { sendToPlayersRolledNumber, sendWinner, sendScoreUpdate, sendLeaderboard } = require('../socket/emits');
const { rollDice, isMoveValid } = require('./handlersFunctions');

module.exports = socket => {
    const req = socket.request;

    const handleMovePawn = async pawnId => {
        const room = await getRoom(req.session.roomId);
        if (room.winner) return;
        const pawn = room.getPawn(pawnId);
        if (isMoveValid(req.session, pawn, room)) {
            // Use room.movePawn which handles scoring automatically
            room.movePawn(pawn);

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
        }
    };

    const handleRollDice = async () => {
        const rolledNumber = rollDice();
        sendToPlayersRolledNumber(req.session.roomId, rolledNumber);

        // Get the room and update the rolled number
        const room = await getRoom(req.session.roomId);
        room.rolledNumber = rolledNumber;

        const player = room.getPlayer(req.session.playerId);
        if (!player.canMove(room, rolledNumber)) {
            room.changeMovingPlayer();
        }

        await updateRoom(room);
    };

    socket.on('game:roll', handleRollDice);
    socket.on('game:move', handleMovePawn);
};
