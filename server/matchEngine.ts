// server/matchEngine.ts

import {
  Player,
  PurchasedPlayer,
  TeamLineup,
  LiveMatchState,
  InningsState,
  DeliveryInput,
  ShotInput,
  BallOutcome,
} from './types';

/* =========================================================
   HELPERS
========================================================= */

function resolveLineupPlayers(
  lineup: TeamLineup | undefined,
  squad: PurchasedPlayer[]
): Player[] {
  if (!squad || squad.length === 0) {
    return [];
  }

  const byId = new Map(
    squad.map((s) => [s.player.id, s.player])
  );

  const players: Player[] = [];

  /*
   * Use submitted Playing XI.
   */
  if (lineup?.playingXI?.length) {
    for (const id of lineup.playingXI) {
      const player = byId.get(id);

      if (
        player &&
        !players.some((p) => p.id === player.id)
      ) {
        players.push(player);
      }
    }
  }

  /*
   * Add impact player if submitted.
   */
  if (lineup?.impactPlayerId) {
    const impactPlayer = byId.get(
      lineup.impactPlayerId
    );

    if (
      impactPlayer &&
      !players.some(
        (p) => p.id === impactPlayer.id
      )
    ) {
      players.push(impactPlayer);
    }
  }

  /*
   * If no valid Playing XI was submitted,
   * automatically use the first players from squad.
   */
  if (players.length === 0) {
    return squad
      .map((s) => s.player)
      .filter(Boolean)
      .slice(0, 11);
  }

  return players.slice(0, 12);
}

/* =========================================================
   BOWLER SELECTION
========================================================= */

export function selectBestBowler(
  bowlingSquad: Player[],
  previousBowlerIds: string[]
): string {
  if (!bowlingSquad.length) {
    throw new Error(
      'Bowling team has no available players.'
    );
  }

  const lastBowler =
    previousBowlerIds[
      previousBowlerIds.length - 1
    ];

  /*
   * Your Player type uses:
   * 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper'
   */

  const preferred = bowlingSquad.filter(
    (player) =>
      player.role === 'Bowler' ||
      player.role === 'All-Rounder'
  );

  const pool =
    preferred.length > 0
      ? preferred
      : bowlingSquad;

  let available = pool.filter(
    (player) =>
      player.id !== lastBowler
  );

  /*
   * If only one bowler is available,
   * allow the same bowler again.
   */
  if (available.length === 0) {
    available = [...pool];
  }

  available.sort(
    (a, b) =>
      (b.bowlingRating || 50) -
      (a.bowlingRating || 50)
  );

  return (
    available[0]?.id ||
    bowlingSquad[0].id
  );
}

/* =========================================================
   CREATE INNINGS
========================================================= */

function createInnings(
  battingTeamId: string,
  bowlingTeamId: string,
  battingLineup: Player[],
  bowlingLineup: Player[],
  maxOvers: number
): InningsState {
  if (battingLineup.length < 2) {
    throw new Error(
      'Batting team must have at least 2 players.'
    );
  }

  if (bowlingLineup.length < 1) {
    throw new Error(
      'Bowling team must have at least 1 player.'
    );
  }

  const currentBowlerId =
    selectBestBowler(
      bowlingLineup,
      []
    );

  return {
    battingTeamId,
    bowlingTeamId,

    totalRuns: 0,
    wickets: 0,

    overs: 0,
    legalBalls: 0,
    maxOvers,

    strikerId:
      battingLineup[0].id,

    nonStrikerId:
      battingLineup[1].id,

    currentBowlerId,

    battingLineup,
    bowlingLineup,

    nextBatterIndex: 2,

    oversHistory: [],

    isCompleted: false,

    extras: {
      wides: 0,
      noBalls: 0,
      byes: 0,
      legByes: 0,
      total: 0,
    },

    isFreeHitActive: false,
  };
}

/* =========================================================
   INITIALIZE MATCH
========================================================= */

