/**
 * matchController.js
 * ==================
 * API controller for all match-related operations.
 * Handles match creation, toss, ball processing, and results.
 */

const BallEngine = require('../game-engine/BallEngine');
const Match = require('../models/Match');

// Store active game engines in memory (for in-progress matches)
const activeEngines = new Map();
const activeMatchStates = new Map();

/**
 * Create a new match
 * POST /api/match/create
 */
const createMatch = async (req, res) => {
  try {
    const { team1, team2, config } = req.body;

    if (!team1 || !team2) {
      return res.status(400).json({ error: 'Both teams are required' });
    }

    if (!team1.playingXI || team1.playingXI.length < 11) {
      return res.status(400).json({ error: 'Team 1 needs at least 11 players in playing XI' });
    }

    if (!team2.playingXI || team2.playingXI.length < 11) {
      return res.status(400).json({ error: 'Team 2 needs at least 11 players in playing XI' });
    }

    const difficulty = config?.difficulty || 'MEDIUM';
    const engine = new BallEngine({ difficulty, totalOvers: config?.totalOvers || 20 });

    // Create match document
    const match = new Match({
      matchId: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'TOSS',
      team1: {
        userId: team1.userId,
        teamName: team1.name,
        teamId: team1.teamId
      },
      team2: {
        userId: team2.userId,
        teamName: team2.name,
        teamId: team2.teamId,
        isAI: team2.isAI !== undefined ? team2.isAI : true
      },
      config: {
        totalOvers: config?.totalOvers || 20,
        difficulty,
        userTeam: config?.userTeam || 'team1'
      }
    });

    await match.save();

    // Store engine and initial data in memory
    activeEngines.set(match.matchId, engine);

    res.status(201).json({
      success: true,
      matchId: match.matchId,
      message: 'Match created! Ready for toss.',
      status: 'TOSS',
      teams: {
        team1: team1.name,
        team2: team2.name
      }
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Failed to create match', details: error.message });
  }
};

/**
 * Perform toss
 * POST /api/match/:matchId/toss
 */
const performToss = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { userCall, decision } = req.body; // userCall: 'HEADS'/'TAILS', decision: 'BAT'/'BOWL'

    if (!userCall || !['HEADS', 'TAILS'].includes(userCall)) {
      return res.status(400).json({ error: 'Invalid toss call. Choose HEADS or TAILS' });
    }

    const match = await Match.findOne({ matchId });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'TOSS') {
      return res.status(400).json({ error: 'Toss already done or match not in toss state' });
    }

    let engine = activeEngines.get(matchId);
    if (!engine) {
      engine = new BallEngine({
        difficulty: match.config.difficulty,
        totalOvers: match.config.totalOvers
      });
      activeEngines.set(matchId, engine);
    }

    // Flip the coin
    const tossResult = engine.performToss();
    const userWonToss = userCall === tossResult.result;
    const tossWinner = userWonToss ? match.config.userTeam : (match.config.userTeam === 'team1' ? 'team2' : 'team1');

    let tossDecision;
    if (userWonToss) {
      // User won toss - they decide
      if (!decision || !['BAT', 'BOWL'].includes(decision)) {
        // Return toss result and ask for decision
        return res.json({
          success: true,
          tossResult: tossResult.result,
          userCall,
          userWonToss: true,
          message: `It's ${tossResult.result}! You won the toss! Choose to BAT or BOWL.`,
          needsDecision: true
        });
      }
      tossDecision = decision;
    } else {
      // AI won toss - AI decides
      // AI logic: 60% chance to bat first
      tossDecision = Math.random() > 0.4 ? 'BAT' : 'BOWL';
    }

    // Update match with toss info
    match.toss = {
      winner: tossWinner,
      decision: tossDecision,
      coinResult: tossResult.result
    };
    match.status = 'IN_PROGRESS';

    // Get team data (fetch playing XI details)
    const team1Data = req.body.team1Data || {
      name: match.team1.teamName || 'Team 1',
      playingXI: req.body.team1PlayingXI || generateDefaultTeam('Team 1')
    };
    const team2Data = req.body.team2Data || {
      name: match.team2.teamName || 'Team 2',
      playingXI: req.body.team2PlayingXI || generateDefaultTeam('Team 2')
    };

    // Initialize match state
    const matchState = engine.createMatchState(team1Data, team2Data, tossWinner, tossDecision);

    // Store in memory
    activeMatchStates.set(matchId, matchState);

    // Save full state
    match.fullState = matchState;
    match.currentInnings = 1;
    await match.save();

    const winnerName = tossWinner === 'team1' ? team1Data.name : team2Data.name;

    res.json({
      success: true,
      tossResult: tossResult.result,
      userCall,
      userWonToss,
      tossWinner: winnerName,
      tossDecision,
      message: `${winnerName} won the toss and elected to ${tossDecision}!`,
      matchState: {
        battingTeam: matchState.teams[matchState.battingTeam].name,
        bowlingTeam: matchState.teams[matchState.bowlingTeam].name,
        innings: matchState.currentInnings,
        isUserBatting: matchState.battingTeam === match.config.userTeam
      }
    });
  } catch (error) {
    console.error('Error performing toss:', error);
    res.status(500).json({ error: 'Toss failed', details: error.message });
  }
};

