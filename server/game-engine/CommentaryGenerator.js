/**
 * CommentaryGenerator.js
 * ======================
 * Generates realistic, context-aware cricket commentary
 * for every ball bowled in the match.
 */

class CommentaryGenerator {
  constructor() {
    this.commentary = this._buildCommentaryBank();
  }

  _buildCommentaryBank() {
    return {
      // Run outcomes
      0: {
        DRIVE: [
          'Played and missed! Beaten outside off!',
          'Solid defense, but no run. Dot ball.',
          'Driven straight to the fielder. No run.',
          'Good length delivery, defended back to the bowler.',
          'Tries to drive, but can\'t beat the field.'
        ],
        PULL: [
          'Pulls but finds the fielder. No run.',
          'Swings and misses! Good bowling.',
          'Pulled but straight to mid-wicket.',
          'Tries the pull, doesn\'t connect properly. Dot ball.'
        ],
        SWEEP: [
          'Sweeps but misses. Lucky not to be given out!',
          'Sweep finds the fielder. No run.',
          'Down on one knee, but can\'t beat the field.'
        ],
        DEFEND: [
          'Rock solid defense. Bat and pad together.',
          'Dead bat. Good technique shown here.',
          'Defended firmly. Watchful batting.',
          'Blocks it with soft hands. Dot ball.',
          'Solid leave outside off stump. Good judgment.'
        ],
        LOFT: [
          'Tries to go big, completely misses! Lucky!',
          'Lofted but doesn\'t have the distance. Dot ball.',
          'In the air... but safe! Lands in no man\'s land.'
        ],
        SCOOP: [
          'Tries the scoop, misses completely!',
          'Innovative attempt but doesn\'t connect.',
          'Audacious shot attempt, but no contact.'
        ]
      },
      1: {
        default: [
          'Pushed into the gap for a quick single.',
          'Tapped to the on-side, they take a single.',
          'Good running between the wickets. One run.',
          'Nudged off the pads for a single.',
          'Quick single taken. Good awareness.',
          'Turned to the leg-side for one.',
          'Worked away for a comfortable single.'
        ]
      },
      2: {
        default: [
          'Nicely placed! They come back for two.',
          'In the gap! Good running, two runs.',
          'Finds the gap in the field. Two runs taken.',
          'Excellent placement! Two to the boundary rope... no, pulled back.',
          'Smart cricket! Two runs with sharp running.'
        ]
      },
      3: {
        default: [
          'Misfield! They\'ll get three!',
          'Deep in the outfield, they push for three. Good running!',
          'All three! Great running between the wickets!',
          'Three runs! The fielder fumbles on the boundary.'
        ]
      },
      4: {
        DRIVE: [
          'FOUR! Beautifully driven through the covers!',
          'BOUNDARY! Cracking drive through extra cover!',
          'FOUR! Driven with full face of the bat. Textbook!',
          'FOUR runs! Pierces the gap between mid-off and cover!',
          'Gorgeous drive! That races to the boundary!'
        ],
        PULL: [
          'FOUR! Pulled with authority to the boundary!',
          'BOUNDARY! Crunching pull shot!',
          'FOUR! That was dispatched to the mid-wicket fence!',
          'Pulled away! Four runs, middled perfectly!'
        ],
        SWEEP: [
          'FOUR! Swept to the boundary!',
          'Fine sweep! That races to the fence for four!',
          'BOUNDARY! Textbook sweep shot!'
        ],
        LOFT: [
          'FOUR! Lofted over the infield!',
          'Lifted over the fielder\'s head for four!',
          'FOUR! That just clears the inner ring!'
        ],
        SCOOP: [
          'FOUR! Audacious scoop over the keeper!',
          'BOUNDARY! What a shot! Scooped over fine leg!',
          'FOUR! Innovation at its finest!'
        ],
        DEFEND: [
          'FOUR! Thick edge flies through the slip cordon!',
          'FOUR! Pushed firmly past the fielder!'
        ]
      },
      6: {
        DRIVE: [
          'SIX! Launched straight down the ground!',
          'MAXIMUM! What a hit! Driven over long-off!',
          'SIX RUNS! That\'s sailed into the stands!'
        ],
        PULL: [
          'SIX! Pulled into the stands! What power!',
          'MAXIMUM! Hook shot sails over fine leg!',
          'That\'s HUGE! Six runs, pulled with brute force!'
        ],
        SWEEP: [
          'SIX! Slog-swept into the crowd!',
          'MAXIMUM! Swept with tremendous power!',
          'SIX! That\'s disappeared into row Z!'
        ],
        LOFT: [
          'SIX! Absolutely SMASHED over the boundary!',
          'MAXIMUM! That\'s gone all the way! Monster hit!',
          'SIX! Into the upper tier! What a strike!',
          'GONE! That ball is NEVER coming back! SIX!',
          'Into orbit! That\'s a HUGE six!'
        ],
        SCOOP: [
          'SIX! Scooped over the keeper for a maximum!',
          'UNBELIEVABLE! Dilscoop for SIX! Crowd goes wild!',
          'SIX! The audacity! Scooped over fine leg!'
        ],
        DEFEND: [
          'SIX! Accidentally lofted... and it\'s gone all the way!'
        ]
      }
    };
  }

