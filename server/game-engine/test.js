/**
 * Quick test script for the game engine
 * Run: node server/game-engine/test.js
 */

const BallEngine = require('./BallEngine');

const engine = new BallEngine({ difficulty: 'MEDIUM', totalOvers: 5 }); // 5 overs for quick test

// Create test teams
const team1 = {
  name: 'Mumbai Indians',
  shortName: 'MI',
  playingXI: [
    { name: 'Rohit Sharma', role: 'BATSMAN', battingRating: 88, bowlingRating: 25 },
    { name: 'Ishan Kishan', role: 'WICKET_KEEPER', battingRating: 78, bowlingRating: 10, isKeeper: true },
    { name: 'Suryakumar Yadav', role: 'BATSMAN', battingRating: 90, bowlingRating: 15 },
    { name: 'Tilak Varma', role: 'BATSMAN', battingRating: 75, bowlingRating: 20 },
    { name: 'Hardik Pandya', role: 'ALL_ROUNDER', battingRating: 80, bowlingRating: 72, bowlingType: 'FAST' },
    { name: 'Kieron Pollard', role: 'ALL_ROUNDER', battingRating: 76, bowlingRating: 45, bowlingType: 'FAST' },
    { name: 'Tim David', role: 'BATSMAN', battingRating: 74, bowlingRating: 10 },
    { name: 'Jasprit Bumrah', role: 'BOWLER', battingRating: 15, bowlingRating: 95, bowlingType: 'FAST' },
    { name: 'Trent Boult', role: 'BOWLER', battingRating: 12, bowlingRating: 85, bowlingType: 'FAST' },
    { name: 'Piyush Chawla', role: 'BOWLER', battingRating: 20, bowlingRating: 75, bowlingType: 'SPIN' },
    { name: 'Rahul Chahar', role: 'BOWLER', battingRating: 10, bowlingRating: 78, bowlingType: 'SPIN' }
  ]
};

const team2 = {
  name: 'Chennai Super Kings',
  shortName: 'CSK',
  playingXI: [
    { name: 'Ruturaj Gaikwad', role: 'BATSMAN', battingRating: 82, bowlingRating: 15 },
    { name: 'Devon Conway', role: 'BATSMAN', battingRating: 80, bowlingRating: 10 },
    { name: 'MS Dhoni', role: 'WICKET_KEEPER', battingRating: 75, bowlingRating: 5, isCaptain: true, isKeeper: true },
    { name: 'Ambati Rayudu', role: 'BATSMAN', battingRating: 74, bowlingRating: 25 },
    { name: 'Ravindra Jadeja', role: 'ALL_ROUNDER', battingRating: 78, bowlingRating: 82, bowlingType: 'SPIN' },
    { name: 'Moeen Ali', role: 'ALL_ROUNDER', battingRating: 72, bowlingRating: 70, bowlingType: 'SPIN' },
    { name: 'Shivam Dube', role: 'ALL_ROUNDER', battingRating: 70, bowlingRating: 40, bowlingType: 'FAST' },
    { name: 'Deepak Chahar', role: 'BOWLER', battingRating: 30, bowlingRating: 80, bowlingType: 'FAST' },
    { name: 'Tushar Deshpande', role: 'BOWLER', battingRating: 10, bowlingRating: 72, bowlingType: 'FAST' },
    { name: 'Maheesh Theekshana', role: 'BOWLER', battingRating: 8, bowlingRating: 78, bowlingType: 'SPIN' },
    { name: 'Matheesha Pathirana', role: 'BOWLER', battingRating: 5, bowlingRating: 76, bowlingType: 'FAST' }
  ]
};

console.log('\n🏏 ==========================================');
console.log('   IPL AUCTION BATTLE - CRICKET GAME TEST');
console.log('==========================================\n');

// Toss
const toss = engine.performToss();
console.log(`🪙 Toss Result: ${toss.result}`);

// Create match
let matchState = engine.createMatchState(team1, team2, 'team1', 'BAT');
console.log(`\n📋 ${matchState.teams.team1.name} bat first!`);
console.log(`📋 ${matchState.teams.team2.name} will bowl.\n`);

