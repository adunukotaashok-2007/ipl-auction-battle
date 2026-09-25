/**
 * matchRoutes.js
 * ==============
 * API routes for the cricket match game engine.
 */

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

// Create a new match
router.post('/create', matchController.createMatch);

// Perform toss
router.post('/:matchId/toss', matchController.performToss);

// Process a ball (play a delivery)
router.post('/:matchId/ball', matchController.processBall);

// Get full scorecard
router.get('/:matchId/scorecard', matchController.getScorecard);

// Get current match state
router.get('/:matchId/state', matchController.getMatchState);

// Get match history
router.get('/history', matchController.getMatchHistory);

module.exports = router;