/**
 * Process a ball
 * POST /api/match/:matchId/ball
 */
const processBall = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action } = req.body;
    // action: { shotType, timing } for batting, { deliveryType } for bowling

    const match = await Match.findOne({ matchId });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Match is not in progress' });
    }

    let engine = activeEngines.get(matchId);
    if (!engine) {
      engine = new BallEngine({
        difficulty: match.config.difficulty,
        totalOvers: match.config.totalOvers
      });
      activeEngines.set(matchId, engine);
    }

    let matchState = activeMatchStates.get(matchId);
    if (!matchState) {
      matchState = match.fullState;
      activeMatchStates.set(matchId, matchState);
    }

    // Determine if user is batting
    const isUserBatting = matchState.battingTeam === match.config.userTeam;

    // Validate action
    if (isUserBatting) {
      if (!action.shotType) {
        return res.status(400).json({
          error: 'You are batting! Choose a shot type.',
          options: ['DRIVE', 'PULL', 'SWEEP', 'DEFEND', 'LOFT', 'SCOOP'],
          timingOptions: ['PERFECT', 'GOOD', 'AVERAGE', 'MISTIMED', 'MISS']
        });
      }
    } else {
      if (!action.deliveryType) {
        return res.status(400).json({
          error: 'You are bowling! Choose a delivery type.',
          options: ['FAST', 'SHORT', 'YORKER', 'SPIN', 'SLOWER']
        });
      }
    }

    // Check if we need to set bowler for new over
    const currentInnings = matchState.innings[matchState.currentInnings];
    if (!currentInnings.currentBowler && currentInnings.balls === 0) {
      // Need to set bowler
      if (!isUserBatting) {
        // User is bowling - they should specify bowler
        if (action.bowlerName) {
          const result = engine.setBowlerForOver(matchState, action.bowlerName);
          if (result.error) {
            return res.status(400).json({ error: result.error });
          }
        } else {
          // List available bowlers
          const bowlingTeamData = matchState.teams[currentInnings.bowlingTeam];
          const availableBowlers = bowlingTeamData.players.filter(p => {
            const stats = currentInnings.bowlerStats[p.name];
            const bowled = stats ? stats.overs : 0;
            return bowled < 4 && p.name !== currentInnings.lastOverBowler;
          }).filter(p => p.role === 'BOWLER' || p.role === 'ALL_ROUNDER' || p.bowlingRating > 30);

          if (!action.deliveryType) {
            return res.status(400).json({
              error: 'New over! Select a bowler.',
              availableBowlers: availableBowlers.map(b => ({
                name: b.name,
                type: b.bowlingType,
                rating: b.bowlingRating,
                oversBowled: currentInnings.bowlerStats[b.name]?.overs || 0
              }))
            });
          }
          // Auto-select if delivery type given but no bowler specified
          const aiSelectedBowler = engine.ai.selectBowler(
            availableBowlers, currentInnings.bowlerStats,
            engine._getMatchSituation(matchState)
          );
          if (aiSelectedBowler) {
            engine.setBowlerForOver(matchState, aiSelectedBowler.name);
          }
        }
      } else {
        // AI is bowling - AI selects bowler
        const bowlingTeamData = matchState.teams[currentInnings.bowlingTeam];
        const availableBowlers = bowlingTeamData.players.filter(p => {
          const stats = currentInnings.bowlerStats[p.name];
          const bowled = stats ? stats.overs : 0;
          return bowled < 4 && p.name !== currentInnings.lastOverBowler;
        });

        const aiBowler = engine.ai.selectBowler(
          availableBowlers, currentInnings.bowlerStats,
          engine._getMatchSituation(matchState)
        );
        if (aiBowler) {
          engine.setBowlerForOver(matchState, aiBowler.name);
        }
      }
    }

    // Process the ball
    const result = engine.processBall(matchState, action, isUserBatting);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Update stored state
    activeMatchStates.set(matchId, result.matchState);

    // Save to DB periodically (every over or on wicket/innings end)
    if (result.isOverComplete || result.isInningsComplete || result.ballResult.isWicket || matchState.status === 'COMPLETED') {
      match.fullState = result.matchState;
      match.currentInnings = result.matchState.currentInnings;
      match.commentary = result.matchState.commentary.slice(-50); // Last 50 entries
      match.highlights = result.matchState.highlights;

      if (result.matchState.target) {
        match.target = result.matchState.target;
      }

      if (result.matchState.status === 'COMPLETED') {
        match.status = 'COMPLETED';
        match.result = result.matchState.result;
      }

      await match.save();
    }

    // Build response
    const innings = result.matchState.innings[result.matchState.currentInnings];
    const battingTeamData = result.matchState.teams[innings?.battingTeam || result.matchState.battingTeam];
    const bowlingTeamData = result.matchState.teams[innings?.bowlingTeam || result.matchState.bowlingTeam];

    const response = {
      success: true,
      ball: result.ballResult,
      matchStatus: result.matchState.status,

      score: innings ? {
        runs: innings.score,
        wickets: innings.wickets,
        overs: `${innings.overs}.${innings.balls}`,
        runRate: innings.totalBalls > 0 ? ((innings.score / innings.totalBalls) * 6).toFixed(2) : '0.00',
        battingTeam: battingTeamData?.name,
        bowlingTeam: bowlingTeamData?.name
      } : null,

      target: result.matchState.target,
      requiredRuns: result.matchState.target && innings ?
        result.matchState.target - innings.score : null,
      requiredRate: (result.matchState.currentInnings === 2 && result.matchState.target && innings) ?
        (((result.matchState.target - innings.score) / Math.max(1, (20 * 6 - innings.totalBalls))) * 6).toFixed(2) : null,

      currentBatsman: innings ? {
        striker: battingTeamData?.players[innings.striker]?.name,
        strikerStats: innings.batsmanStats[battingTeamData?.players[innings.striker]?.name],
        nonStriker: battingTeamData?.players[innings.nonStriker]?.name,
        nonStrikerStats: innings.batsmanStats[battingTeamData?.players[innings.nonStriker]?.name]
      } : null,

      currentBowler: innings?.currentBowler ? {
        name: innings.currentBowler,
        stats: innings.bowlerStats[innings.currentBowler]
      } : null,

      isOverComplete: result.isOverComplete,
      isInningsComplete: result.isInningsComplete,
      isMatchComplete: result.matchState.status === 'COMPLETED',

      commentary: result.ballResult.commentary,

      // If match is complete, include result
      ...(result.matchState.status === 'COMPLETED' ? {
        result: result.matchState.result,
        manOfMatch: engine.selectManOfMatch(result.matchState)
      } : {})
    };

    // If innings complete but match not over, include innings break info
    if (result.isInningsComplete && result.matchState.status !== 'COMPLETED') {
      response.inningsBreak = {
        message: `End of innings! Target: ${result.matchState.target}`,
        firstInningsScore: result.matchState.innings[1].score,
        firstInningsWickets: result.matchState.innings[1].wickets,
        target: result.matchState.target,
        isUserBattingNext: result.matchState.battingTeam === match.config.userTeam
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing ball:', error);
    res.status(500).json({ error: 'Failed to process ball', details: error.message });
  }
};