export function initializeMatch(
  roomCode: string,
  team1Id: string,
  team1Lineup: TeamLineup,
  team1Squad: PurchasedPlayer[],
  team2Id: string,
  team2Lineup: TeamLineup,
  team2Squad: PurchasedPlayer[],
  totalOvers: number = 5
): LiveMatchState {
  /*
   * Keep overs inside supported values.
   */
  const validOvers =
    [2, 5, 10, 20].includes(totalOvers)
      ? totalOvers
      : 5;

  const team1Players =
    resolveLineupPlayers(
      team1Lineup,
      team1Squad
    );

  const team2Players =
    resolveLineupPlayers(
      team2Lineup,
      team2Squad
    );

  if (team1Players.length < 2) {
    throw new Error(
      'Team 1 must have at least 2 players.'
    );
  }

  if (team2Players.length < 1) {
    throw new Error(
      'Team 2 must have at least 1 player.'
    );
  }

  const innings1 =
    createInnings(
      team1Id,
      team2Id,
      team1Players,
      team2Players,
      validOvers
    );

  return {
    roomCode,

    totalOvers: validOvers,

    currentInnings: 1,

    innings1,

    innings2: undefined,

    phase: 'AWAITING_DELIVERY',

    /*
     * These fields are intentionally omitted here
     * because LiveMatchState in your matchEngine
     * does not define them.
     */
  };
}

/* =========================================================
   CALCULATE BALL OUTCOME
========================================================= */

