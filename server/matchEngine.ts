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

function resolveLineupPlayers(lineup: TeamLineup, squad: PurchasedPlayer[]): Player[] {
  const byId = new Map(squad.map((s) => [s.player.id, s.player]));
  const xi: Player[] = [];
  for (const id of lineup.playingXI) {
    const p = byId.get(id);
    if (p) xi.push(p);
  }
  if (lineup.impactPlayerId) {
    const impact = byId.get(lineup.impactPlayerId);
    if (impact && !xi.find((p) => p.id === impact.id)) {
      xi.push(impact);
    }
  }
  return xi.length === 0 ? squad.map((s) => s.player) : xi;
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
    currentBowlerId: selectBestBowler(bowlingLineup, []),
    battingLineup,
    bowlingLineup,
    nextBatterIndex: 2,
    oversHistory: [],
    isCompleted: false,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    isFreeHitActive: false,
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
  const team1Players = resolveLineupPlayers(team1Lineup, team1Squad);
  const team2Players = resolveLineupPlayers(team2Lineup, team2Squad);

  if (team1Players.length < 2 || team2Players.length < 2) {
    throw new Error('Both teams must have at least 2 players to play the match.');
  }

  return {
    roomCode,
    totalOvers,
    currentInnings: 1,
    innings1: createInnings(team1Id, team2Id, team1Players, team2Players, totalOvers),
    phase: 'AWAITING_DELIVERY',
  };
}

export function selectBestBowler(bowlingSquad: Player[], previousBowlerIds: string[]): string {
  const lastBowler = previousBowlerIds[previousBowlerIds.length - 1];
  const preferred = bowlingSquad.filter((p) => p.role === 'Bowler' || p.role === 'All-Rounder');
  const pool = preferred.length > 0 ? preferred : bowlingSquad;

  let available = pool.filter((p) => p.id !== lastBowler);
  if (available.length === 0) available = [...pool];

  available.sort((a, b) => (b.bowlingRating || 50) - (a.bowlingRating || 50));
  return available[0]?.id || bowlingSquad[0].id;
}

