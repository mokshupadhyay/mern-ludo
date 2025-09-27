const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PlayerSchema = new Schema({
    sessionID: String,
    name: String,
    color: String,
    ready: { type: Boolean, default: false },
    nowMoving: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
    pawnsInHome: { type: Number, default: 0 },
    pawnsCaptured: { type: Number, default: 0 },
});

PlayerSchema.methods.changeReadyStatus = function () {
    this.ready = !this.ready;
};

PlayerSchema.methods.canMove = function (room, rolledNumber) {
    const playerPawns = room.getPlayerPawns(this.color);
    for (const pawn of playerPawns) {
        if (pawn.canMove(rolledNumber)) return true;
    }
    return false;
};

// Scoring methods
PlayerSchema.methods.addProgressScore = function (steps) {
    // 1 point per step moved
    this.score += steps;
};

PlayerSchema.methods.addCaptureScore = function () {
    // 10 points for capturing an opponent's pawn
    this.score += 10;
    this.pawnsCaptured += 1;
};

PlayerSchema.methods.addHomeScore = function () {
    // 50 points for getting a pawn home
    this.score += 50;
    this.pawnsInHome += 1;
};

PlayerSchema.methods.addWinBonus = function () {
    // 100 points bonus for winning the game
    this.score += 100;
};

module.exports = PlayerSchema;