// Simulate full match (both innings)
function simulateInnings(matchState, inningsNum) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  INNINGS ${inningsNum}`);
  console.log(`${'='.repeat(50)}\n`);

  let ballCount = 0;
  const maxBalls = engine.totalOvers * 6 + 50; // Safety limit (extras)

  while (ballCount < maxBalls) {
    const innings = matchState.innings[matchState.currentInnings];
    if (!innings || innings.isComplete) break;
    if (matchState.currentInnings !== inningsNum) break;

    // Need to set bowler at start of over
    if (!innings.currentBowler && innings.balls === 0) {
      const bowlingTeamData = matchState.teams[innings.bowlingTeam];
      const available = bowlingTeamData.players.filter(p => {
        const stats = innings.bowlerStats[p.name];
        return (!stats || stats.overs < 4) && p.name !== innings.lastOverBowler;
      });
      const bowler = engine.ai.selectBowler(available, innings.bowlerStats, { overs: innings.overs });
      if (bowler) engine.setBowlerForOver(matchState, bowler.name);
    }

    // Both sides AI-controlled for test
    const aiAction = engine.ai.decideBattingAction(
      { score: innings.score, wickets: innings.wickets, overs: innings.overs, target: matchState.target, innings: inningsNum },
      'FAST',
      { battingRating: 70 }
    );

    const result = engine.processBall(matchState, { shotType: aiAction.shotType, timing: aiAction.timing }, true);

    if (result.error) {
      console.log(`ERROR: ${result.error}`);
      break;
    }

    // Print ball result
    const ball = result.ballResult;
    const symbol = ball.isWicket ? 'W' : ball.isExtra ? ball.extraType[0].toUpperCase() : ball.runs;
    
    if (ball.isWicket || ball.runs >= 4) {
      ball.commentary.forEach(c => console.log(`  💬 ${c}`));
    }

    if (ball.overComplete) {
      console.log(`\n  Over ${innings.overs}: ${innings.score}/${innings.wickets}`);
      console.log(`  ${'─'.repeat(40)}`);
    }

    ballCount++;
    matchState = result.matchState;

    if (result.isInningsComplete) break;
  }

  return matchState;
}

// First innings
matchState = simulateInnings(matchState, 1);

const innings1 = matchState.innings[1];
console.log(`\n🏏 First Innings: ${matchState.teams[innings1.battingTeam].name} ${innings1.score}/${innings1.wickets} (${innings1.overs}.${innings1.balls} overs)`);
console.log(`🎯 Target: ${matchState.target}\n`);

// Second innings
matchState = simulateInnings(matchState, 2);

// Final result
console.log(`\n${'='.repeat(50)}`);
console.log('  MATCH RESULT');
console.log(`${'='.repeat(50)}\n`);

if (matchState.result) {
  console.log(`🏆 ${matchState.result.description}`);
  
  if (matchState.result.scores) {
    Object.entries(matchState.result.scores).forEach(([team, score]) => {
      console.log(`   ${matchState.teams[team].name}: ${score}`);
    });
  }
}

// Scorecard
const scorecard = engine.getScorecard(matchState);
console.log('\n📊 SCORECARD:');

for (const [innNum, inn] of Object.entries(scorecard.innings)) {
  console.log(`\n--- ${inn.battingTeam} ${inn.score} (${inn.overs}) ---`);
  inn.batting.forEach(b => {
    console.log(`  ${b.name.padEnd(20)} ${b.dismissal.padEnd(30)} ${String(b.runs).padStart(3)} (${b.balls}) ${b.fours}×4 ${b.sixes}×6 SR:${b.strikeRate}`);
  });
  console.log(`  Extras: ${inn.extras.total}`);
  console.log('');
  inn.bowling.forEach(b => {
    console.log(`  ${b.name.padEnd(20)} ${b.overs.padStart(4)}-${String(b.maidens).padStart(1)}-${String(b.runs).padStart(3)}-${String(b.wickets).padStart(1)} Econ:${b.economy}`);
  });
}

// Man of the Match
const motm = engine.selectManOfMatch(matchState);
if (motm) {
  console.log(`\n🌟 Player of the Match: ${motm.name}`);
}

console.log('\n✅ Test complete!\n');