export function calculateBallOutcome(
  delivery: DeliveryInput,
  shot: ShotInput,
  batter: Player,
  bowler: Player,
  isFreeHit: boolean
): BallOutcome {
  const batRating = batter.battingRating || 50;
  const bowlRating = bowler.bowlingRating || 50;
  const statRatio = batRating / Math.max(bowlRating, 1);
  const timing = Math.max(0, Math.min(1, shot.timing));

  // 1. NO-BALL CHECK (~4% chance naturally, higher if bowler tries a Yorker and misses execution)
  const overstepChance = delivery.zone === 'YORKER' ? 0.08 : 0.03;
  const isNoBall = Math.random() < overstepChance;

  let shotQuality: BallOutcome['shotQuality'] = 'MISSED';
  if (timing > 0.85) shotQuality = 'PERFECT';
  else if (timing > 0.6) shotQuality = 'GOOD';
  else if (timing > 0.35) shotQuality = 'EARLY';
  else if (timing > 0.15) shotQuality = 'LATE';

  let lineMatch = false;
  if (delivery.line === 'OUTSIDE_OFF' && shot.direction === 'OFF') lineMatch = true;
  if (delivery.line === 'MIDDLE' && shot.direction === 'STRAIGHT') lineMatch = true;
  if (delivery.line === 'LEG' && shot.direction === 'LEG') lineMatch = true;

  // 2. WIDE CHECK (If they miss completely and the line is wide)
  if (shotQuality === 'MISSED' || shotQuality === 'LATE' || shotQuality === 'EARLY') {
    if (delivery.line === 'LEG' && !lineMatch && Math.random() < 0.7) {
      return { runs: 1, isWicket: false, isExtra: true, isWide: true, shotQuality: 'MISSED', commentary: `↔️ WIDE! Down the leg side by ${bowler.name}.` };
    }
    if (delivery.line === 'OUTSIDE_OFF' && !lineMatch && Math.random() < 0.3) {
      return { runs: 1, isWicket: false, isExtra: true, isWide: true, shotQuality: 'MISSED', commentary: `↔️ WIDE! Way outside off stump.` };
    }
  }

  // Wicket logic wrapper (Nullifies wickets if Free Hit, except Run Out which we don't have deeply modeled yet)
  const processWicket = (type: 'BOWLED' | 'CAUGHT', defaultCommentary: string): BallOutcome => {
    if (isFreeHit || isNoBall) {
      return { runs: isNoBall ? 1 : 0, isWicket: false, isExtra: isNoBall, isNoBall, shotQuality, commentary: `🚨 ${defaultCommentary} BUT IT'S A FREE HIT! Batter survives!` };
    }
    return { runs: 0, isWicket: true, wicketType: type, isExtra: false, shotQuality, commentary: defaultCommentary };
  };

  // 3. CONTACT MADE (PERFECT / GOOD)
  if (shotQuality === 'PERFECT') {
    const runs = (shot.shotType === 'LOFTED' && (lineMatch || statRatio > 1.05 || Math.random() < 0.8)) ? 6 : 4;
    let commentary = runs === 6 ? `🚀 MASSIVE SIX! ${batter.name} perfectly timed it!` : `💥 FOUR! Flawless drive by ${batter.name}!`;
    if (isNoBall) commentary = `🚨 NO BALL + ${commentary}`;
    
    return { runs: runs + (isNoBall ? 1 : 0), isWicket: false, isExtra: isNoBall, isNoBall, shotQuality, commentary };
  }

  if (shotQuality === 'GOOD') {
    if (shot.shotType === 'LOFTED' && !lineMatch && statRatio < 0.9 && Math.random() < 0.3) {
      return processWicket('CAUGHT', `☝️ OUT! Caught in the deep! ${batter.name} mistimed the lofted shot.`);
    }
    const batRuns = shot.shotType === 'LOFTED' ? (Math.random() < 0.6 ? 4 : 2) : (lineMatch ? (Math.random() < 0.5 ? 2 : 1) : 1);
    let commentary = `🏏 Good shot by ${batter.name} for ${batRuns} run(s).`;
    if (isNoBall) commentary = `🚨 NO BALL! ${commentary}`;

    return { runs: batRuns + (isNoBall ? 1 : 0), isWicket: false, isExtra: isNoBall, isNoBall, shotQuality, commentary };
  }

  // 4. EDGES & MISTIMES (EARLY / LATE)
  if (shotQuality === 'EARLY' || shotQuality === 'LATE') {
    const wicketChance = (0.3 / statRatio) * (lineMatch ? 0.6 : 1.2);
    if (Math.random() < wicketChance) {
      const wType = delivery.zone === 'YORKER' ? 'BOWLED' : 'CAUGHT';
      const c = wType === 'BOWLED' ? `🎯 CLEAN BOWLED! ${bowler.name} destroys the stumps!` : `✋ CAUGHT! ${batter.name} gets a leading edge!`;
      return processWicket(wType, c);
    }
    
    // Leg Byes logic (Mistimed body hit)
    if (Math.random() < 0.2) {
      const lbRuns = Math.random() < 0.5 ? 1 : 0;
      if (lbRuns > 0) {
        return { runs: lbRuns + (isNoBall ? 1 : 0), isWicket: false, isExtra: true, isLegBye: true, isNoBall, shotQuality, commentary: `🦵 Leg byes taken. They scramble for ${lbRuns}.` };
      }
    }

    const batRuns = Math.random() < 0.4 ? 1 : 0;
    let commentary = batRuns === 1 ? `😅 Scrambled single by ${batter.name}.` : `🛡️ Dot ball by ${bowler.name}.`;
    if (isNoBall) commentary = `🚨 NO BALL! ${commentary}`;
    
    return { runs: batRuns + (isNoBall ? 1 : 0), isWicket: false, isExtra: isNoBall, isNoBall, shotQuality, commentary };
  }

  // 5. MISSED
  if (delivery.zone === 'YORKER' || delivery.line === 'MIDDLE') {
    return processWicket('BOWLED', `💥 BOWLED HIM! ${batter.name} swung at thin air!`);
  }

  // Byes logic (Missed but keeper fumbles)
  if (Math.random() < 0.1) {
    return { runs: 1 + (isNoBall ? 1 : 0), isWicket: false, isExtra: true, isBye: true, isNoBall, shotQuality: 'MISSED', commentary: `🧤 Keeper fumbles! They sneak a Bye.` };
  }

  return { 
    runs: isNoBall ? 1 : 0, 
    isWicket: false, 
    isExtra: isNoBall, 
    isNoBall, 
    shotQuality: 'MISSED', 
    commentary: isNoBall ? `🚨 NO BALL! Swing and a miss.` : `❌ Swing and a miss! Dot ball.` 
  };
}

