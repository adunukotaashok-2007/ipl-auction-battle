import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import CricketMatchCanvas from './CricketMatchCanvas';
import './MatchScreen.css';

const MatchScreen: React.FC = () => {
  const { matchState, currentTeamId, roomState } = useGame();
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  // Handle Orientation Lock and Warnings
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    // Attempt to lock orientation on mobile devices
    if (typeof window.screen.orientation !== 'undefined' && 'lock' in window.screen.orientation) {
      (window.screen.orientation as any).lock('landscape').catch(() => {
        // Many browsers require full-screen for orientation lock, so we fail silently
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (!matchState || !roomState) return <div className="loading">Initializing Match Engine...</div>;

  const { currentInnings, inningsIndex, targetScore } = matchState;
  const battingTeam = roomState.teams.find(t => t.id === currentInnings.battingTeamId);
  const bowlingTeam = roomState.teams.find(t => t.id === currentInnings.bowlingTeamId);

  // Calculate Run Rates
  const totalBalls = currentInnings.oversCompleted * 6 + currentInnings.ballsInCurrentOver;
  const crr = totalBalls > 0 ? (currentInnings.runs / (totalBalls / 6)).toFixed(2) : "0.00";
  
  let rrr: string | null = null;
  if (inningsIndex === 1 && targetScore) {
    const remainingRuns = targetScore - currentInnings.runs;
    const totalMatchBalls = matchState.oversPerInnings * 6;
    const remainingBalls = totalMatchBalls - totalBalls;
    rrr = remainingBalls > 0 ? (remainingRuns / (remainingBalls / 6)).toFixed(2) : "N/A";
  }

  const isBatting = currentTeamId === currentInnings.battingTeamId;

  return (
    <div className="match-screen">
      {/* Portrait Orientation Overlay */}
      {isPortrait && (
        <div className="portrait-warning-overlay">
          <div className="warning-content">
            <div className="phone-icon">📱</div>
            <h2>PLEASE ROTATE YOUR PHONE</h2>
            <p>Landscape mode is required for the best experience.</p>
          </div>
        </div>
      )}

      {/* Broadcast HUD Top Bar */}
      <div className="match-hud-top">
        <div className="team-score-block batting" style={{ borderBottomColor: battingTeam?.color || '#eee' }}>
          <span className="team-name">{battingTeam?.name}</span>
          <span className="score-main">{currentInnings.runs}/{currentInnings.wickets}</span>
          <span className="overs-sub">({currentInnings.oversCompleted}.{currentInnings.ballsInCurrentOver})</span>
        </div>

        <div className="match-info-center">
          {inningsIndex === 1 && targetScore ? (
            <div className="target-pill">TARGET: {targetScore}</div>
          ) : (
            <div className="inning-pill">1ST INNINGS</div>
          )}
          {currentInnings.isFreeHitActive && (
            <div className="free-hit-banner">FREE HIT!</div>
          )}
        </div>

        <div className="team-score-block bowling" style={{ borderBottomColor: bowlingTeam?.color || '#eee' }}>
          <span className="team-name">{bowlingTeam?.name}</span>
          <div className="run-rates">
            <span>CRR: {crr}</span>
            {rrr && <span>RRR: {rrr}</span>}
          </div>
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="canvas-container">
        <CricketMatchCanvas />
      </div>

      {/* Bottom HUD: Player Stats & Extras */}
      <div className="match-hud-bottom">
        <div className="player-stats">
          <div className="stat-item active">
            <span className="label">BAT:</span>
            <span className="value">
              {currentInnings.striker.name} {currentInnings.striker.runs}({currentInnings.striker.ballsFaced})*
            </span>
          </div>
          <div className="stat-item">
            <span className="label">BOWL:</span>
            <span className="value">
              {currentInnings.currentBowler.name} {currentInnings.currentBowler.wickets}/{currentInnings.currentBowler.runsConceded}
            </span>
          </div>
        </div>

        <div className="extras-breakdown">
          <span className="extra-tag">EXTRAS: {currentInnings.extras.total}</span>
          <div className="extra-details">
            (W: {currentInnings.extras.wides}, NB: {currentInnings.extras.noBalls}, 
             B: {currentInnings.extras.byes}, LB: {currentInnings.extras.legByes})
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

      {/* Over Summary Overlay (Fades in between overs) */}
      {matchState.phase === 'RESULT_SHOWCASE' && (
        <div className="ball-result-overlay">
          <div className="result-text animate-pop">
            {matchState.lastBallResult?.isWicket ? "WICKET!" : 
             matchState.lastBallResult?.extraType ? matchState.lastBallResult.extraType :
             `${matchState.lastBallResult?.runsScored} RUNS`}
          </div>
        </div>
      )}

      {/* Match Finished Modal */}
      {roomState.status === 'FINISHED' && (
        <div className="match-end-modal">
          <div className="modal-content">
            <h1>MATCH FINISHED</h1>
            <p className="result-summary">
              {targetScore && currentInnings.runs >= targetScore 
                ? `${battingTeam?.name} WON BY ${10 - currentInnings.wickets} WICKETS!`
                : `${bowlingTeam?.name} WON BY ${targetScore ? targetScore - 1 - currentInnings.runs : 0} RUNS!`}
            </p>
            <button onClick={() => window.location.reload()}>Back to Lobby</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchScreen;
