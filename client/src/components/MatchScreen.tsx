import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CricketMatchCanvas } from './CricketMatchCanvas';
import { TeamPublicData } from '../types';
import './MatchScreen.css';

export const MatchScreen: React.FC = () => {
  const { matchState, myTeamId, roomData, submitDelivery, submitShot } = useGame();
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    if (typeof window.screen.orientation !== 'undefined' && 'lock' in window.screen.orientation) {
      (window.screen.orientation as any).lock('landscape').catch(() => {
        // Silently fail if orientation lock requires full screen first
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!matchState || !roomData) {
    return <div className="loading">Initializing Match Engine...</div>;
  }

  // Active innings determination based on room match state
  const activeInnings = matchState.currentInnings === 1 
    ? matchState.innings1 
    : matchState.innings2;

  if (!activeInnings) {
    return <div className="loading">Loading Innings State...</div>;
  }

  const battingTeam = roomData.teams.find((t: TeamPublicData) => t.id === activeInnings.battingTeamId);
  const bowlingTeam = roomData.teams.find((t: TeamPublicData) => t.id === activeInnings.bowlingTeamId);

  // Active players
  const striker = activeInnings.battingLineup.find(p => p.id === activeInnings.strikerId);
  const bowler = activeInnings.bowlingLineup.find(p => p.id === activeInnings.currentBowlerId);

  // Target calculations
  const targetScore = matchState.currentInnings === 2 ? matchState.innings1.totalRuns + 1 : null;

  // Run Rate calculations
  const ballsInCurrentOver = activeInnings.legalBalls % 6;
  const completedOvers = Math.floor(activeInnings.legalBalls / 6);
  const totalLegalBalls = activeInnings.legalBalls;

  const crr = totalLegalBalls > 0 
    ? (activeInnings.totalRuns / (totalLegalBalls / 6)).toFixed(2) 
    : "0.00";

  let rrr: string | null = null;
  if (matchState.currentInnings === 2 && targetScore) {
    const remainingRuns = targetScore - activeInnings.totalRuns;
    const maxMatchBalls = matchState.totalOvers * 6;
    const remainingBalls = maxMatchBalls - totalLegalBalls;
    rrr = remainingBalls > 0 ? (remainingRuns / (remainingBalls / 6)).toFixed(2) : "N/A";
  }

  const isBatting = myTeamId === activeInnings.battingTeamId;
  const isBowling = myTeamId === activeInnings.bowlingTeamId;

  return (
    <div className="match-screen">
      {/* Portrait Warning Overlay for Mobile */}
      {isPortrait && (
        <div className="portrait-warning-overlay">
          <div className="warning-content">
            <div className="phone-icon">📱</div>
            <h2>PLEASE ROTATE YOUR PHONE</h2>
            <p>Landscape mode is required for full match experience.</p>
          </div>
        </div>
      )}

      {/* Top Broadcast Score HUD */}
      <div className="match-hud-top">
        <div 
          className="team-score-block batting" 
          style={{ borderBottomColor: battingTeam?.teamColor || '#2980b9' }}
        >
          <span className="team-name">{battingTeam?.teamName || 'BATTING'}</span>
          <span className="score-main">{activeInnings.totalRuns}/{activeInnings.wickets}</span>
          <span className="overs-sub">({completedOvers}.{ballsInCurrentOver})</span>
        </div>

        <div className="match-info-center">
          {targetScore ? (
            <div className="target-pill">TARGET: {targetScore}</div>
          ) : (
            <div className="inning-pill">1ST INNINGS</div>
          )}
          {activeInnings.isFreeHitActive && (
            <div className="free-hit-banner">FREE HIT!</div>
          )}
        </div>

        <div 
          className="team-score-block bowling" 
          style={{ borderBottomColor: bowlingTeam?.teamColor || '#e74c3c' }}
        >
          <span className="team-name">{bowlingTeam?.teamName || 'BOWLING'}</span>
          <div className="run-rates">
            <span>CRR: {crr}</span>
            {rrr && <span>RRR: {rrr}</span>}
          </div>
        </div>
      </div>

      {/* Canvas Match Visualizer */}
      <div className="canvas-container">
        <CricketMatchCanvas 
          isBatting={isBatting}
          isBowling={isBowling}
          phase={matchState.phase}
          battingTeamName={battingTeam?.teamName || 'Batting Team'}
          bowlingTeamName={bowlingTeam?.teamName || 'Bowling Team'}
          strikerName={striker?.name || 'Striker'}
          bowlerName={bowler?.name || 'Bowler'}
          onDeliverySubmit={submitDelivery}
          onShotSubmit={submitShot}
        />
      </div>

      {/* Bottom HUD: Bat/Bowl Stats & Extras Breakdown */}
      <div className="match-hud-bottom">
        <div className="player-stats">
          <div className="stat-item active">
            <span className="label">BAT:</span>
            <span className="value">
              {striker ? striker.name : 'Batter'} *
            </span>
          </div>
          <div className="stat-item">
            <span className="label">BOWL:</span>
            <span className="value">
              {bowler ? bowler.name : 'Bowler'}
            </span>
          </div>
        </div>

        <div className="extras-breakdown">
          <span className="extra-tag">EXTRAS: {activeInnings.extras?.total || 0}</span>
          <div className="extra-details">
            (W: {activeInnings.extras?.wides || 0}, NB: {activeInnings.extras?.noBalls || 0}, 
             B: {activeInnings.extras?.byes || 0}, LB: {activeInnings.extras?.legByes || 0})
          </div>
        </div>

        <div className="user-role-indicator">
          {isBatting ? (
            <span className="role-bat">YOU ARE BATTING</span>
          ) : (
            <span className="role-bowl">YOU ARE BOWLING</span>
          )}
        </div>
      </div>

      {/* Ball Result Showcase Overlay */}
      {matchState.phase === 'RESULT_SHOWCASE' && matchState.lastOutcome && (
        <div className="ball-result-overlay">
          <div className="result-text animate-pop">
            {matchState.lastOutcome.isWicket 
              ? `WICKET! (${matchState.lastOutcome.wicketType || 'OUT'})` 
              : matchState.lastOutcome.isExtra 
                ? matchState.lastOutcome.extraType 
                : `${matchState.lastOutcome.runs} RUNS`}
          </div>
        </div>
      )}

      {/* Match Finished Modal */}
      {matchState.phase === 'MATCH_OVER' && (
        <div className="match-end-modal">
          <div className="modal-content">
            <h1>MATCH FINISHED</h1>
            <p className="result-summary">
              {matchState.winningMargin 
                ? `${matchState.winnerTeamId} WON ${matchState.winningMargin}` 
                : "MATCH COMPLETED"}
            </p>
            <button onClick={() => window.location.reload()}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchScreen;