export function applyBallResult(match: LiveMatchState, outcome: BallOutcome): LiveMatchState {
  const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
  if (!inn || inn.isCompleted) return match;

  const bowlerIdThisBall = inn.currentBowlerId;

  // 1. ADD RUNS & EXTRAS
  inn.totalRuns += outcome.runs;
  
  if (outcome.isWide) inn.extras.wides += outcome.runs;
  if (outcome.isNoBall) inn.extras.noBalls += 1; // Assuming 1 run penalty for no-ball itself
  if (outcome.isBye) inn.extras.byes += outcome.runs - (outcome.isNoBall ? 1 : 0);
  if (outcome.isLegBye) inn.extras.legByes += outcome.runs - (outcome.isNoBall ? 1 : 0);

  // 2. BALL COUNTING (Wides & No-Balls do NOT consume a legal ball)
  const isLegalDelivery = !outcome.isWide && !outcome.isNoBall;
  if (isLegalDelivery) {
    inn.legalBalls += 1;
  }
  inn.overs = Math.floor(inn.legalBalls / 6) + (inn.legalBalls % 6) / 10;

  // 3. WICKETS
  if (outcome.isWicket) {
    inn.wickets += 1;
    const maxWickets = Math.max(1, inn.battingLineup.length - 1);
    if (inn.wickets < maxWickets && inn.nextBatterIndex < inn.battingLineup.length) {
      inn.strikerId = inn.battingLineup[inn.nextBatterIndex].id;
      inn.nextBatterIndex += 1;
    }
  } else {
    // Strike rotation on odd runs (Total runs scored this ball, excluding the no-ball penalty run which doesn't rotate strike)
    const runsForRotation = outcome.isNoBall ? outcome.runs - 1 : outcome.runs;
    if (runsForRotation % 2 === 1) {
      [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
    }
  }

  // 4. FREE HIT MANAGEMENT
  if (outcome.isNoBall) {
    inn.isFreeHitActive = true;
  } else if (isLegalDelivery) {
    inn.isFreeHitActive = false; // Reset free hit after a legal ball
  }

  // 5. OVER COMPLETION
  const overJustEnded = isLegalDelivery && inn.legalBalls > 0 && inn.legalBalls % 6 === 0;
  if (overJustEnded) {
    inn.oversHistory.push({ bowlerId: bowlerIdThisBall, overs: Math.floor(inn.legalBalls / 6) });
    // Swap strike at end of over
    [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
    const prevIds = inn.oversHistory.map((o) => o.bowlerId);
    inn.currentBowlerId = selectBestBowler(inn.bowlingLineup, prevIds);
  }

  // 6. MATCH COMPLETION LOGIC
  const maxWickets = Math.max(1, inn.battingLineup.length - 1);
  const target = match.currentInnings === 2 && match.innings1 ? match.innings1.totalRuns + 1 : null;

  if (target !== null && inn.totalRuns >= target) {
    inn.isCompleted = true;
    match.phase = 'MATCH_OVER';
    match.winnerTeamId = inn.battingTeamId;
    match.winningMargin = `won by ${maxWickets - inn.wickets} wickets`;
    return match;
  }

  const inningsOver = inn.wickets >= maxWickets || inn.legalBalls >= inn.maxOvers * 6;
  if (inningsOver) {
    inn.isCompleted = true;
    if (match.currentInnings === 1) {
      match.currentInnings = 2;
      match.innings2 = createInnings(
        match.innings1.bowlingTeamId,
        match.innings1.battingTeamId,
        match.innings1.bowlingLineup,
        match.innings1.battingLineup,
        match.totalOvers
      );
    } else {
      match.phase = 'MATCH_OVER';
      const first = match.innings1.totalRuns;
      const second = inn.totalRuns;
      if (first > second) {
        match.winnerTeamId = match.innings1.battingTeamId;
        match.winningMargin = `won by ${first - second} runs`;
      } else if (second > first) {
        match.winnerTeamId = inn.battingTeamId;
        match.winningMargin = `won by ${maxWickets - inn.wickets} wickets`;
      } else {
        match.winnerTeamId = undefined;
        match.winningMargin = 'Match Tied!';
      }
    }
  }

  return match;
}