/**
 * Get full scorecard
 * GET /api/match/:matchId/scorecard
 */
const getScorecard = async (req, res) => {
  try {
    const { matchId } = req.params;

    let matchState = activeMatchStates.get(matchId);
    if (!matchState) {
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      matchState = match.fullState;
    }

    if (!matchState) {
      return res.status(400).json({ error: 'Match state not available' });
    }

    let engine = activeEngines.get(matchId);
    if (!engine) {
      engine = new BallEngine();
    }

    const scorecard = engine.getScorecard(matchState);
    res.json({ success: true, scorecard });
  } catch (error) {
    console.error('Error getting scorecard:', error);
    res.status(500).json({ error: 'Failed to get scorecard' });
  }
};

/**
 * Get match state
 * GET /api/match/:matchId/state
 */
const getMatchState = async (req, res) => {
  try {
    const { matchId } = req.params;

    let matchState = activeMatchStates.get(matchId);
    if (!matchState) {
      const match = await Match.findOne({ matchId });
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      matchState = match.fullState;
    }

    const innings = matchState?.innings[matchState.currentInnings];

    res.json({
      success: true,
      matchId,
      status: matchState?.status,
      currentInnings: matchState?.currentInnings,
      score: innings ? {
        runs: innings.score,
        wickets: innings.wickets,
        overs: `${innings.overs}.${innings.balls}`
      } : null,
      target: matchState?.target,
      battingTeam: matchState?.teams[matchState?.battingTeam]?.name,
      bowlingTeam: matchState?.teams[matchState?.bowlingTeam]?.name,
      result: matchState?.result
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get match state' });
  }
};

/**
 * Get match history
 * GET /api/match/history
 */
const getMatchHistory = async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? {
      $or: [
        { 'team1.userId': userId },
        { 'team2.userId': userId }
      ]
    } : {};

    const matches = await Match.find(query)
      .select('matchId status team1.teamName team2.teamName result toss createdAt')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, matches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get match history' });
  }
};

