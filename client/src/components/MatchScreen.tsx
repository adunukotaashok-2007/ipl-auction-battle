// client/src/components/MatchScreen.tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import { CricketMatchCanvas } from './CricketMatchCanvas';
import './MatchScreen.css';

export function MatchScreen() {
  const { roomData, matchState, myTeamId, submitDelivery, submitShot } = useGame();

  if (!roomData || !matchState) {
    return <div className="loading-match">Loading Match Engine...</div>;
  }

  const inn = matchState.currentInnings === 1 ? matchState.innings1 : matchState.innings2;
  if (!inn) return null;

  const battingTeam = roomData.teams.find((t) => t.id === inn.battingTeamId);
  const bowlingTeam = roomData.teams.find((t) => t.id === inn.bowlingTeamId);
  
  const striker = inn.battingLineup.find((p) => p.id === inn.strikerId);
  const bowler = inn.bowlingLineup.find((p) => p.id === inn.currentBowlerId);

  const isBatting = myTeamId === inn.battingTeamId;
  const isBowling = myTeamId === inn.bowlingTeamId;

  // Formatting Over count (e.g. 1.4)
  const currentOvers = Math.floor(inn.legalBalls / 6) + (inn.legalBalls % 6) / 10;

  return (
    <div className="match-screen-container">
      
      {/* TOP SCOREBOARD */}
      <div className="scoreboard-header">
        <div className="score-block batting-team" style={{ borderLeft: `6px solid ${battingTeam?.teamColor}` }}>
          <h3>{battingTeam?.teamShortName} (Batting)</h3>
          <div className="score-main">
            {inn.totalRuns} / {inn.wickets}
          </div>
          <div className="score-sub">Overs: {currentOvers.toFixed(1)} / {inn.maxOvers}</div>
        </div>

        <div className="match-context-center">
          <div className="innings-badge">Innings {matchState.currentInnings}</div>
          {matchState.currentInnings === 2 && matchState.innings1 && (
            <div className="target-badge">
              Target: {matchState.innings1.totalRuns + 1}
            </div>
          )}
          {matchState.winnerTeamId && (
            <div className="winner-announcement">
              🏆 {roomData.teams.find(t=>t.id === matchState.winnerTeamId)?.teamName} {matchState.winningMargin}
            </div>
          )}
        </div>

        <div className="score-block bowling-team" style={{ borderRight: `6px solid ${bowlingTeam?.teamColor}` }}>
          <h3>{bowlingTeam?.teamShortName} (Bowling)</h3>
          <div className="current-bowler">
            🎳 {bowler?.name}
          </div>
          <div className="current-striker">
            🏏 {striker?.name} (On Strike)
          </div>
        </div>
      </div>

      {/* MATCH CANVAS VIEW */}
      {matchState.phase === 'MATCH_OVER' ? (
        <div className="match-over-card">
          <h2>🏏 MATCH CONCLUDED!</h2>
          <h1>{roomData.teams.find(t=>t.id === matchState.winnerTeamId)?.teamName}</h1>
          <p>{matchState.winningMargin}</p>
          {myTeamId === roomData.hostId && (
            <button className="btn-return-lobby" onClick={() => window.location.reload()}>
              Return to Post-Match Stats
            </button>
          )}
        </div>
      ) : (
        <CricketMatchCanvas 
          isBatting={isBatting}
          isBowling={isBowling}
          phase={matchState.phase as any}
          battingTeamName={battingTeam?.teamShortName || 'BAT'}
          bowlingTeamName={bowlingTeam?.teamShortName || 'BOWL'}
          battingColor={battingTeam?.teamColor}
          bowlingColor={bowlingTeam?.teamColor}
          strikerName={striker?.name || 'Batter'}
          bowlerName={bowler?.name || 'Bowler'}
          lastOutcome={matchState.lastOutcome}
          onDeliverBall={(zone, line, speed) => submitDelivery(zone as any, line as any, speed)}
          onHitShot={(dir, type, timing) => submitShot(dir as any, type as any, timing)}
        />
      )}
    </div>
  );
}
