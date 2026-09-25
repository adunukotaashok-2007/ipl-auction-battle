/**
 * ProbabilityMatrix.js
 * ====================
 * The DNA of every cricket ball outcome.
 * Maps every shot-delivery combination to probability distributions.
 * 
 * Each cell contains: { outcomes: { 0, 1, 2, 3, 4, 6, wicket }, extras: { wide, noBall } }
 * Values are base probabilities (0-100) modified by player skills & timing.
 */

class ProbabilityMatrix {
  constructor() {
    // Shot types available to batsman
    this.SHOT_TYPES = ['DRIVE', 'PULL', 'SWEEP', 'DEFEND', 'LOFT', 'SCOOP'];

    // Delivery types available to bowler
    this.DELIVERY_TYPES = ['FAST', 'SHORT', 'YORKER', 'SPIN', 'SLOWER'];

    // Timing qualities
    this.TIMING = {
      PERFECT: 1.5,   // Multiplies positive outcomes
      GOOD: 1.2,
      AVERAGE: 1.0,
      MISTIMED: 0.6,
      MISS: 0.2        // Almost guaranteed dot or wicket
    };

    // Base probability matrix: matrix[shot][delivery] = outcome distribution
    // All values out of 100
    this.matrix = this._buildMatrix();
  }

  _buildMatrix() {
    return {
      DRIVE: {
        FAST: {
          outcomes: { 0: 20, 1: 25, 2: 15, 3: 5, 4: 20, 6: 5, wicket: 10 },
          description: 'Drive against pace - classic cricket'
        },
        SHORT: {
          outcomes: { 0: 30, 1: 15, 2: 10, 3: 5, 4: 10, 6: 5, wicket: 25 },
          description: 'Driving a short ball - risky, top edge likely'
        },
        YORKER: {
          outcomes: { 0: 25, 1: 20, 2: 15, 3: 5, 4: 15, 6: 5, wicket: 15 },
          description: 'Digging out a yorker with a drive'
        },
        SPIN: {
          outcomes: { 0: 15, 1: 20, 2: 15, 3: 10, 4: 25, 6: 8, wicket: 7 },
          description: 'Driving spin - through the covers'
        },
        SLOWER: {
          outcomes: { 0: 15, 1: 20, 2: 15, 3: 10, 4: 22, 6: 10, wicket: 8 },
          description: 'Drive against slower ball - timing key'
        }
      },
      PULL: {
        FAST: {
          outcomes: { 0: 20, 1: 20, 2: 15, 3: 5, 4: 18, 6: 10, wicket: 12 },
          description: 'Pulling fast bowling - brave shot'
        },
        SHORT: {
          outcomes: { 0: 10, 1: 15, 2: 15, 3: 8, 4: 25, 6: 20, wicket: 7 },
          description: 'Pull to a short ball - textbook'
        },
        YORKER: {
          outcomes: { 0: 35, 1: 15, 2: 5, 3: 2, 4: 5, 6: 3, wicket: 35 },
          description: 'Trying to pull a yorker - terrible choice'
        },
        SPIN: {
          outcomes: { 0: 20, 1: 20, 2: 15, 3: 8, 4: 18, 6: 10, wicket: 9 },
          description: 'Pulling spin - slog pull'
        },
        SLOWER: {
          outcomes: { 0: 15, 1: 15, 2: 15, 3: 10, 4: 20, 6: 15, wicket: 10 },
          description: 'Pull against slower ball'
        }
      },
      SWEEP: {
        FAST: {
          outcomes: { 0: 25, 1: 15, 2: 10, 3: 5, 4: 10, 6: 5, wicket: 30 },
          description: 'Sweeping fast bowling - very risky'
        },
        SHORT: {
          outcomes: { 0: 20, 1: 20, 2: 15, 3: 5, 4: 18, 6: 10, wicket: 12 },
          description: 'Sweep to short ball - upper cut territory'
        },
        YORKER: {
          outcomes: { 0: 25, 1: 20, 2: 10, 3: 5, 4: 15, 6: 8, wicket: 17 },
          description: 'Sweeping a yorker - unconventional'
        },
        SPIN: {
          outcomes: { 0: 10, 1: 20, 2: 15, 3: 10, 4: 25, 6: 12, wicket: 8 },
          description: 'Sweep against spin - bread and butter'
        },
        SLOWER: {
          outcomes: { 0: 15, 1: 18, 2: 15, 3: 8, 4: 22, 6: 12, wicket: 10 },
          description: 'Sweep against slower ball'
        }
      },
      DEFEND: {
        FAST: {
          outcomes: { 0: 50, 1: 25, 2: 10, 3: 2, 4: 3, 6: 0, wicket: 10 },
          description: 'Solid defense against pace'
        },
        SHORT: {
          outcomes: { 0: 45, 1: 20, 2: 10, 3: 5, 4: 5, 6: 0, wicket: 15 },
          description: 'Defending a short ball - ducking/swaying'
        },
        YORKER: {
          outcomes: { 0: 40, 1: 30, 2: 10, 3: 3, 4: 5, 6: 0, wicket: 12 },
          description: 'Blocking a yorker - solid technique'
        },
        SPIN: {
          outcomes: { 0: 50, 1: 25, 2: 10, 3: 3, 4: 4, 6: 0, wicket: 8 },
          description: 'Defending spin - pad and bat together'
        },
        SLOWER: {
          outcomes: { 0: 48, 1: 25, 2: 12, 3: 3, 4: 5, 6: 0, wicket: 7 },
          description: 'Defending slower ball'
        }
      },
      LOFT: {
        FAST: {
          outcomes: { 0: 15, 1: 10, 2: 10, 3: 5, 4: 20, 6: 22, wicket: 18 },
          description: 'Lofting fast bowling - go big or go home'
        },
        SHORT: {
          outcomes: { 0: 15, 1: 10, 2: 10, 3: 8, 4: 18, 6: 22, wicket: 17 },
          description: 'Upper cut / top edge over keeper'
        },
        YORKER: {
          outcomes: { 0: 25, 1: 15, 2: 8, 3: 5, 4: 12, 6: 10, wicket: 25 },
          description: 'Trying to loft a yorker - very difficult'
        },
        SPIN: {
          outcomes: { 0: 12, 1: 10, 2: 12, 3: 8, 4: 18, 6: 25, wicket: 15 },
          description: 'Lofting spin - down the ground'
        },
        SLOWER: {
          outcomes: { 0: 15, 1: 12, 2: 10, 3: 8, 4: 18, 6: 22, wicket: 15 },
          description: 'Lofting slower ball - deceived in flight'
        }
      },
      SCOOP: {
        FAST: {
          outcomes: { 0: 20, 1: 10, 2: 8, 3: 5, 4: 15, 6: 12, wicket: 30 },
          description: 'Scooping pace - audacious and risky'
        },
        SHORT: {
          outcomes: { 0: 25, 1: 10, 2: 8, 3: 5, 4: 12, 6: 10, wicket: 30 },
          description: 'Scooping a short ball - dangerous'
        },
        YORKER: {
          outcomes: { 0: 10, 1: 10, 2: 10, 3: 8, 4: 22, 6: 25, wicket: 15 },
          description: 'Scoop to a yorker - Dilscoop territory!'
        },
        SPIN: {
          outcomes: { 0: 15, 1: 15, 2: 12, 3: 8, 4: 20, 6: 18, wicket: 12 },
          description: 'Scooping spin - paddle sweep'
        },
        SLOWER: {
          outcomes: { 0: 12, 1: 12, 2: 12, 3: 10, 4: 20, 6: 22, wicket: 12 },
          description: 'Scoop against slower ball - innovative'
        }
      }
    };
  }