export function calculateBallOutcome(
  delivery: DeliveryInput,
  shot: ShotInput,
  batter: Player,
  bowler: Player,
  isFreeHit: boolean
): BallOutcome {
  const batRating =
    batter.battingRating || 50;

  const bowlRating =
    bowler.bowlingRating || 50;

  const statRatio =
    batRating /
    Math.max(bowlRating, 1);

  const timing = Math.max(
    0,
    Math.min(1, shot.timing)
  );

  /* =====================================================
     NO BALL
  ===================================================== */

  const overstepChance =
    delivery.zone === 'YORKER'
      ? 0.08
      : 0.03;

  const isNoBall =
    Math.random() < overstepChance;

  /* =====================================================
     SHOT QUALITY
  ===================================================== */

  let shotQuality:
    BallOutcome['shotQuality'] =
    'MISSED';

  if (timing > 0.85) {
    shotQuality = 'PERFECT';
  } else if (timing > 0.6) {
    shotQuality = 'GOOD';
  } else if (timing > 0.35) {
    shotQuality = 'EARLY';
  } else if (timing > 0.15) {
    shotQuality = 'LATE';
  }

  /* =====================================================
     LINE MATCH
  ===================================================== */

  let lineMatch = false;

  if (
    delivery.line === 'OUTSIDE_OFF' &&
    shot.direction === 'OFF'
  ) {
    lineMatch = true;
  }

  if (
    delivery.line === 'MIDDLE' &&
    shot.direction === 'STRAIGHT'
  ) {
    lineMatch = true;
  }

  if (
    delivery.line === 'LEG' &&
    shot.direction === 'LEG'
  ) {
    lineMatch = true;
  }

  /* =====================================================
     WIDE
  ===================================================== */

  if (
    shotQuality === 'MISSED' ||
    shotQuality === 'LATE' ||
    shotQuality === 'EARLY'
  ) {
    if (
      delivery.line === 'LEG' &&
      !lineMatch &&
      Math.random() < 0.7
    ) {
      return {
        runs: 1,
        isWicket: false,
        isExtra: true,
        isWide: true,
        isNoBall: false,
        shotQuality: 'MISSED',
        commentary:
          `↔️ WIDE! Down the leg side by ${bowler.name}.`,
      };
    }

    if (
      delivery.line === 'OUTSIDE_OFF' &&
      !lineMatch &&
      Math.random() < 0.3
    ) {
      return {
        runs: 1,
        isWicket: false,
        isExtra: true,
        isWide: true,
        isNoBall: false,
        shotQuality: 'MISSED',
        commentary:
          `↔️ WIDE! Way outside off stump.`,
      };
    }
  }

  /* =====================================================
     WICKET PROCESSOR
  ===================================================== */

  const processWicket = (
    type: 'BOWLED' | 'CAUGHT',
    commentary: string
  ): BallOutcome => {
    /*
     * No wicket on free hit or no-ball.
     */
    if (isFreeHit || isNoBall) {
      return {
        runs: isNoBall ? 1 : 0,

        isWicket: false,

        isExtra: isNoBall,

        isNoBall,

        shotQuality,

        commentary:
          `🚨 ${commentary} BUT IT'S A FREE HIT! Batter survives!`,
      };
    }

    return {
      runs: 0,

      isWicket: true,

      wicketType: type,

      isExtra: false,

      isNoBall: false,

      shotQuality,

      commentary,
    };
  };

  /* =====================================================
     PERFECT CONTACT
  ===================================================== */

  if (shotQuality === 'PERFECT') {
    const runs =
      shot.shotType === 'LOFTED' &&
      (
        lineMatch ||
        statRatio > 1.05 ||
        Math.random() < 0.8
      )
        ? 6
        : 4;

    let commentary =
      runs === 6
        ? `🚀 MASSIVE SIX! ${batter.name} perfectly timed it!`
        : `💥 FOUR! Flawless drive by ${batter.name}!`;

    if (isNoBall) {
      commentary =
        `🚨 NO BALL + ${commentary}`;
    }

    return {
      runs:
        runs +
        (isNoBall ? 1 : 0),

      isWicket: false,

      isExtra: isNoBall,

      isNoBall,

      shotQuality,

      commentary,
    };
  }

  /* =====================================================
     GOOD CONTACT
  ===================================================== */

  if (shotQuality === 'GOOD') {
    if (
      shot.shotType === 'LOFTED' &&
      !lineMatch &&
      statRatio < 0.9 &&
      Math.random() < 0.3
    ) {
      return processWicket(
        'CAUGHT',
        `☝️ OUT! Caught in the deep! ${batter.name} mistimed the lofted shot.`
      );
    }

    const batRuns =
      shot.shotType === 'LOFTED'
        ? Math.random() < 0.6
          ? 4
          : 2
        : lineMatch
          ? Math.random() < 0.5
            ? 2
            : 1
          : 1;

    let commentary =
      `🏏 Good shot by ${batter.name} for ${batRuns} run(s).`;

    if (isNoBall) {
      commentary =
        `🚨 NO BALL! ${commentary}`;
    }

    return {
      runs:
        batRuns +
        (isNoBall ? 1 : 0),

      isWicket: false,

      isExtra: isNoBall,

      isNoBall,

      shotQuality,

      commentary,
    };
  }

  /* =====================================================
     EARLY / LATE
  ===================================================== */

  if (
    shotQuality === 'EARLY' ||
    shotQuality === 'LATE'
  ) {
    const wicketChance =
      (0.3 / Math.max(statRatio, 0.1)) *
      (lineMatch ? 0.6 : 1.2);

    if (
      Math.random() <
      Math.min(wicketChance, 0.95)
    ) {
      const wicketType =
        delivery.zone === 'YORKER'
          ? 'BOWLED'
          : 'CAUGHT';

      const commentary =
        wicketType === 'BOWLED'
          ? `🎯 CLEAN BOWLED! ${bowler.name} destroys the stumps!`
          : `✋ CAUGHT! ${batter.name} gets a leading edge!`;

      return processWicket(
        wicketType,
        commentary
      );
    }

    /* ===================================================
       LEG BYES
    =================================================== */

    if (Math.random() < 0.2) {
      const legByeRuns =
        Math.random() < 0.5
          ? 1
          : 0;

      if (legByeRuns > 0) {
        return {
          runs:
            legByeRuns +
            (isNoBall ? 1 : 0),

          isWicket: false,

          isExtra: true,

          isLegBye: true,

          isNoBall,

          shotQuality,

          commentary:
            `🦵 Leg byes taken. They scramble for ${legByeRuns}.`,
        };
      }
    }

    const batRuns =
      Math.random() < 0.4
        ? 1
        : 0;

    let commentary =
      batRuns === 1
        ? `😅 Scrambled single by ${batter.name}.`
        : `🛡️ Dot ball by ${bowler.name}.`;

    if (isNoBall) {
      commentary =
        `🚨 NO BALL! ${commentary}`;
    }

    return {
      runs:
        batRuns +
        (isNoBall ? 1 : 0),

      isWicket: false,

      isExtra: isNoBall,

      isNoBall,

      shotQuality,

      commentary,
    };
  }

  /* =====================================================
     MISSED - BOWLED
  ===================================================== */

  if (
    delivery.zone === 'YORKER' ||
    delivery.line === 'MIDDLE'
  ) {
    return processWicket(
      'BOWLED',
      `💥 BOWLED HIM! ${batter.name} swung at thin air.`
    );
  }

  /* =====================================================
     BYES
  ===================================================== */

  if (Math.random() < 0.1) {
    return {
      runs:
        1 +
        (isNoBall ? 1 : 0),

      isWicket: false,

      isExtra: true,

      isBye: true,

      isNoBall,

      shotQuality: 'MISSED',

      commentary:
        `🧤 Keeper fumbles! They sneak a Bye.`,
    };
  }

  /* =====================================================
     DOT / NO BALL
  ===================================================== */

  return {
    runs: isNoBall ? 1 : 0,

    isWicket: false,

    isExtra: isNoBall,

    isNoBall,

    shotQuality: 'MISSED',

    commentary: isNoBall
      ? `🚨 NO BALL! Swing and a miss.`
      : `❌ Swing and a miss! Dot ball.`,
  };
}

