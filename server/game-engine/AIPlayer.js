/**
 * AIPlayer.js
 * ===========
 * Controls AI opponent decisions for both batting and bowling.
 * Makes contextually smart decisions based on match situation.
 * 
 * Difficulty Levels:
 * - EASY:   Random decisions, poor match awareness
 * - MEDIUM: Decent decisions, some match awareness
 * - HARD:   Optimal decisions, full match awareness
 */

class AIPlayer {
  constructor(difficulty = 'MEDIUM') {
    this.difficulty = difficulty;
    
    // How often the AI makes the "optimal" choice vs random
    this.smartness = {
      EASY: 0.3,
      MEDIUM: 0.6,
      HARD: 0.85
    }[difficulty] || 0.6;

    // AI timing quality distribution by difficulty
    this.timingDistribution = {
      EASY: { PERFECT: 5, GOOD: 15, AVERAGE: 40, MISTIMED: 30, MISS: 10 },
      MEDIUM: { PERFECT: 10, GOOD: 30, AVERAGE: 35, MISTIMED: 20, MISS: 5 },
      HARD: { PERFECT: 20, GOOD: 40, AVERAGE: 25, MISTIMED: 12, MISS: 3 }
    }[difficulty] || { PERFECT: 10, GOOD: 30, AVERAGE: 35, MISTIMED: 20, MISS: 5 };
  }

  /**
   * AI decides what shot to play
   * @param {Object} matchState - Current match situation
   * @param {string} deliveryType - The delivery bowled
   * @param {Object} batsman - AI batsman stats
   * @returns {Object} { shotType, timing }
   */
  decideBattingAction(matchState, deliveryType, batsman) {
    const useSmart = Math.random() < this.smartness;

    let shotType;
    let timingOverride = null;

    if (useSmart) {
      shotType = this._smartBattingDecision(matchState, deliveryType, batsman);
    } else {
      // Random shot selection
      const shots = ['DRIVE', 'PULL', 'SWEEP', 'DEFEND', 'LOFT', 'SCOOP'];
      shotType = shots[Math.floor(Math.random() * shots.length)];
    }

    // Determine timing
    const timing = timingOverride || this._rollTiming();

    // Batsman skill modifies timing
    if (batsman.battingRating) {
      const skillBonus = (batsman.battingRating - 50) / 100;
      // High-rated batsmen get timing upgrade chance
      if (Math.random() < skillBonus && timing === 'AVERAGE') {
        return { shotType, timing: 'GOOD' };
      }
      if (Math.random() < skillBonus * 0.5 && timing === 'GOOD') {
        return { shotType, timing: 'PERFECT' };
      }
    }

    return { shotType, timing };
  }

  /**
   * AI decides what delivery to bowl
   * @param {Object} matchState - Current match situation
   * @param {Object} bowler - AI bowler stats
   * @param {Object} batsman - Current opposing batsman
   * @returns {Object} { deliveryType, line, length }
   */
  decideBowlingAction(matchState, bowler, batsman) {
    const useSmart = Math.random() < this.smartness;

    let deliveryType;

    if (useSmart) {
      deliveryType = this._smartBowlingDecision(matchState, bowler, batsman);
    } else {
      const deliveries = ['FAST', 'SHORT', 'YORKER', 'SPIN', 'SLOWER'];
      deliveryType = deliveries[Math.floor(Math.random() * deliveries.length)];
    }

    // Adjust based on bowler type
    if (bowler.bowlingType) {
      if (bowler.bowlingType === 'PACE' || bowler.bowlingType === 'FAST') {
        // Pace bowlers don't bowl spin
        if (deliveryType === 'SPIN') {
          deliveryType = Math.random() > 0.5 ? 'SLOWER' : 'FAST';
        }
      }
      if (bowler.bowlingType === 'SPIN' || bowler.bowlingType === 'SPINNER') {
        // Spinners don't bowl fast or short frequently
        if (deliveryType === 'FAST') {
          deliveryType = 'SPIN';
        }
        if (deliveryType === 'SHORT' && Math.random() > 0.3) {
          deliveryType = 'SPIN';
        }
      }
    }

    return { deliveryType };
  }

