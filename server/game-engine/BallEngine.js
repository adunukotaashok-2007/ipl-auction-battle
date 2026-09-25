/**
 * BallEngine.js
 * =============
 * THE HEART OF THE CRICKET GAME.
 * 
 * Processes every single ball delivery in the match.
 * Takes inputs from user/AI, calculates outcome, updates state.
 * 
 * This is what makes the game a GAME, not just an auction simulator.
 */

const ProbabilityMatrix = require('./ProbabilityMatrix');
const WicketCalculator = require('./WicketCalculator');
const CommentaryGenerator = require('./CommentaryGenerator');
const AIPlayer = require('./AIPlayer');

class BallEngine {
  constructor(config = {}) {
    this.probabilityMatrix = new ProbabilityMatrix();
    this.wicketCalculator = new WicketCalculator();
    this.commentaryGenerator = new CommentaryGenerator();
    this.ai = new AIPlayer(config.difficulty || 'MEDIUM');

    // Match configuration
    this.totalOvers = config.totalOvers || 20;
    this.maxWickets = config.maxWickets || 10;
    this.maxOversPerBowler = config.maxOversPerBowler || 4;
  }

  /**
   * Initialize a new match state
   */
  createMatchState(team1, team2, tossWinner, tossDecision) {
    const battingFirst = tossDecision === 'BAT' ? tossWinner : (tossWinner === 'team1' ? 'team2' : 'team1');
    const bowlingFirst = battingFirst === 'team1' ? 'team2' : 'team1';

    return {
      // Match info
      matchId: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'IN_PROGRESS',
      currentInnings: 1,
      toss: { winner: tossWinner, decision: tossDecision },

      // Teams
      teams: {
        team1: this._initTeamData(team1),
        team2: this._initTeamData(team2)
      },

      // Current state tracking
      battingTeam: battingFirst,
      bowlingTeam: bowlingFirst,

      // Innings data
      innings: {
        1: this._createInningsState(battingFirst, bowlingFirst, team1, team2),
        2: null // Created when innings 2 starts
      },

      // Target for 2nd innings
      target: null,

      // Commentary log
      commentary: [],

      // Match events for highlights
      highlights: [],

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  _initTeamData(team) {
    return {
      name: team.name || 'Team',
      shortName: team.shortName || team.name?.substr(0, 3).toUpperCase() || 'TEM',
      players: (team.playingXI || team.players || []).map((p, idx) => ({
        id: p._id || p.id || `player_${idx}`,
        name: p.name || `Player ${idx + 1}`,
        role: p.role || 'ALL_ROUNDER',
        battingRating: p.battingRating || p.batting || 50,
        bowlingRating: p.bowlingRating || p.bowling || 50,
        bowlingType: p.bowlingType || (p.role === 'BOWLER' ? 'FAST' : null),
        isCaptain: p.isCaptain || false,
        isKeeper: p.isKeeper || p.role === 'WICKET_KEEPER' || false
      }))
    };
  }

  _createInningsState(battingTeamKey, bowlingTeamKey, team1, team2) {
    const battingTeam = battingTeamKey === 'team1' ? team1 : team2;
    const playingXI = battingTeam.playingXI || battingTeam.players || [];

    return {
      battingTeam: battingTeamKey,
      bowlingTeam: bowlingTeamKey,
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,         // Balls in current over (0-5)
      totalBalls: 0,     // Total legal deliveries
      extras: { wides: 0, noBalls: 0, byes: 0, total: 0 },

      // Current batsmen
      striker: 0,        // Index in batting order
      nonStriker: 1,

      // Batting order tracking
      battingOrder: [],   // Will be filled as batsmen come in
      currentPartnership: { runs: 0, balls: 0 },

      // Bowler tracking
      currentBowler: null,
      lastOverBowler: null,
      bowlerStats: {},    // { bowlerName: { overs, balls, runs, wickets, maidens, dots } }

      // Individual batting stats
      batsmanStats: {},   // { batsmanName: { runs, balls, 4s, 6s, strikeRate, isOut, dismissal } }

      // Over-by-over data
      overs_data: [],     // Array of over objects

      // Ball-by-ball log
      ballLog: [],

      // Fall of wickets
      fallOfWickets: [],

      // Status
      isComplete: false,
      result: null
    };
  }

  /**
   * ============================================
   * PROCESS A SINGLE BALL - THE MAIN FUNCTION
   * ============================================
   * 
   * @param {Object} matchState - Current match state
   * @param {Object} userAction - User's chosen action
   *   For batting: { shotType: 'DRIVE', timing: 'GOOD' }
   *   For bowling: { deliveryType: 'YORKER' }
   * @param {boolean} isUserBatting - Is the user batting?
   * @returns {Object} Ball result + updated match state
   */
  processBall(matchState, userAction, isUserBatting) {
    const innings = matchState.innings[matchState.currentInnings];
    if (!innings || innings.isComplete) {
      return { error: 'Innings is complete', matchState };
    }

    const battingTeamData = matchState.teams[innings.battingTeam];
    const bowlingTeamData = matchState.teams[innings.bowlingTeam];

    // Get current batsman and bowler
    const strikerPlayer = battingTeamData.players[innings.striker];
    const bowlerPlayer = innings.currentBowler ?
      bowlingTeamData.players.find(p => p.name === innings.currentBowler) :
      bowlingTeamData.players.find(p => p.role === 'BOWLER') || bowlingTeamData.players[10] || bowlingTeamData.players[bowlingTeamData.players.length - 1];

    if (!innings.currentBowler && bowlerPlayer) {
      innings.currentBowler = bowlerPlayer.name;
    }

    // Initialize batsman stats if not exists
    if (!innings.batsmanStats[strikerPlayer.name]) {
      innings.batsmanStats[strikerPlayer.name] = {
        runs: 0, balls: 0, fours: 0, sixes: 0,
        strikeRate: 0, isOut: false, dismissal: null,
        battingPosition: Object.keys(innings.batsmanStats).length + 1
      };
      innings.battingOrder.push(strikerPlayer.name);
    }

    // Initialize non-striker stats if needed
    const nonStrikerPlayer = battingTeamData.players[innings.nonStriker];
    if (nonStrikerPlayer && !innings.batsmanStats[nonStrikerPlayer.name]) {
      innings.batsmanStats[nonStrikerPlayer.name] = {
        runs: 0, balls: 0, fours: 0, sixes: 0,
        strikeRate: 0, isOut: false, dismissal: null,
        battingPosition: Object.keys(innings.batsmanStats).length + 1
      };
      innings.battingOrder.push(nonStrikerPlayer.name);
    }

    // Initialize bowler stats if not exists
    if (!innings.bowlerStats[bowlerPlayer.name]) {
      innings.bowlerStats[bowlerPlayer.name] = {
        overs: 0, balls: 0, runs: 0, wickets: 0,
        maidens: 0, dots: 0, economy: 0,
        currentOverRuns: 0
      };
    }

    // Determine shot and delivery
    let shotType, deliveryType, timing;

    if (isUserBatting) {
      // User is batting - they chose the shot
      shotType = userAction.shotType || 'DEFEND';
      timing = userAction.timing || 'AVERAGE';
      // AI bowls
      const aiAction = this.ai.decideBowlingAction(
        this._getMatchSituation(matchState),
        bowlerPlayer,
        strikerPlayer
      );
      deliveryType = aiAction.deliveryType;
    } else {
      // User is bowling - they chose the delivery
      deliveryType = userAction.deliveryType || 'FAST';
      // AI bats
      const aiAction = this.ai.decideBattingAction(
        this._getMatchSituation(matchState),
        deliveryType,
        strikerPlayer
      );
      shotType = aiAction.shotType;
      timing = aiAction.timing;
    }

    // ==== CHECK FOR EXTRAS FIRST ====
    const extraProbs = this.probabilityMatrix.getExtraProbabilities(
      bowlerPlayer.bowlingRating || 50, deliveryType
    );

    const extraRoll = Math.random() * 100;
    let extra = null;

    if (extraRoll < extraProbs.wide) {
      extra = { type: 'wide', runs: 1 };
    } else if (extraRoll < extraProbs.wide + extraProbs.noBall) {
      extra = { type: 'noBall', runs: 1 };
    }

    // ==== PROCESS EXTRA BALL ====
    if (extra) {
      innings.score += extra.runs;
      innings.extras[extra.type === 'wide' ? 'wides' : 'noBalls']++;
      innings.extras.total += extra.runs;
      innings.bowlerStats[bowlerPlayer.name].runs += extra.runs;

      const commentary = this.commentaryGenerator.generateBallCommentary(
        0, shotType, deliveryType, strikerPlayer, bowlerPlayer, false, extra
      );

      const ballResult = {
        ball: `${innings.overs}.${innings.balls}`,
        deliveryType,
        shotType: null,
        outcome: extra.type,
        runs: extra.runs,
        isExtra: true,
        extraType: extra.type,
        isWicket: false,
        commentary: commentary,
        batsman: strikerPlayer.name,
        bowler: bowlerPlayer.name,
        score: innings.score,
        wickets: innings.wickets
      };

      innings.ballLog.push(ballResult);
      matchState.commentary.push(...commentary);
      // Note: Extra balls don't count as legal deliveries

      matchState.updatedAt = new Date();
      return { ballResult, matchState, isInningsComplete: false };
    }

    // ==== CALCULATE BALL OUTCOME ====
    const probabilities = this.probabilityMatrix.getOutcomeProbabilities(
      shotType, deliveryType,
      strikerPlayer.battingRating || 50,
      bowlerPlayer.bowlingRating || 50,
      timing
    );

    // Apply pitch & pressure modifiers
    const modifiedProbs = this._applyMatchModifiers(probabilities.outcomes, matchState);

    // Roll for outcome
    const outcome = this._rollOutcome(modifiedProbs);

    // ==== PROCESS RESULT ====
    let runs = 0;
    let isWicket = false;
    let wicketDetails = null;
    let commentary = [];

    if (outcome === 'wicket') {
      isWicket = true;
      runs = 0;

      // Calculate wicket type
      wicketDetails = this.wicketCalculator.calculateWicket(
        shotType, deliveryType,
        strikerPlayer, bowlerPlayer,
        bowlingTeamData.players
      );

      commentary.push(...this.commentaryGenerator.generateBallCommentary(
        0, shotType, deliveryType, strikerPlayer, bowlerPlayer, false, null
      ));
      commentary.push(wicketDetails.description);
    } else {
      runs = parseInt(outcome);
      commentary = this.commentaryGenerator.generateBallCommentary(
        runs, shotType, deliveryType, strikerPlayer, bowlerPlayer, false, null
      );
    }

    // ==== UPDATE STATS ====

    // Batting stats
    innings.batsmanStats[strikerPlayer.name].balls++;
    innings.batsmanStats[strikerPlayer.name].runs += runs;
    if (runs === 4) innings.batsmanStats[strikerPlayer.name].fours++;
    if (runs === 6) innings.batsmanStats[strikerPlayer.name].sixes++;
    innings.batsmanStats[strikerPlayer.name].strikeRate =
      innings.batsmanStats[strikerPlayer.name].balls > 0 ?
        ((innings.batsmanStats[strikerPlayer.name].runs /
          innings.batsmanStats[strikerPlayer.name].balls) * 100).toFixed(1) : 0;

    // Bowling stats
    innings.bowlerStats[bowlerPlayer.name].balls++;
    innings.bowlerStats[bowlerPlayer.name].runs += runs;
    innings.bowlerStats[bowlerPlayer.name].currentOverRuns += runs;
    if (runs === 0 && !isWicket) innings.bowlerStats[bowlerPlayer.name].dots++;
    if (isWicket) innings.bowlerStats[bowlerPlayer.name].wickets++;

    // Innings stats
    innings.score += runs;
    innings.totalBalls++;
    innings.balls++;
    innings.currentPartnership.runs += runs;
    innings.currentPartnership.balls++;

    // Check for milestones
    const milestones = this._checkMilestones(innings, strikerPlayer, bowlerPlayer);
    if (milestones.length > 0) {
      commentary.push(...milestones.map(m =>
        this.commentaryGenerator.generateMilestoneCommentary(m.type, m.player, m.value)
      ));
    }

    // ==== HANDLE WICKET ====
    if (isWicket) {
      innings.wickets++;
      innings.batsmanStats[strikerPlayer.name].isOut = true;
      innings.batsmanStats[strikerPlayer.name].dismissal = wicketDetails.scorecard;

      // Record fall of wicket
      innings.fallOfWickets.push({
        wicketNumber: innings.wickets,
        score: innings.score,
        overs: `${innings.overs}.${innings.balls}`,
        batsman: strikerPlayer.name,
        dismissal: wicketDetails.scorecard
      });

      // Partnership ends
      innings.currentPartnership = { runs: 0, balls: 0 };

      // New batsman comes in
      const nextBatsmanIndex = this._getNextBatsman(innings, battingTeamData);
      if (nextBatsmanIndex !== -1) {
        innings.striker = nextBatsmanIndex;
      }

      // Add to highlights
      matchState.highlights.push({
        type: 'WICKET',
        innings: matchState.currentInnings,
        over: `${innings.overs}.${innings.balls}`,
        description: wicketDetails.description,
        score: `${innings.score}/${innings.wickets}`
      });
    }

    // Handle boundary highlights
    if (runs === 4 || runs === 6) {
      matchState.highlights.push({
        type: runs === 6 ? 'SIX' : 'FOUR',
        innings: matchState.currentInnings,
        over: `${innings.overs}.${innings.balls}`,
        batsman: strikerPlayer.name,
        bowler: bowlerPlayer.name,
        score: `${innings.score}/${innings.wickets}`
      });
    }

    // ==== HANDLE OVER COMPLETION ====
    let isOverComplete = false;
    if (innings.balls >= 6) {
      isOverComplete = true;
      innings.overs++;
      innings.balls = 0;

      // Check for maiden
      if (innings.bowlerStats[bowlerPlayer.name].currentOverRuns === 0) {
        innings.bowlerStats[bowlerPlayer.name].maidens++;
        commentary.push(
          this.commentaryGenerator.generateMilestoneCommentary(
            isWicket ? 'wicketMaiden' : 'maiden',
            bowlerPlayer
          )
        );
      }

      // Update bowler overs
      innings.bowlerStats[bowlerPlayer.name].overs++;
      innings.bowlerStats[bowlerPlayer.name].currentOverRuns = 0;
      innings.bowlerStats[bowlerPlayer.name].economy =
        innings.bowlerStats[bowlerPlayer.name].overs > 0 ?
          (innings.bowlerStats[bowlerPlayer.name].runs /
            innings.bowlerStats[bowlerPlayer.name].overs).toFixed(1) : 0;

      // Store over data
      innings.overs_data.push({
        overNumber: innings.overs,
        bowler: bowlerPlayer.name,
        runs: innings.bowlerStats[bowlerPlayer.name].runs,
        wickets: innings.bowlerStats[bowlerPlayer.name].wickets
      });

      // Swap strike at end of over
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];

      // Mark last bowler
      innings.lastOverBowler = bowlerPlayer.name;
      innings.currentBowler = null; // Needs to be set for next over

      // Powerplay commentary
      if (innings.overs === 6) {
        commentary.push(
          this.commentaryGenerator.generateMilestoneCommentary('powerplayEnd', {})
        );
      }
    }

    // Swap strike on odd runs (1, 3)
    if (!isWicket && (runs === 1 || runs === 3)) {
      [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
    }

    // ==== CHECK INNINGS END ====
    let isInningsComplete = false;

    // All out
    if (innings.wickets >= this.maxWickets - 1) {
      // In cricket, 10th wicket = all out (for 11 players)
      // With playingXI of 11, max wickets = 10
      isInningsComplete = true;
      innings.isComplete = true;
      innings.result = 'ALL_OUT';
    }

    // Overs complete
    if (innings.overs >= this.totalOvers) {
      isInningsComplete = true;
      innings.isComplete = true;
      innings.result = 'OVERS_COMPLETE';
    }

    // Target achieved (2nd innings)
    if (matchState.currentInnings === 2 && matchState.target) {
      if (innings.score >= matchState.target) {
        isInningsComplete = true;
        innings.isComplete = true;
        innings.result = 'TARGET_ACHIEVED';
      }
    }

    // ==== HANDLE INNINGS TRANSITION ====
    if (isInningsComplete) {
      if (matchState.currentInnings === 1) {
        // Set target for 2nd innings
        matchState.target = innings.score + 1;

        // Create 2nd innings
        const newBatting = innings.bowlingTeam;
        const newBowling = innings.battingTeam;

        matchState.innings[2] = this._createInningsState(
          newBatting, newBowling,
          matchState.teams.team1, matchState.teams.team2
        );

        matchState.currentInnings = 2;
        matchState.battingTeam = newBatting;
        matchState.bowlingTeam = newBowling;

        commentary.push(`End of first innings! ${matchState.teams[innings.battingTeam].name} score ${innings.score}/${innings.wickets} in ${innings.overs}.${innings.balls} overs.`);
        commentary.push(`Target: ${matchState.target} runs to win!`);
      } else {
        // Match complete
        matchState.status = 'COMPLETED';
        const result = this._calculateMatchResult(matchState);
        matchState.result = result;
        commentary.push(result.description);
      }
    }

    // Add situation commentary
    const situation = this.commentaryGenerator.generateSituationCommentary(
      this._getMatchSituation(matchState)
    );
    if (situation) commentary.push(situation);

    // Build ball result
    const ballResult = {
      ball: `${innings.overs}.${innings.balls || (isOverComplete ? 6 : innings.balls)}`,
      deliveryType,
      shotType,
      timing,
      outcome: isWicket ? 'WICKET' : runs,
      runs,
      isExtra: false,
      isWicket,
      wicketDetails: wicketDetails || null,
      commentary,
      batsman: strikerPlayer.name,
      bowler: bowlerPlayer.name,
      score: innings.score,
      wickets: innings.wickets,
      overComplete: isOverComplete,
      inningsComplete: isInningsComplete
    };

    innings.ballLog.push(ballResult);
    matchState.commentary.push(...commentary);
    matchState.updatedAt = new Date();

    return { ballResult, matchState, isInningsComplete, isOverComplete };
  }

  /**
   * Roll a weighted random outcome
   */
  _rollOutcome(probabilities) {
    const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;

    for (const [outcome, weight] of Object.entries(probabilities)) {
      roll -= weight;
      if (roll <= 0) {
        return outcome;
      }
    }
    return '0'; // Default dot ball
  }

  /**
   * Apply match situation modifiers to probabilities
   */
  _applyMatchModifiers(outcomes, matchState) {
    const modified = { ...outcomes };
    const situation = this._getMatchSituation(matchState);

    // Pressure factor: more wickets lost = more risky
    if (situation.wickets >= 5) {
      modified.wicket = Math.round(modified.wicket * 1.3);
    }
    if (situation.wickets >= 8) {
      modified.wicket = Math.round(modified.wicket * 1.5);
    }

    // Death overs: more boundaries but also more wickets
    if (situation.overs >= 16) {
      modified[4] = Math.round(modified[4] * 1.2);
      modified[6] = Math.round(modified[6] * 1.3);
      modified.wicket = Math.round(modified.wicket * 1.15);
    }

    // Powerplay: more boundaries
    if (situation.overs < 6) {
      modified[4] = Math.round(modified[4] * 1.15);
    }

    return modified;
  }

  /**
   * Get simplified match situation for AI / commentary
   */
  _getMatchSituation(matchState) {
    const innings = matchState.innings[matchState.currentInnings];
    if (!innings) return {};

    return {
      score: innings.score,
      wickets: innings.wickets,
      overs: innings.overs + (innings.balls / 10), // e.g., 5.3
      balls: innings.balls,
      ballsInOver: innings.balls,
      target: matchState.target,
      innings: matchState.currentInnings,
      totalOvers: this.totalOvers
    };
  }

  /**
   * Get the next batsman index
   */
  _getNextBatsman(innings, battingTeamData) {
    const usedIndices = new Set();

    // Collect all batsmen who have batted
    for (const [name, stats] of Object.entries(innings.batsmanStats)) {
      const idx = battingTeamData.players.findIndex(p => p.name === name);
      if (idx !== -1) usedIndices.add(idx);
    }

    // Add current non-striker
    usedIndices.add(innings.nonStriker);

    // Find next available batsman
    for (let i = 0; i < battingTeamData.players.length; i++) {
      if (!usedIndices.has(i)) {
        return i;
      }
    }

    return -1; // All out
  }

  /**
   * Check for milestone events
   */
  _checkMilestones(innings, batsman, bowler) {
    const milestones = [];
    const bStats = innings.batsmanStats[batsman.name];
    const bwStats = innings.bowlerStats[bowler.name];

    // Batsman milestones
    if (bStats) {
      if (bStats.runs === 50 || (bStats.runs > 50 && bStats.runs - (innings.ballLog[innings.ballLog.length - 1]?.runs || 0) < 50)) {
        if (bStats.runs >= 50 && bStats.runs < 56) {
          milestones.push({ type: 'fifty', player: batsman, value: bStats.runs });
        }
      }
      if (bStats.runs >= 100 && bStats.runs < 107) {
        milestones.push({ type: 'hundred', player: batsman, value: bStats.runs });
      }
    }

    // Team milestones
    const teamMilestones = [50, 100, 150, 200];
    for (const m of teamMilestones) {
      const prevScore = innings.score - (innings.ballLog[innings.ballLog.length - 1]?.runs || 0);
      if (innings.score >= m && prevScore < m) {
        milestones.push({
          type: `team${m}`,
          player: { name: 'Team' },
          value: innings.score
        });
      }
    }

    // Bowler milestones
    if (bwStats) {
      if (bwStats.wickets === 3) {
        milestones.push({ type: 'threeWickets', player: bowler, value: 3 });
      }
      if (bwStats.wickets === 5) {
        milestones.push({ type: 'fiveWickets', player: bowler, value: 5 });
      }
    }

    return milestones;
  }

  /**
   * Calculate final match result
   */
  _calculateMatchResult(matchState) {
    const innings1 = matchState.innings[1];
    const innings2 = matchState.innings[2];

    if (!innings1 || !innings2) {
      return { winner: null, description: 'Match incomplete' };
    }

    const team1Score = innings1.battingTeam === 'team1' ? innings1.score : innings2.score;
    const team2Score = innings1.battingTeam === 'team1' ? innings2.score : innings1.score;
    const team1Name = matchState.teams.team1.name;
    const team2Name = matchState.teams.team2.name;

    const battingFirstTeam = innings1.battingTeam;
    const battingFirstName = matchState.teams[battingFirstTeam].name;
    const chasersTeam = innings2.battingTeam;
    const chasersName = matchState.teams[chasersTeam].name;

    if (innings2.score >= matchState.target) {
      // Chasing team wins
      const wicketsRemaining = 10 - innings2.wickets;
      const ballsRemaining = (this.totalOvers * 6) - innings2.totalBalls;
      return {
        winner: chasersTeam,
        winnerName: chasersName,
        description: `${chasersName} win by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''} with ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining!`,
        margin: { type: 'wickets', value: wicketsRemaining },
        scores: {
          [battingFirstTeam]: `${innings1.score}/${innings1.wickets}`,
          [chasersTeam]: `${innings2.score}/${innings2.wickets}`
        }
      };
    } else if (innings1.score > innings2.score) {
      // Batting first team wins
      const margin = innings1.score - innings2.score;
      return {
        winner: battingFirstTeam,
        winnerName: battingFirstName,
        description: `${battingFirstName} win by ${margin} run${margin !== 1 ? 's' : ''}!`,
        margin: { type: 'runs', value: margin },
        scores: {
          [battingFirstTeam]: `${innings1.score}/${innings1.wickets}`,
          [chasersTeam]: `${innings2.score}/${innings2.wickets}`
        }
      };
    } else {
      // Tie
      return {
        winner: null,
        winnerName: null,
        description: `It's a TIE! Both teams scored ${innings1.score}! What a match!`,
        margin: { type: 'tie', value: 0 },
        scores: {
          [battingFirstTeam]: `${innings1.score}/${innings1.wickets}`,
          [chasersTeam]: `${innings2.score}/${innings2.wickets}`
        }
      };
    }
  }

  /**
   * Select Man of the Match
   */
  selectManOfMatch(matchState) {
    let bestPlayer = null;
    let bestScore = -1;

    for (const teamKey of ['team1', 'team2']) {
      const players = matchState.teams[teamKey].players;

      for (const player of players) {
        let score = 0;

        // Check batting across both innings
        for (const innKey of [1, 2]) {
          const inn = matchState.innings[innKey];
          if (!inn) continue;

          const batStats = inn.batsmanStats[player.name];
          if (batStats) {
            score += batStats.runs * 1;
            score += batStats.fours * 1;
            score += batStats.sixes * 2;
            if (batStats.runs >= 50) score += 20;
            if (batStats.runs >= 100) score += 40;
          }

          const bowlStats = inn.bowlerStats[player.name];
          if (bowlStats) {
            score += bowlStats.wickets * 25;
            score += bowlStats.maidens * 10;
            score += bowlStats.dots * 1;
            if (bowlStats.wickets >= 3) score += 20;
            if (bowlStats.wickets >= 5) score += 40;
            // Economy bonus
            if (bowlStats.overs > 0 && bowlStats.economy < 6) score += 15;
          }
        }

        // Bonus for being on winning team
        if (matchState.result?.winner === teamKey) {
          score *= 1.2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestPlayer = { ...player, team: teamKey, motmScore: score };
        }
      }
    }

    return bestPlayer;
  }

  /**
   * Perform the coin toss
   */
  performToss() {
    const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
    return {
      result,
      timestamp: new Date()
    };
  }

  /**
   * Set bowler for new over
   */
  setBowlerForOver(matchState, bowlerName) {
    const innings = matchState.innings[matchState.currentInnings];
    if (!innings) return matchState;

    // Can't bowl consecutive overs
    if (bowlerName === innings.lastOverBowler) {
      return { error: 'Cannot bowl consecutive overs', matchState };
    }

    // Check over limit
    const bowlerStats = innings.bowlerStats[bowlerName];
    if (bowlerStats && bowlerStats.overs >= this.maxOversPerBowler) {
      return { error: `${bowlerName} has already bowled ${this.maxOversPerBowler} overs`, matchState };
    }

    innings.currentBowler = bowlerName;

    // Initialize bowler stats if new
    if (!innings.bowlerStats[bowlerName]) {
      innings.bowlerStats[bowlerName] = {
        overs: 0, balls: 0, runs: 0, wickets: 0,
        maidens: 0, dots: 0, economy: 0,
        currentOverRuns: 0
      };
    }

    return { matchState };
  }

  /**
   * Get full scorecard
   */
  getScorecard(matchState) {
    const scorecard = { innings: {} };

    for (const innKey of [1, 2]) {
      const inn = matchState.innings[innKey];
      if (!inn) continue;

      const battingTeam = matchState.teams[inn.battingTeam];
      const bowlingTeam = matchState.teams[inn.bowlingTeam];

      scorecard.innings[innKey] = {
        battingTeam: battingTeam.name,
        bowlingTeam: bowlingTeam.name,
        score: `${inn.score}/${inn.wickets}`,
        overs: `${inn.overs}.${inn.balls}`,
        extras: inn.extras,
        runRate: inn.totalBalls > 0 ? ((inn.score / inn.totalBalls) * 6).toFixed(2) : '0.00',

        batting: Object.entries(inn.batsmanStats).map(([name, stats]) => ({
          name,
          runs: stats.runs,
          balls: stats.balls,
          fours: stats.fours,
          sixes: stats.sixes,
          strikeRate: stats.strikeRate,
          isOut: stats.isOut,
          dismissal: stats.dismissal || 'not out',
          isStriker: battingTeam.players[inn.striker]?.name === name,
          isNonStriker: battingTeam.players[inn.nonStriker]?.name === name
        })),

        bowling: Object.entries(inn.bowlerStats).map(([name, stats]) => ({
          name,
          overs: `${stats.overs}.${stats.balls % 6}`,
          maidens: stats.maidens,
          runs: stats.runs,
          wickets: stats.wickets,
          economy: stats.economy,
          dots: stats.dots
        })),

        fallOfWickets: inn.fallOfWickets
      };
    }

    if (matchState.result) {
      scorecard.result = matchState.result;
      scorecard.manOfMatch = this.selectManOfMatch(matchState);
    }

    return scorecard;
  }
}

module.exports = BallEngine;