  /**
   * Generate commentary for a ball outcome
   */
  generateBallCommentary(runs, shotType, deliveryType, batsman, bowler, isWicket, extras) {
    const batsmanName = batsman?.name || 'Batsman';
    const bowlerName = bowler?.name || 'Bowler';

    let lines = [];

    // Delivery description
    lines.push(this._describeDelivery(deliveryType, bowlerName));

    // Extra ball commentary
    if (extras?.type === 'wide') {
      lines.push(`Wide ball! ${bowlerName} strays down the leg-side. Free run.`);
      return lines;
    }
    if (extras?.type === 'noBall') {
      lines.push(`No ball! ${bowlerName} has overstepped! Free hit coming up!`);
      return lines;
    }

    // Wicket commentary is handled by WicketCalculator
    if (isWicket) {
      return lines; // Wicket description added separately
    }

    // Run commentary
    const commentaryBank = this.commentary[runs];
    if (commentaryBank) {
      const shotComments = commentaryBank[shotType] || commentaryBank.default || commentaryBank[Object.keys(commentaryBank)[0]];
      if (shotComments && shotComments.length > 0) {
        lines.push(shotComments[Math.floor(Math.random() * shotComments.length)]);
      }
    }

    return lines;
  }

  _describeDelivery(deliveryType, bowlerName) {
    const descriptions = {
      FAST: [
        `${bowlerName} steams in, bowls a quick delivery...`,
        `${bowlerName} fires in a rapid delivery...`,
        `Quick delivery from ${bowlerName}...`,
        `${bowlerName} runs in hard, genuine pace...`
      ],
      SHORT: [
        `${bowlerName} bangs it in short!`,
        `Short ball from ${bowlerName}!`,
        `${bowlerName} drops it short, rising sharply...`,
        `Bouncer from ${bowlerName}!`
      ],
      YORKER: [
        `${bowlerName} bowls a yorker!`,
        `Full and fast from ${bowlerName}, right at the base!`,
        `${bowlerName} nails the yorker length!`,
        `Toe-crusher from ${bowlerName}!`
      ],
      SPIN: [
        `${bowlerName} flights one up...`,
        `Spin from ${bowlerName}, tossed up invitingly...`,
        `${bowlerName} gives it air, turning delivery...`,
        `Loopy delivery from ${bowlerName}...`
      ],
      SLOWER: [
        `${bowlerName} bowls a slower ball...`,
        `Change of pace from ${bowlerName}!`,
        `Clever slower delivery from ${bowlerName}...`,
        `${bowlerName} takes pace off the ball...`
      ]
    };

    const options = descriptions[deliveryType] || [`${bowlerName} bowls...`];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Generate milestone commentary
   */
  generateMilestoneCommentary(type, player, value) {
    const milestones = {
      'fifty': [
        `FIFTY! ${player.name} raises the bat! What an innings so far!`,
        `Half-century for ${player.name}! The crowd roars in appreciation!`,
        `50 up for ${player.name}! A well-crafted innings!`
      ],
      'hundred': [
        `CENTURY! ${player.name} brings up the hundred! Magnificent!`,
        `100! ${player.name} reaches the milestone! What a knock!`,
        `A HUNDRED! The crowd is on their feet for ${player.name}!`
      ],
      'team50': [
        `Team reaches 50. Steady start here.`,
        `50 on the board now. Building nicely.`
      ],
      'team100': [
        `100 up! Good batting from the team.`,
        `Century up for the batting side!`
      ],
      'team150': [
        `150 on the board. Good platform built.`,
        `They cross 150! Acceleration needed now?`
      ],
      'team200': [
        `200 up! Commanding total building here.`,
        `The batting side crosses 200! Dominant batting display.`
      ],
      'wicketMaiden': [
        `Wicket maiden! Brilliant over from ${player.name}!`
      ],
      'maiden': [
        `Maiden over from ${player.name}! Building pressure.`,
        `Dot, dot, dot, dot, dot, dot! Maiden! ${player.name} keeping it tight.`
      ],
      'threeWickets': [
        `Three wickets for ${player.name}! The batsmen are under pressure!`
      ],
      'fiveWickets': [
        `FIVE WICKETS! ${player.name} has a fifer! Sensational bowling!`
      ],
      'powerplayEnd': [
        `End of the powerplay! Field restrictions are lifted.`
      ]
    };

    const options = milestones[type] || [`Milestone: ${type}`];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Generate situation-based commentary
   */
  generateSituationCommentary(matchState) {
    const { score, wickets, overs, target, innings } = matchState;

    if (innings === 2 && target) {
      const remaining = target - score;
      const ballsLeft = (20 - overs) * 6;
      const reqRate = (remaining / ballsLeft) * 6;

      if (remaining <= 10 && ballsLeft > 6) {
        return 'Getting close now! The tension is palpable!';
      }
      if (remaining <= 1) {
        return 'They need just 1 more! One hit away from victory!';
      }
      if (reqRate > 15 && ballsLeft < 18) {
        return 'The required rate is climbing. This looks difficult now.';
      }
      if (wickets >= 8) {
        return 'Tail-enders at the crease. Can they pull off a miracle?';
      }
    }

    if (innings === 1) {
      if (overs <= 6 && score > 60) {
        return 'Explosive powerplay! The runs are flowing!';
      }
      if (overs >= 15 && score < 100) {
        return 'They\'ve been kept quiet. Need to accelerate now.';
      }
      if (wickets >= 5 && overs < 15) {
        return 'Half the side is back! Recovery mode needed.';
      }
    }

    return '';
  }
}

module.exports = CommentaryGenerator;