  /**
   * Smart batting: considers match situation
   */
  _smartBattingDecision(matchState, deliveryType, batsman) {
    const { score, wickets, overs, target, innings, ballsInOver } = matchState;
    const ballsRemaining = (20 - overs) * 6 - (ballsInOver || 0);

    // Optimal shots against each delivery type
    const optimalShots = {
      FAST: 'DRIVE',
      SHORT: 'PULL',
      YORKER: 'SCOOP',
      SPIN: 'SWEEP',
      SLOWER: 'DRIVE'
    };

    let baseShot = optimalShots[deliveryType] || 'DRIVE';

    // CHASING in 2nd innings
    if (innings === 2 && target) {
      const required = target - score;
      const reqRate = ballsRemaining > 0 ? (required / ballsRemaining) * 6 : 99;

      // Need to slog - go aggressive
      if (reqRate > 12) {
        return Math.random() > 0.3 ? 'LOFT' : 'SCOOP';
      }
      // Comfortable - play normally
      if (reqRate < 6) {
        return Math.random() > 0.5 ? baseShot : 'DEFEND';
      }
      // Need to push - mix of attack and defense
      if (reqRate > 8) {
        const aggressive = ['LOFT', 'PULL', 'DRIVE'];
        return aggressive[Math.floor(Math.random() * aggressive.length)];
      }
    }

    // SETTING target in 1st innings
    if (innings === 1) {
      // Powerplay (overs 0-6): Be aggressive
      if (overs < 6) {
        const ppShots = ['DRIVE', 'PULL', 'LOFT'];
        return ppShots[Math.floor(Math.random() * ppShots.length)];
      }
      // Middle overs (6-15): Mix
      if (overs < 15) {
        return Math.random() > 0.4 ? baseShot : 'DEFEND';
      }
      // Death overs (15-20): Go big
      const deathShots = ['LOFT', 'SCOOP', 'PULL'];
      return deathShots[Math.floor(Math.random() * deathShots.length)];
    }

    // If many wickets lost, be careful
    if (wickets >= 6) {
      return Math.random() > 0.6 ? 'DEFEND' : baseShot;
    }

    return baseShot;
  }

  /**
   * Smart bowling: considers match situation
   */
  _smartBowlingDecision(matchState, bowler, batsman) {
    const { score, wickets, overs, target, innings } = matchState;

    // Powerplay: aggressive bowling
    if (overs < 6) {
      const ppDeliveries = ['FAST', 'YORKER', 'SHORT'];
      return ppDeliveries[Math.floor(Math.random() * ppDeliveries.length)];
    }

    // Death overs: yorkers and slower balls
    if (overs >= 16) {
      const deathDeliveries = ['YORKER', 'SLOWER', 'SHORT'];
      return deathDeliveries[Math.floor(Math.random() * deathDeliveries.length)];
    }

    // Middle overs: variation
    if (overs >= 6 && overs < 16) {
      const midDeliveries = ['SPIN', 'SLOWER', 'FAST', 'YORKER'];
      return midDeliveries[Math.floor(Math.random() * midDeliveries.length)];
    }

    // If defending a target (2nd innings bowling)
    if (innings === 2 && target) {
      const remaining = target - score;
      const ballsLeft = (20 - overs) * 6;

      // Batsmen under pressure, bowl tight
      if (remaining > ballsLeft * 1.5) {
        return Math.random() > 0.5 ? 'FAST' : 'SPIN';
      }
      // Close game, bowl yorkers
      if (remaining < 20 && ballsLeft < 12) {
        return Math.random() > 0.3 ? 'YORKER' : 'SLOWER';
      }
    }

    return ['FAST', 'SPIN', 'SLOWER', 'YORKER', 'SHORT'][Math.floor(Math.random() * 5)];
  }

  /**
   * Roll timing quality based on difficulty
   */
  _rollTiming() {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const [quality, probability] of Object.entries(this.timingDistribution)) {
      cumulative += probability;
      if (roll <= cumulative) {
        return quality;
      }
    }
    return 'AVERAGE';
  }

  /**
   * AI selects bowler for the over
   * @param {Array} bowlers - Available bowlers
   * @param {Object} bowlerStats - Stats of each bowler in this match
   * @param {Object} matchState - Current match situation
   * @returns {Object} Selected bowler
   */
  selectBowler(bowlers, bowlerStats, matchState) {
    // Filter out bowlers who have completed their 4-over quota
    const available = bowlers.filter(b => {
      const stats = bowlerStats[b.name || b._id] || { overs: 0 };
      return stats.overs < 4;
    });

    if (available.length === 0) {
      // Fallback - shouldn't happen with 5+ bowlers
      return bowlers[0];
    }

    if (Math.random() < this.smartness) {
      // Smart selection based on situation
      const { overs } = matchState;

      // Death overs - best death bowler (highest rated available)
      if (overs >= 16) {
        return available.reduce((best, b) =>
          (b.bowlingRating || 50) > (best.bowlingRating || 50) ? b : best
        );
      }

      // Powerplay - pace bowlers preferred
      if (overs < 6) {
        const pacers = available.filter(b =>
          b.bowlingType === 'PACE' || b.bowlingType === 'FAST'
        );
        if (pacers.length > 0) {
          return pacers[Math.floor(Math.random() * pacers.length)];
        }
      }

      // Middle overs - spinners preferred
      if (overs >= 6 && overs < 16) {
        const spinners = available.filter(b =>
          b.bowlingType === 'SPIN' || b.bowlingType === 'SPINNER'
        );
        if (spinners.length > 0) {
          return spinners[Math.floor(Math.random() * spinners.length)];
        }
      }
    }

    // Random selection from available
    return available[Math.floor(Math.random() * available.length)];
  }
}

module.exports = AIPlayer;
