const { getRooms, getRoom, updateRoom, createNewRoom } = require('../services/roomService');
const {
    sendToOnePlayerRooms,
    sendToOnePlayerData,
    sendWinner,
    sendScoreUpdate,
    sendLeaderboard,
} = require('../socket/emits');

module.exports = socket => {
    const req = socket.request;

    const handleGetData = async () => {
        const room = await getRoom(req.session.roomId);
        // Handle the situation when the server crashes and any player reconnects after the time has expired
        // Typically, the responsibility for changing players is managed by gameHandler.js.
        if (room.nextMoveTime <= Date.now()) {
            room.changeMovingPlayer();
            await updateRoom(room);
        }
        sendToOnePlayerData(socket.id, room);
        if (room.winner) sendWinner(socket.id, room.winner);

        // Send current scores and leaderboard to the player
        if (room.started) {
            const scores = room.players.map(player => ({
                color: player.color,
                name: player.name,
                score: player.score || 0,
                pawnsInHome: player.pawnsInHome || 0,
                pawnsCaptured: player.pawnsCaptured || 0,
            }));
            sendScoreUpdate(socket.id, scores);
            sendLeaderboard(socket.id, room.getLeaderboard());
        }
    };

    const handleGetAllRooms = async () => {
        const rooms = await getRooms();
        sendToOnePlayerRooms(socket.id, rooms);
    };

    const handleCreateRoom = async data => {
        await createNewRoom(data);
        sendToOnePlayerRooms(socket.id, await getRooms());
    };

    socket.on('room:data', handleGetData);
    socket.on('room:rooms', handleGetAllRooms);
    socket.on('room:create', handleCreateRoom);
};
