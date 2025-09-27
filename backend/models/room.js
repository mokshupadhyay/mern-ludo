const mongoose = require('mongoose');
const { COLORS, MOVE_TIME } = require('../utils/constants');
const { makeRandomMove } = require('../handlers/handlersFunctions');
const timeoutManager = require('./timeoutManager.js');
const PawnSchema = require('./pawn');
const PlayerSchema = require('./player');

const RoomSchema = new mongoose.Schema({
    name: String,
    private: { type: Boolean, default: false },
    password: String,
    createDate: { type: Date, default: Date.now },
    started: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
    nextMoveTime: Number,
    rolledNumber: Number,
    players: [PlayerSchema],
    winner: { type: String, default: null },
    pawns: {
        type: [PawnSchema],
        default: () => {
            const startPositions = [];
            for (let i = 0; i < 16; i++) {
                let pawn = {};
                pawn.basePos = i;
                pawn.position = i;
                if (i < 4) pawn.color = COLORS[0];
                else if (i < 8) pawn.color = COLORS[1];
                else if (i < 12) pawn.color = COLORS[2];
                else if (i < 16) pawn.color = COLORS[3];
                startPositions.push(pawn);
            }
            return startPositions;
        },
    },
});

RoomSchema.methods.beatPawns = function (position, attackingPawnColor) {
    const pawnsOnPosition = this.pawns.filter(pawn => pawn.position === position);
    let capturedCount = 0;

    pawnsOnPosition.forEach(pawn => {
        if (pawn.color !== attackingPawnColor) {
            const index = this.getPawnIndex(pawn._id);
            this.pawns[index].position = this.pawns[index].basePos;
            capturedCount++;
        }
    });

    // Award capture points to the attacking player
    if (capturedCount > 0) {
        const attackingPlayer = this.players.find(player => player.color === attackingPawnColor);
        if (attackingPlayer) {
            for (let i = 0; i < capturedCount; i++) {
                attackingPlayer.addCaptureScore();
            }
        }
    }

    return capturedCount;
};

RoomSchema.methods.changeMovingPlayer = function () {
    if (this.winner) return;
    const playerIndex = this.players.findIndex(player => player.nowMoving === true);
    this.players[playerIndex].nowMoving = false;
    if (playerIndex + 1 === this.players.length) {
        this.players[0].nowMoving = true;
    } else {
        this.players[playerIndex + 1].nowMoving = true;
    }
    this.nextMoveTime = Date.now() + MOVE_TIME;
    this.rolledNumber = null;
    timeoutManager.clear(this._id.toString());
    timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
};

RoomSchema.methods.movePawn = function (pawn) {
    const oldPosition = pawn.position;
    const newPositionOfMovedPawn = pawn.getPositionAfterMove(this.rolledNumber);
    const player = this.players.find(p => p.color === pawn.color);

    // Only award points if pawn actually moves to a different position
    if (oldPosition !== newPositionOfMovedPawn) {
        this.changePositionOfPawn(pawn, newPositionOfMovedPawn);

        // Award progress points - dice roll value points only when pawn moves
        if (player) {
            // Ensure we have a valid rolled number
            const pointsToAward = this.rolledNumber || 1; // Fallback to 1 if no rolled number
            player.addProgressScore(pointsToAward); // Award points equal to dice roll

            // Check if pawn reached home (final positions: red=73, blue=79, green=85, yellow=91)
            const homePositions = { red: 73, blue: 79, green: 85, yellow: 91 };
            if (newPositionOfMovedPawn === homePositions[pawn.color]) {
                player.addHomeScore();
            }
        }

        this.beatPawns(newPositionOfMovedPawn, pawn.color);
    }
    // If pawn doesn't move (locked), no points are awarded
};

RoomSchema.methods.getPawnsThatCanMove = function () {
    const movingPlayer = this.getCurrentlyMovingPlayer();
    const playerPawns = this.getPlayerPawns(movingPlayer.color);
    return playerPawns.filter(pawn => pawn.canMove(this.rolledNumber));
};

RoomSchema.methods.changePositionOfPawn = function (pawn, newPosition) {
    const pawnIndex = this.getPawnIndex(pawn._id);
    this.pawns[pawnIndex].position = newPosition;
};

RoomSchema.methods.canStartGame = function () {
    return this.players.filter(player => player.ready).length >= 2;
};

RoomSchema.methods.startGame = function () {
    this.started = true;
    this.nextMoveTime = Date.now() + MOVE_TIME;
    this.players.forEach(player => (player.ready = true));
    this.players[0].nowMoving = true;
    timeoutManager.set(makeRandomMove, MOVE_TIME, this._id.toString());
};

RoomSchema.methods.endGame = function (winner) {
    timeoutManager.clear(this._id.toString());
    this.rolledNumber = null;
    this.nextMoveTime = null;
    this.players.map(player => (player.nowMoving = false));

    // Award win bonus to the winner
    const winningPlayer = this.players.find(player => player.color === winner);
    if (winningPlayer) {
        winningPlayer.addWinBonus();
    }

    this.winner = winner;
    this.save();
};

RoomSchema.methods.getWinner = function () {
    if (this.pawns.filter(pawn => pawn.color === 'red' && pawn.position === 73).length === 4) {
        return 'red';
    }
    if (this.pawns.filter(pawn => pawn.color === 'blue' && pawn.position === 79).length === 4) {
        return 'blue';
    }
    if (this.pawns.filter(pawn => pawn.color === 'green' && pawn.position === 85).length === 4) {
        return 'green';
    }
    if (this.pawns.filter(pawn => pawn.color === 'yellow' && pawn.position === 91).length === 4) {
        return 'yellow';
    }
    return null;
};

RoomSchema.methods.isFull = function () {
    if (this.players.length === 4) {
        this.full = true;
    }
    return this.full;
};

RoomSchema.methods.getPlayer = function (playerId) {
    return this.players.find(player => player._id.toString() === playerId.toString());
};

RoomSchema.methods.addPlayer = function (name, id) {
    if (this.full) return;
    this.players.push({
        sessionID: id,
        name: name,
        ready: false,
        color: COLORS[this.players.length],
    });
};

RoomSchema.methods.getPawnIndex = function (pawnId) {
    return this.pawns.findIndex(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPawn = function (pawnId) {
    return this.pawns.find(pawn => pawn._id.toString() === pawnId.toString());
};

RoomSchema.methods.getPlayerPawns = function (color) {
    return this.pawns.filter(pawn => pawn.color === color);
};

RoomSchema.methods.getCurrentlyMovingPlayer = function () {
    return this.players.find(player => player.nowMoving === true);
};

RoomSchema.methods.getLeaderboard = function () {
    return this.players
        .filter(player => player.name !== '...')
        .sort((a, b) => b.score - a.score)
        .map((player, index) => ({
            rank: index + 1,
            name: player.name,
            color: player.color,
            score: player.score,
            pawnsInHome: player.pawnsInHome,
            pawnsCaptured: player.pawnsCaptured,
        }));
};

const Room = mongoose.model('Room', RoomSchema);

module.exports = Room;
