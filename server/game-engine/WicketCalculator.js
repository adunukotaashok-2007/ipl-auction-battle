/**
 * WicketCalculator.js
 * ====================
 * Determines HOW a batsman gets out.
 * Generates realistic dismissal descriptions.
 */

const ProbabilityMatrix = require('./ProbabilityMatrix');

class WicketCalculator {
  constructor() {
    this.probabilityMatrix = new ProbabilityMatrix();
    
    // Fielding positions for caught dismissals
    this.fieldPositions = {
      DRIVE: ['mid-off', 'cover', 'extra cover', 'long-off', 'long-on', 'bowler'],
      PULL: ['deep mid-wicket', 'deep square leg', 'fine leg', 'long leg', 'mid-wicket'],
      SWEEP: ['deep square leg', 'short fine leg', 'deep fine leg', 'backward square leg'],
      DEFEND: ['slip', 'gully', 'short leg', 'silly point', 'wicketkeeper'],
      LOFT: ['long-off', 'long-on', 'deep mid-wicket', 'deep cover', 'deep extra cover'],
      SCOOP: ['fine leg', 'third man', 'wicketkeeper', 'short fine leg']
    };
  }

  /**
   * Calculate the type of wicket and generate description
   * @param {string} shotType - The shot played
   * @param {string} deliveryType - The delivery bowled
   * @param {Object} batsman - Batsman player object
   * @param {Object} bowler - Bowler player object
   * @param {Object} fieldingTeam - Array of fielding team players
   * @returns {Object} Wicket details
   */
  calculateWicket(shotType, deliveryType, batsman, bowler, fieldingTeam = []) {
    const wicketProbs = this.probabilityMatrix.getWicketTypeProbabilities(shotType, deliveryType);
    
    // Roll for wicket type
    const roll = Math.random() * 100;
    let cumulative = 0;
    let wicketType = 'bowled'; // default

    for (const [type, probability] of Object.entries(wicketProbs)) {
      cumulative += probability;
      if (roll <= cumulative) {
        wicketType = type;
        break;
      }
    }

    // Generate wicket details
    const details = this._generateWicketDetails(
      wicketType, shotType, deliveryType, batsman, bowler, fieldingTeam
    );

    return {
      type: wicketType,
      ...details
    };
  }

  _generateWicketDetails(wicketType, shotType, deliveryType, batsman, bowler, fieldingTeam) {
    const batsmanName = batsman.name || 'Batsman';
    const bowlerName = bowler.name || 'Bowler';

    switch (wicketType) {
      case 'bowled': {
        const descriptions = [
          `Clean bowled! ${bowlerName} knocks over the stumps!`,
          `BOWLED HIM! ${batsmanName} misses completely and the stumps are shattered!`,
          `Through the gate! ${bowlerName} finds the gap between bat and pad!`,
          `Castle destroyed! What a delivery from ${bowlerName}!`,
          `Middle stump cartwheels! ${batsmanName} has to walk back.`
        ];
        return {
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          dismissedBy: bowlerName,
          fielder: null,
          scorecard: `b ${bowlerName}`
        };
      }

      case 'caught': {
        const positions = this.fieldPositions[shotType] || ['fielder'];
        const position = positions[Math.floor(Math.random() * positions.length)];
        
        // Pick a random fielder from the team
        let fielderName = 'fielder';
        if (fieldingTeam.length > 0) {
          const fielder = fieldingTeam[Math.floor(Math.random() * fieldingTeam.length)];
          fielderName = fielder.name || 'fielder';
        }

        const isCaughtAndBowled = position === 'bowler' || Math.random() < 0.1;
        
        if (isCaughtAndBowled) {
          const descriptions = [
            `Caught and bowled! ${bowlerName} takes a sharp return catch!`,
            `C&B! ${bowlerName} plucks it out of thin air!`,
            `Brilliant! ${bowlerName} catches his own bowling!`
          ];
          return {
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            dismissedBy: bowlerName,
            fielder: bowlerName,
            scorecard: `c & b ${bowlerName}`
          };
        }

        const descriptions = [
          `CAUGHT! ${fielderName} takes a good catch at ${position}!`,
          `In the air... TAKEN! ${fielderName} holds on at ${position}!`,
          `Edged and caught! ${fielderName} snaps it up at ${position}!`,
          `Gone! ${batsmanName} finds ${fielderName} at ${position}. ${bowlerName} strikes!`,
          `What a catch by ${fielderName} at ${position}! ${batsmanName} has to go!`
        ];
        return {
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          dismissedBy: bowlerName,
          fielder: fielderName,
          scorecard: `c ${fielderName} b ${bowlerName}`
        };
      }

      case 'lbw': {
        const descriptions = [
          `LBW! Plumb in front! ${bowlerName} gets the decision!`,
          `Trapped LBW! ${batsmanName} was struck on the pads, dead in front!`,
          `HUGE appeal... and it's given! LBW! ${batsmanName} departs!`,
          `Stone dead LBW! ${bowlerName} hits the pad before the bat!`,
          `The umpire raises the finger! LBW! ${batsmanName} is gone!`
        ];
        return {
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          dismissedBy: bowlerName,
          fielder: null,
          scorecard: `lbw b ${bowlerName}`
        };
      }

      case 'runOut': {
        let fielderName = 'fielder';
        if (fieldingTeam.length > 0) {
          const fielder = fieldingTeam[Math.floor(Math.random() * fieldingTeam.length)];
          fielderName = fielder.name || 'fielder';
        }

        const descriptions = [
          `RUN OUT! ${batsmanName} is short of the crease! Direct hit by ${fielderName}!`,
          `Terrible mix-up! ${batsmanName} is run out! ${fielderName} with the throw!`,
          `Brilliant fielding by ${fielderName}! ${batsmanName} is run out by miles!`,
          `Direct hit! ${fielderName} catches ${batsmanName} short! Run out!`,
          `What a throw! ${fielderName} runs out ${batsmanName} with a bullet throw!`
        ];
        return {
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          dismissedBy: fielderName,
          fielder: fielderName,
          scorecard: `run out (${fielderName})`
        };
      }

      default:
        return {
          description: `${batsmanName} is out!`,
          dismissedBy: bowlerName,
          fielder: null,
          scorecard: `b ${bowlerName}`
        };
    }
  }
}

module.exports = WicketCalculator;