/**
 * Generate default team for testing
 */
function generateDefaultTeam(teamName) {
  const roles = ['BATSMAN', 'BATSMAN', 'BATSMAN', 'BATSMAN', 'ALL_ROUNDER', 'ALL_ROUNDER', 'WICKET_KEEPER', 'BOWLER', 'BOWLER', 'BOWLER', 'BOWLER'];
  const bowlingTypes = [null, null, null, null, 'FAST', 'SPIN', null, 'FAST', 'FAST', 'SPIN', 'SPIN'];

  return roles.map((role, i) => ({
    name: `${teamName} Player ${i + 1}`,
    role,
    battingRating: role === 'BATSMAN' ? 70 + Math.floor(Math.random() * 20) :
                    role === 'ALL_ROUNDER' ? 60 + Math.floor(Math.random() * 15) :
                    role === 'WICKET_KEEPER' ? 65 + Math.floor(Math.random() * 15) :
                    30 + Math.floor(Math.random() * 20),
    bowlingRating: role === 'BOWLER' ? 70 + Math.floor(Math.random() * 20) :
                    role === 'ALL_ROUNDER' ? 55 + Math.floor(Math.random() * 20) :
                    20 + Math.floor(Math.random() * 15),
    bowlingType: bowlingTypes[i],
    isCaptain: i === 0,
    isKeeper: role === 'WICKET_KEEPER'
  }));
}

module.exports = {
  createMatch,
  performToss,
  processBall,
  getScorecard,
  getMatchState,
  getMatchHistory
};
