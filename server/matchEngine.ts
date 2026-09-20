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

/** Helper: Resolves lineup IDs into full Player objects from a team's squad */
function resolveLineupPlayers(
  lineup: TeamLineup,
  squad: PurchasedPlayer[]
): Player[] {
  const byId = new Map(squad.map((s) => [s.player.id, s.player]));
  const xi: Player[] = [];

  // Add all Playing XI players
  for (const id of lineup.playingXI) {
    const p = byId.get(id);
    if (p) xi.push(p);
  }

  // Add Impact Player to the match pool if not already in XI
  if (lineup.impactPlayerId) {
    const impact = byId.get(lineup.impactPlayerId);
    if (impact && !xi.find((p) => p.id === impact.id)) {
      xi.push(impact);
    }
  }

  // Safety fallback: if XI is completely empty for some reason, use full squad
  if (xi.length === 0) {
    return squad.map((s) => s.player);
  }

  return xi;
}

export function initializeMatch(
  roomCode: string,
  team1Id: string,
  team1Lineup: TeamLineup,
  team1Squad: PurchasedPlayer[],
  team2Id: string,
  team2Lineup: TeamLineup,
  team2Squad: PurchasedPlayer[],
  totalOvers: number = 2 // 2-over quick match for testing
): LiveMatchState {
  const team1Players = resolveLineupPlayers(team1Lineup, team1Squad);
  const team2Players = resolveLineupPlayers(team2Lineup, team2Squad);

  // Need at least 2 players to start a match
  if (team1Players.length < 2 || team2Players.length < 2) {
    throw new Error('Both teams must have at least 2 players to play the match.');
  }

  const inn1: InningsState = {
    battingTeamId: team1Id,
    bowlingTeamId: team2Id,
    totalRuns: 0,
    wickets: 0,
    overs: 0,
    legalBalls: 0,
    maxOvers: totalOvers,
    strikerId: team1Players[0].id,
    nonStrikerId: team1Players[1].id,
    currentBowlerId: selectBestBowler(team2Players, []),
    battingLineup: team1Players,
    bowlingLineup: team2Players,
    nextBatterIndex: 2,
    oversHistory: [],
    isCompleted: false,
  };

  return {
    roomCode,
    totalOvers,
    currentInnings: 1,
    innings1: inn1,
    phase: 'AWAITING_DELIVERY',
  };
}

export function selectBestBowler(bowlingSquad: Player[], previousBowlerIds: string[]): string {
  const eligible = bowlingSquad.filter((p) => p.role === 'Bowler' || p.role === 'All-Rounder');
  const lastBowler = previousBowlerIds[previousBowlerIds.length - 1];
  const available = (eligible.length > 0 ? eligible : bowlingSquad).filter(p => p.id !== lastBowler);
  
  // Sort descending by bowling rating
  available.sort((a, b) => (b.bowlingRating || 50) - (a.bowlingRating || 50));
  
  return available[0]?.id || bowlingSquad[0].id;
}

export function calculateBallOutcome(
  delivery: DeliveryInput,
  shot: ShotInput,
  batter: Player,
  bowler: Player
): BallOutcome {
  const batRating = batter.battingRating || 50;
  const bowlRating = bowler.bowlingRating || 50;
  
  // Avoid division by zero
  const statRatio = batRating / Math.max(bowlRating, 1);
  
  const timing = Math.max(0, Math.min(1, shot.timing));

  let shotQuality: BallOutcome['shotQuality'] = 'MISSED';
  if (timing > 0.85) shotQuality = 'PERFECT';
  else if (timing > 0.60) shotQuality = 'GOOD';
  else if (timing > 0.35) shotQuality = 'EARLY';
  else if (timing > 0.15) shotQuality = 'LATE';

  let lineMatch = false;
  if (delivery.line === 'OUTSIDE_OFF' && shot.direction === 'OFF') lineMatch = true;
  if (delivery.line === 'MIDDLE' && shot.direction === 'STRAIGHT') lineMatch = true;
  if (delivery.line === 'LEG' && shot.direction === 'LEG') lineMatch = true;

  if (shotQuality === 'PERFECT') {
    if (shot.shotType === 'LOFTED') {
      const isSix = lineMatch || statRatio > 1.05 || Math.random() < 0.8;
      return {
        runs: isSix ? 6 : 4,
        isWicket: false,
        isExtra: false,
        shotQuality,
        commentary: isSix ? `🚀 MASSIVE SIX! ${batter.name} perfectly timed it!` : `💥 ONE BOUNCE FOUR! ${batter.name} smashes it.`,
      };
    } else {
      return { runs: 4, isWicket: false, isExtra: false, shotQuality, commentary: `⚡ FOUR! Flawless ground drive by ${batter.name}!` };
    }
  }

  if (shotQuality === 'GOOD') {
    if (shot.shotType === 'LOFTED' && !lineMatch && statRatio < 0.9 && Math.random() < 0.3) {
      return { runs: 0, isWicket: true, wicketType: 'CAUGHT', isExtra: false, shotQuality, commentary: `☝️ OUT! Caught in the deep! ${batter.name} mistimed the lofted shot.` };
    }
    const runs = shot.shotType === 'LOFTED' ? (Math.random() < 0.6 ? 4 : 2) : (lineMatch ? (Math.random() < 0.5 ? 2 : 1) : 1);
    return { runs, isWicket: false, isExtra: false, shotQuality, commentary: `🏏 Good shot by ${batter.name} for ${runs} run(s).` };
  }

  if (shotQuality === 'EARLY' || shotQuality === 'LATE') {
    const wicketChance = (0.3 / statRatio) * (lineMatch ? 0.6 : 1.2);
    if (Math.random() < wicketChance) {
      const wType = delivery.zone === 'YORKER' ? 'BOWLED' : 'CAUGHT';
      return { 
        runs: 0, 
        isWicket: true, 
        wicketType: wType as any, 
        isExtra: false, 
        shotQuality, 
        commentary: wType === 'BOWLED' ? `🎯 CLEAN BOWLED! ${bowler.name} destroys the stumps!` : `✋ CAUGHT! ${batter.name} gets a leading edge!` 
      };
    }
    const runs = Math.random() < 0.4 ? 1 : 0;
    return { runs, isWicket: false, isExtra: false, shotQuality, commentary: runs === 1 ? `😅 Scrambled single by ${batter.name}.` : `🛡️ Dot ball by ${bowler.name}.` };
  }

  if (delivery.zone === 'YORKER' || delivery.line === 'MIDDLE') {
    return { runs: 0, isWicket: true, wicketType: 'BOWLED', isExtra: false, shotQuality: 'MISSED', commentary: `💥 BOWLED HIM! ${batter.name} swung at thin air!` };
  }

  return { runs: 0, isWicket: false, isExtra: false, shotQuality: 'MISSED', commentary: `❌ Swing and a miss! Dot ball.` };
}

