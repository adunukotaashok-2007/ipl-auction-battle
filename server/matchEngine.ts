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

/**
 * Resolve Playing XI (+ impact) IDs to full Player objects from the squad.
 */
function resolveLineupPlayers(
  lineup: TeamLineup,
  squad: PurchasedPlayer[]
): Player[] {
  const byId = new Map(squad.map((s) => [s.player.id, s.player]));
  const xi: Player[] = [];

  for (const id of lineup.playingXI) {
    const p = byId.get(id);
    if (p) {
      xi.push(p);
    }
  }

  if (lineup.impactPlayerId) {
    const impact = byId.get(lineup.impactPlayerId);

    if (
      impact &&
      !xi.find((p) => p.id === impact.id)
    ) {
      xi.push(impact);
    }
  }

  // Fallback: empty XI → whole squad
  if (xi.length === 0) {
    return squad.map((s) => s.player);
  }

  return xi;
}

function createInnings(
  battingTeamId: string,
  bowlingTeamId: string,
  battingLineup: Player[],
  bowlingLineup: Player[],
  maxOvers: number
): InningsState {
  return {
    battingTeamId,
    bowlingTeamId,

    totalRuns: 0,
    wickets: 0,

    overs: 0,
    legalBalls: 0,
    maxOvers,

    strikerId: battingLineup[0].id,
    nonStrikerId: battingLineup[1].id,

    currentBowlerId: selectBestBowler(
      bowlingLineup,
      []
    ),

    battingLineup,
    bowlingLineup,

    nextBatterIndex: 2,

    oversHistory: [],

    isCompleted: false,
  };
}

export function initializeMatch(
  roomCode: string,
  team1Id: string,
  team1Lineup: TeamLineup,
  team1Squad: PurchasedPlayer[],
  team2Id: string,
  team2Lineup: TeamLineup,
  team2Squad: PurchasedPlayer[],
  totalOvers: number = 2
): LiveMatchState {
  const team1Players = resolveLineupPlayers(
    team1Lineup,
    team1Squad
  );

  const team2Players = resolveLineupPlayers(
    team2Lineup,
    team2Squad
  );

  if (
    team1Players.length < 2 ||
    team2Players.length < 2
  ) {
    throw new Error(
      'Both teams must have at least 2 players to play the match.'
    );
  }

  return {
    roomCode,
    totalOvers,

    currentInnings: 1,

    innings1: createInnings(
      team1Id,
      team2Id,
      team1Players,
      team2Players,
      totalOvers
    ),

    phase: 'AWAITING_DELIVERY',
  };
}