/* =========================================================
   APPLY BALL RESULT
========================================================= */

export function applyBallResult(
  match: LiveMatchState,
  outcome: BallOutcome
): LiveMatchState {
  const innings =
    match.currentInnings === 1
      ? match.innings1
      : match.innings2;

  if (!innings || innings.isCompleted) {
    return match;
  }

  const bowlerIdThisBall =
    innings.currentBowlerId;

  /* =====================================================
     1. RUNS
  ===================================================== */

  innings.totalRuns += outcome.runs;

  /* =====================================================
     2. EXTRAS
  ===================================================== */

  if (outcome.isWide) {
    innings.extras.wides +=
      outcome.runs;
  }

  if (outcome.isNoBall) {
    innings.extras.noBalls += 1;
  }

  if (outcome.isBye) {
    innings.extras.byes += Math.max(
      0,
      outcome.runs -
        (outcome.isNoBall ? 1 : 0)
    );
  }

  if (outcome.isLegBye) {
    innings.extras.legByes += Math.max(
      0,
      outcome.runs -
        (outcome.isNoBall ? 1 : 0)
    );
  }

  innings.extras.total =
    innings.extras.wides +
    innings.extras.noBalls +
    innings.extras.byes +
    innings.extras.legByes;

  /* =====================================================
     3. LEGAL BALL
  ===================================================== */

  const isLegalDelivery =
    !outcome.isWide &&
    !outcome.isNoBall;

  if (isLegalDelivery) {
    innings.legalBalls += 1;
  }

  innings.overs =
    Math.floor(
      innings.legalBalls / 6
    ) +
    (innings.legalBalls % 6) / 10;

  /* =====================================================
     4. WICKET
  ===================================================== */

  const maxWickets =
    Math.max(
      1,
      innings.battingLineup.length - 1
    );

  if (outcome.isWicket) {
    innings.wickets += 1;

    /*
     * Bring in next batter if available.
     */
    if (
      innings.wickets <
        maxWickets &&
      innings.nextBatterIndex <
        innings.battingLineup.length
    ) {
      innings.strikerId =
        innings.battingLineup[
          innings.nextBatterIndex
        ].id;

      innings.nextBatterIndex += 1;
    }
  } else {
    /*
     * Strike rotation.
     *
     * The no-ball penalty itself does not
     * count toward strike rotation.
     */
    const runsForRotation =
      outcome.isNoBall
        ? outcome.runs - 1
        : outcome.runs;

    if (
      runsForRotation % 2 === 1
    ) {
      [
        innings.strikerId,
        innings.nonStrikerId,
      ] = [
        innings.nonStrikerId,
        innings.strikerId,
      ];
    }
  }

  /* =====================================================
     5. FREE HIT
  ===================================================== */

  if (outcome.isNoBall) {
    innings.isFreeHitActive = true;
  } else if (isLegalDelivery) {
    innings.isFreeHitActive = false;
  }

  /* =====================================================
     6. OVER COMPLETION
  ===================================================== */

  const overJustEnded =
    isLegalDelivery &&
    innings.legalBalls > 0 &&
    innings.legalBalls % 6 === 0;

  if (overJustEnded) {
    innings.oversHistory.push({
      bowlerId: bowlerIdThisBall,
      overs:
        Math.floor(
          innings.legalBalls / 6
        ),
    });

    /*
     * Swap strike at end of over.
     */
    [
      innings.strikerId,
      innings.nonStrikerId,
    ] = [
      innings.nonStrikerId,
      innings.strikerId,
    ];

    const previousBowlerIds =
      innings.oversHistory.map(
        (over) => over.bowlerId
      );

    innings.currentBowlerId =
      selectBestBowler(
        innings.bowlingLineup,
        previousBowlerIds
      );
  }

  /* =====================================================
     7. TARGET
  ===================================================== */

  const target =
    match.currentInnings === 2 &&
    match.innings1
      ? match.innings1.totalRuns + 1
      : null;

  /* =====================================================
     8. CHASE COMPLETED
  ===================================================== */

  if (
    target !== null &&
    innings.totalRuns >= target
  ) {
    innings.isCompleted = true;

    match.phase = 'MATCH_OVER';

    match.winnerTeamId =
      innings.battingTeamId;

    match.winningMargin =
      `won by ${
        maxWickets -
        innings.wickets
      } wickets`;

    return match;
  }

  /* =====================================================
     9. INNINGS COMPLETION
  ===================================================== */

  const inningsOver =
    innings.wickets >= maxWickets ||
    innings.legalBalls >=
      innings.maxOvers * 6;

  if (!inningsOver) {
    return match;
  }

  innings.isCompleted = true;

  /* =====================================================
     FIRST INNINGS -> SECOND INNINGS
  ===================================================== */

  if (match.currentInnings === 1) {
    match.currentInnings = 2;

    match.innings2 =
      createInnings(
        match.innings1.bowlingTeamId,
        match.innings1.battingTeamId,
        match.innings1.bowlingLineup,
        match.innings1.battingLineup,
        match.totalOvers
      );

    match.phase =
      'AWAITING_DELIVERY';

    return match;
  }

  /* =====================================================
     SECOND INNINGS COMPLETE
  ===================================================== */

  match.phase = 'MATCH_OVER';

  const firstRuns =
    match.innings1.totalRuns;

  const secondRuns =
    innings.totalRuns;

  if (firstRuns > secondRuns) {
    match.winnerTeamId =
      match.innings1.battingTeamId;

    match.winningMargin =
      `won by ${
        firstRuns - secondRuns
      } runs`;
  } else if (secondRuns > firstRuns) {
    match.winnerTeamId =
      innings.battingTeamId;

    match.winningMargin =
      `won by ${
        maxWickets -
        innings.wickets
      } wickets`;
  } else {
    /*
     * Tie
     */
    match.winnerTeamId =
      undefined;

    match.winningMargin =
      'Match Tied!';
  }

  return match;
}
