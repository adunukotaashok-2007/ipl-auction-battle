/**
 * Match.js - Mongoose Model
 * =========================
 * Stores match data in MongoDB for history, stats, leaderboards.
 */

const mongoose = require('mongoose');

const ballLogSchema = new mongoose.Schema({
  ball: String,
  deliveryType: String,
  shotType: String,
  timing: String,
  outcome: mongoose.Schema.Types.Mixed,
  runs: Number,
  isExtra: Boolean,
  extraType: String,
  isWicket: Boolean,
  wicketDetails: {
    type: String,
    description: String,
    dismissedBy: String,
    fielder: String,
    scorecard: String
  },
  batsman: String,
  bowler: String,
  score: Number,
  wickets: Number
}, { _id: false });

const batsmanStatsSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  strikeRate: { type: Number, default: 0 },
  isOut: { type: Boolean, default: false },
  dismissal: String,
  battingPosition: Number
}, { _id: false });

const bowlerStatsSchema = new mongoose.Schema({
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  maidens: { type: Number, default: 0 },
  dots: { type: Number, default: 0 },
  economy: { type: Number, default: 0 }
}, { _id: false });

const inningsSchema = new mongoose.Schema({
  battingTeam: String,
  bowlingTeam: String,
  score: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  totalBalls: { type: Number, default: 0 },
  extras: {
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  batsmanStats: { type: Map, of: batsmanStatsSchema },
  bowlerStats: { type: Map, of: bowlerStatsSchema },
  fallOfWickets: [{
    wicketNumber: Number,
    score: Number,
    overs: String,
    batsman: String,
    dismissal: String
  }],
  ballLog: [ballLogSchema],
  isComplete: { type: Boolean, default: false },
  result: String
}, { _id: false });

const matchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ['SETUP', 'TOSS', 'IN_PROGRESS', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED'],
    default: 'SETUP'
  },

  // Teams
  team1: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamName: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    playingXI: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
  },
  team2: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamName: String,
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    playingXI: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    isAI: { type: Boolean, default: true }
  },

  // Toss
  toss: {
    winner: String,
    decision: { type: String, enum: ['BAT', 'BOWL'] },
    coinResult: String
  },

  // Match config
  config: {
    totalOvers: { type: Number, default: 20 },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    userTeam: { type: String, enum: ['team1', 'team2'], default: 'team1' }
  },

  // Current state
  currentInnings: { type: Number, default: 1 },
  target: Number,

  // Innings data
  innings1: inningsSchema,
  innings2: inningsSchema,

  // Result
  result: {
    winner: String,
    winnerName: String,
    description: String,
    margin: {
      type: { type: String },
      value: Number
    },
    manOfMatch: {
      name: String,
      team: String,
      stats: String
    }
  },

  // Commentary history
  commentary: [String],
  highlights: [{
    type: String,
    innings: Number,
    over: String,
    description: String,
    batsman: String,
    bowler: String,
    score: String
  }],

  // Full game state (for save/resume)
  fullState: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Indexes for queries
matchSchema.index({ 'team1.userId': 1, status: 1 });
matchSchema.index({ 'team2.userId': 1, status: 1 });
matchSchema.index({ createdAt: -1 });

// Virtual for formatted score
matchSchema.virtual('score1').get(function() {
  return this.innings1 ? `${this.innings1.score}/${this.innings1.wickets}` : '0/0';
});

matchSchema.virtual('score2').get(function() {
  return this.innings2 ? `${this.innings2.score}/${this.innings2.wickets}` : '0/0';
});

module.exports = mongoose.model('Match', matchSchema);