  /**
   * Get the probability distribution for a shot-delivery combination
   * Modified by player skills and timing
   */
  getOutcomeProbabilities(shotType, deliveryType, batsmanRating, bowlerRating, timing) {
    const base = this.matrix[shotType]?.[deliveryType];
    if (!base) {
      throw new Error(`Invalid combination: ${shotType} vs ${deliveryType}`);
    }

    const outcomes = { ...base.outcomes };
    const timingMultiplier = this.TIMING[timing] || 1.0;

    // Skill differential: positive means batsman is better
    const skillDiff = (batsmanRating - bowlerRating) / 100;

    // Modify probabilities based on timing
    // Better timing → more boundaries, fewer wickets
    // Worse timing → more dots, more wickets
    outcomes[4] = Math.round(outcomes[4] * timingMultiplier);
    outcomes[6] = Math.round(outcomes[6] * timingMultiplier);
    outcomes[1] = Math.round(outcomes[1] * (timingMultiplier * 0.8 + 0.2));
    outcomes[2] = Math.round(outcomes[2] * (timingMultiplier * 0.8 + 0.2));
    outcomes[3] = Math.round(outcomes[3] * (timingMultiplier * 0.7 + 0.3));

    // Wicket probability inversely affected by timing
    const wicketTimingFactor = timing === 'MISS' ? 2.5 :
                                timing === 'MISTIMED' ? 1.5 :
                                timing === 'AVERAGE' ? 1.0 :
                                timing === 'GOOD' ? 0.7 : 0.4;
    outcomes.wicket = Math.round(outcomes.wicket * wicketTimingFactor);

    // Apply skill differential
    // Better batsman → more runs, fewer wickets
    if (skillDiff > 0) {
      outcomes[4] = Math.round(outcomes[4] * (1 + skillDiff * 0.5));
      outcomes[6] = Math.round(outcomes[6] * (1 + skillDiff * 0.4));
      outcomes.wicket = Math.round(outcomes.wicket * (1 - skillDiff * 0.3));
    } else {
      // Better bowler → more dots, more wickets
      outcomes[0] = Math.round(outcomes[0] * (1 + Math.abs(skillDiff) * 0.5));
      outcomes.wicket = Math.round(outcomes.wicket * (1 + Math.abs(skillDiff) * 0.4));
      outcomes[4] = Math.round(outcomes[4] * (1 - Math.abs(skillDiff) * 0.3));
      outcomes[6] = Math.round(outcomes[6] * (1 - Math.abs(skillDiff) * 0.3));
    }

    // Ensure no negative values
    for (const key in outcomes) {
      outcomes[key] = Math.max(1, outcomes[key]);
    }

    // Dots fill remaining probability
    // First, calculate total without dots
    const totalWithoutDots = outcomes[1] + outcomes[2] + outcomes[3] +
                              outcomes[4] + outcomes[6] + outcomes.wicket;
    outcomes[0] = Math.max(5, 100 - totalWithoutDots);

    return {
      outcomes,
      description: base.description,
      totalWeight: outcomes[0] + outcomes[1] + outcomes[2] + outcomes[3] +
                    outcomes[4] + outcomes[6] + outcomes.wicket
    };
  }