export function selectBestBowler(
  bowlingSquad: Player[],
  previousBowlerIds: string[]
): string {
  const lastBowler =
    previousBowlerIds[
      previousBowlerIds.length - 1
    ];

  const preferred = bowlingSquad.filter(
    (p) =>
      p.role === 'Bowler' ||
      p.role === 'All-Rounder'
  );

  const pool =
    preferred.length > 0
      ? preferred
      : bowlingSquad;

  let available = pool.filter(
    (p) => p.id !== lastBowler
  );

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

export function calculateBallOutcome(
  delivery: DeliveryInput,
  shot: ShotInput,
  batter: Player,
  bowler: Player
): BallOutcome {
  const batRating =
    batter.battingRating || 50;

  const bowlRating =
    bowler.bowlingRating || 50;

  const statRatio =
    batRating / Math.max(bowlRating, 1);

  const timing = Math.max(
    0,
    Math.min(1, shot.timing)
  );

  let shotQuality: BallOutcome['shotQuality'] =
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

  // PERFECT SHOT
  if (shotQuality === 'PERFECT') {
    if (shot.shotType === 'LOFTED') {
      const isSix =
        lineMatch ||
        statRatio > 1.05 ||
        Math.random() < 0.8;

      return {
        runs: isSix ? 6 : 4,
        isWicket: false,
        isExtra: false,
        shotQuality,

        commentary: isSix
          ? `🚀 MASSIVE SIX! ${batter.name} perfectly timed it!`
          : `💥 ONE BOUNCE FOUR! ${batter.name} smashes it.`,
      };
    }

    return {
      runs: 4,
      isWicket: false,
      isExtra: false,
      shotQuality,

      commentary: `⚡ FOUR! Flawless ground drive by ${batter.name}!`,
    };
  }

  // GOOD SHOT
  if (shotQuality === 'GOOD') {
    if (
      shot.shotType === 'LOFTED' &&
      !lineMatch &&
      statRatio < 0.9 &&
      Math.random() < 0.3
    ) {
      return {
        runs: 0,
        isWicket: true,
        wicketType: 'CAUGHT',
        isExtra: false,
        shotQuality,

        commentary: `☝️ OUT! Caught in the deep! ${batter.name} mistimed the lofted shot.`,
      };
    }

    const runs =
      shot.shotType === 'LOFTED'
        ? Math.random() < 0.6
          ? 4
          : 2
        : lineMatch
          ? Math.random() < 0.5
            ? 2
            : 1
          : 1;

    return {
      runs,
      isWicket: false,
      isExtra: false,
      shotQuality,

      commentary: `🏏 Good shot by ${batter.name} for ${runs} run(s).`,
    };
  }

  // EARLY / LATE
  if (
    shotQuality === 'EARLY' ||
    shotQuality === 'LATE'
  ) {
    const wicketChance =
      (0.3 / statRatio) *
      (lineMatch ? 0.6 : 1.2);

    if (Math.random() < wicketChance) {
      const wType =
        delivery.zone === 'YORKER'
          ? 'BOWLED'
          : 'CAUGHT';

      return {
        runs: 0,
        isWicket: true,
        wicketType: wType,
        isExtra: false,
        shotQuality,

        commentary:
          wType === 'BOWLED'
            ? `🎯 CLEAN BOWLED! ${bowler.name} destroys the stumps!`
            : `✋ CAUGHT! ${batter.name} gets a leading edge!`,
      };
    }

    const runs =
      Math.random() < 0.4 ? 1 : 0;

    return {
      runs,
      isWicket: false,
      isExtra: false,
      shotQuality,

      commentary:
        runs === 1
          ? `😅 Scrambled single by ${batter.name}.`
          : `🛡️ Dot ball by ${bowler.name}.`,
    };
  }

  // MISSED
  if (
    delivery.zone === 'YORKER' ||
    delivery.line === 'MIDDLE'
  ) {
    return {
      runs: 0,
      isWicket: true,
      wicketType: 'BOWLED',
      isExtra: false,
      shotQuality: 'MISSED',

      commentary: `💥 BOWLED HIM! ${batter.name} swung at thin air!`,
    };
  }

  return {
    runs: 0,
    isWicket: false,
    isExtra: false,
    shotQuality: 'MISSED',

    commentary: `❌ Swing and a miss! Dot ball.`,
  };
}

export function applyBallResult(
  match: LiveMatchState,
  outcome: BallOutcome
): LiveMatchState {
  const inn =
    match.currentInnings === 1
      ? match.innings1
      : match.innings2;

  if (!inn || inn.isCompleted) {
    return match;
  }

  const bowlerIdThisBall =
    inn.currentBowlerId;

  // ------------------------------------------
  // RUNS + BALL COUNT
  // ------------------------------------------

  inn.totalRuns += outcome.runs;

  if (!outcome.isExtra) {
    inn.legalBalls += 1;
  }

  inn.overs =
    Math.floor(inn.legalBalls / 6) +
    (inn.legalBalls % 6) / 10;

  // ------------------------------------------
  // WICKET
  // ------------------------------------------

  if (outcome.isWicket) {
    inn.wickets += 1;

    const maxWickets = Math.max(
      1,
      inn.battingLineup.length - 1
    );

    if (
      inn.wickets < maxWickets &&
      inn.nextBatterIndex <
        inn.battingLineup.length
    ) {
      inn.strikerId =
        inn.battingLineup[
          inn.nextBatterIndex
        ].id;

      inn.nextBatterIndex += 1;
    }
  } else if (
    outcome.runs % 2 === 1
  ) {
    // Odd runs → rotate strike
    [
      inn.strikerId,
      inn.nonStrikerId,
    ] = [
      inn.nonStrikerId,
      inn.strikerId,
    ];
  }

  // ------------------------------------------
  // END OF OVER
  // ------------------------------------------

  const overJustEnded =
    !outcome.isExtra &&
    inn.legalBalls > 0 &&
    inn.legalBalls % 6 === 0;

  if (overJustEnded) {
    /*
     * IMPORTANT:
     *
     * Do not cast this object to BallRecord.
     *
     * oversHistory is expected to contain
     * over-summary objects with:
     *
     *   bowlerId
     *   overs
     *
     * rather than complete ball records.
     */

    inn.oversHistory.push({
      bowlerId: bowlerIdThisBall,
      overs: Math.floor(
        inn.legalBalls / 6
      ),
    } as InningsState['oversHistory'][number]);

    // Swap strike at end of over
    [
      inn.strikerId,
      inn.nonStrikerId,
    ] = [
      inn.nonStrikerId,
      inn.strikerId,
    ];

    const prevIds =
      inn.oversHistory.map(
        (o) => o.bowlerId
      );

    inn.currentBowlerId =
      selectBestBowler(
        inn.bowlingLineup,
        prevIds
      );
  }

  // ------------------------------------------
  // MATCH / INNINGS CONDITIONS
  // ------------------------------------------

  const maxWickets = Math.max(
    1,
    inn.battingLineup.length - 1
  );

  const target =
    match.currentInnings === 2 &&
    match.innings1
      ? match.innings1.totalRuns + 1
      : null;

  // ------------------------------------------
  // CHASE COMPLETED
  // ------------------------------------------

  if (
    target !== null &&
    inn.totalRuns >= target
  ) {
    inn.isCompleted = true;

    match.phase = 'MATCH_OVER';

    match.winnerTeamId =
      inn.battingTeamId;

    match.winningMargin =
      `won by ${
        maxWickets - inn.wickets
      } wickets`;

    return match;
  }

  // ------------------------------------------
  // INNINGS OVER
  // ------------------------------------------

  const inningsOver =
    inn.wickets >= maxWickets ||
    inn.legalBalls >=
      inn.maxOvers * 6;

  if (inningsOver) {
    inn.isCompleted = true;

    // ----------------------------------------
    // FIRST INNINGS FINISHED
    // ----------------------------------------

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

      /*
       * Do NOT set:
       *
       * match.phase = 'AWAITING_DELIVERY'
       *
       * here.
       *
       * index.ts handles the RESULT_SHOWCASE
       * transition.
       */
    }

    // ----------------------------------------
    // SECOND INNINGS FINISHED
    // ----------------------------------------

    else {
      match.phase = 'MATCH_OVER';

      const first =
        match.innings1.totalRuns;

      const second =
        inn.totalRuns;

      if (first > second) {
        match.winnerTeamId =
          match.innings1.battingTeamId;

        match.winningMargin =
          `won by ${
            first - second
          } runs`;
      } else if (second > first) {
        match.winnerTeamId =
          inn.battingTeamId;

        match.winningMargin =
          `won by ${
            maxWickets - inn.wickets
          } wickets`;
      } else {
        match.winnerTeamId =
          undefined;

        match.winningMargin =
          'Match Tied!';
      }
    }
  }

  return match;
}