export function applyBallResult(match: LiveMatchState, outcome: BallOutcome): LiveMatchState {
  const inn = match.currentInnings === 1 ? match.innings1 : match.innings2;
  if (!inn) return match;

  inn.totalRuns += outcome.runs;
  inn.legalBalls += 1;
  inn.overs = Math.floor(inn.legalBalls / 6) + (inn.legalBalls % 6) / 10;

  // Handle Wicket
  if (outcome.isWicket) {
    inn.wickets += 1;
    if (inn.wickets < 10 && inn.nextBatterIndex < inn.battingLineup.length) {
      inn.strikerId = inn.battingLineup[inn.nextBatterIndex].id;
      inn.nextBatterIndex += 1;
    }
  } else if (outcome.runs % 2 !== 0) {
    // Strike rotation on odd runs
    [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
  }

  // End of over logic
  if (inn.legalBalls % 6 === 0) {
    [inn.strikerId, inn.nonStrikerId] = [inn.nonStrikerId, inn.strikerId];
    inn.currentBowlerId = selectBestBowler(inn.bowlingLineup, inn.oversHistory.map(b => b.bowlerId));
  }

  const target = match.currentInnings === 2 ? match.innings1.totalRuns + 1 : null;

  // Chasing team wins
  if (target && inn.totalRuns >= target) {
    inn.isCompleted = true;
    match.phase = 'MATCH_OVER';
    match.winnerTeamId = inn.battingTeamId;
    match.winningMargin = `won by ${10 - inn.wickets} wickets`;
    return match;
  }

  // Innings Over (All out or max overs reached)
  if (inn.wickets >= 10 || inn.legalBalls >= inn.maxOvers * 6) {
    inn.isCompleted = true;
    
    if (match.currentInnings === 1) {
      // Start 2nd Innings
      match.currentInnings = 2;
      match.innings2 = {
        battingTeamId: match.innings1.bowlingTeamId,
        bowlingTeamId: match.innings1.battingTeamId,
        totalRuns: 0,
        wickets: 0,
        overs: 0,
        legalBalls: 0,
        maxOvers: match.totalOvers,
        strikerId: match.innings1.bowlingLineup[0].id,
        nonStrikerId: match.innings1.bowlingLineup[1].id,
        currentBowlerId: selectBestBowler(match.innings1.battingLineup, []),
        battingLineup: match.innings1.bowlingLineup,
        bowlingLineup: match.innings1.battingLineup,
        nextBatterIndex: 2,
        oversHistory: [],
        isCompleted: false,
      };
      match.phase = 'AWAITING_DELIVERY';
    } else {
      // Match Finished
      match.phase = 'MATCH_OVER';
      if (match.innings1.totalRuns > inn.totalRuns) {
        match.winnerTeamId = match.innings1.battingTeamId;
        match.winningMargin = `won by ${match.innings1.totalRuns - inn.totalRuns} runs`;
      } else if (inn.totalRuns > match.innings1.totalRuns) {
        match.winnerTeamId = inn.battingTeamId;
        match.winningMargin = `won by ${10 - inn.wickets} wickets`;
      } else {
        match.winningMargin = `Match Tied!`;
      }
    }
  }

  return match;
}