  /**
   * Get extra ball probabilities based on bowler skill
   */
  getExtraProbabilities(bowlerRating, deliveryType) {
    const baseWideChance = deliveryType === 'YORKER' ? 8 :
                            deliveryType === 'SPIN' ? 5 :
                            deliveryType === 'SLOWER' ? 6 :
                            deliveryType === 'SHORT' ? 4 : 3;

    const baseNoBallChance = deliveryType === 'FAST' ? 3 :
                              deliveryType === 'YORKER' ? 4 : 2;

    // Better bowler = fewer extras
    const skillMod = (100 - bowlerRating) / 100;

    return {
      wide: Math.round(baseWideChance * (1 + skillMod * 0.5)),
      noBall: Math.round(baseNoBallChance * (1 + skillMod * 0.5))
    };
  }

  /**
   * Get wicket type probabilities given a wicket has occurred
   */
  getWicketTypeProbabilities(shotType, deliveryType) {
    const wicketTypes = {
      DRIVE: {
        FAST: { bowled: 30, caught: 40, lbw: 20, runOut: 10 },
        SHORT: { bowled: 5, caught: 70, lbw: 5, runOut: 20 },
        YORKER: { bowled: 50, caught: 15, lbw: 30, runOut: 5 },
        SPIN: { bowled: 25, caught: 35, lbw: 25, runOut: 15 },
        SLOWER: { bowled: 20, caught: 50, lbw: 15, runOut: 15 }
      },
      PULL: {
        FAST: { bowled: 10, caught: 60, lbw: 5, runOut: 25 },
        SHORT: { bowled: 5, caught: 75, lbw: 0, runOut: 20 },
        YORKER: { bowled: 45, caught: 20, lbw: 30, runOut: 5 },
        SPIN: { bowled: 15, caught: 55, lbw: 10, runOut: 20 },
        SLOWER: { bowled: 10, caught: 65, lbw: 5, runOut: 20 }
      },
      SWEEP: {
        FAST: { bowled: 25, caught: 30, lbw: 35, runOut: 10 },
        SHORT: { bowled: 10, caught: 60, lbw: 10, runOut: 20 },
        YORKER: { bowled: 30, caught: 25, lbw: 35, runOut: 10 },
        SPIN: { bowled: 20, caught: 35, lbw: 35, runOut: 10 },
        SLOWER: { bowled: 20, caught: 40, lbw: 30, runOut: 10 }
      },
      DEFEND: {
        FAST: { bowled: 40, caught: 25, lbw: 30, runOut: 5 },
        SHORT: { bowled: 20, caught: 45, lbw: 15, runOut: 20 },
        YORKER: { bowled: 50, caught: 10, lbw: 35, runOut: 5 },
        SPIN: { bowled: 35, caught: 20, lbw: 35, runOut: 10 },
        SLOWER: { bowled: 35, caught: 30, lbw: 25, runOut: 10 }
      },
      LOFT: {
        FAST: { bowled: 10, caught: 75, lbw: 5, runOut: 10 },
        SHORT: { bowled: 5, caught: 80, lbw: 0, runOut: 15 },
        YORKER: { bowled: 30, caught: 45, lbw: 15, runOut: 10 },
        SPIN: { bowled: 15, caught: 70, lbw: 5, runOut: 10 },
        SLOWER: { bowled: 10, caught: 75, lbw: 5, runOut: 10 }
      },
      SCOOP: {
        FAST: { bowled: 35, caught: 40, lbw: 15, runOut: 10 },
        SHORT: { bowled: 20, caught: 55, lbw: 5, runOut: 20 },
        YORKER: { bowled: 15, caught: 55, lbw: 20, runOut: 10 },
        SPIN: { bowled: 25, caught: 50, lbw: 15, runOut: 10 },
        SLOWER: { bowled: 20, caught: 55, lbw: 10, runOut: 15 }
      }
    };

    return wicketTypes[shotType]?.[deliveryType] ||
      { bowled: 25, caught: 40, lbw: 20, runOut: 15 };
  }
}

module.exports = ProbabilityMatrix;
