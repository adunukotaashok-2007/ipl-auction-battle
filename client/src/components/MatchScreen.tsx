import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import CricketMatchCanvas from './CricketMatchCanvas';
import { TeamPublicData } from '../types';
import './MatchScreen.css';

export const MatchScreen: React.FC = () => {
  const { matchState, myTeamId, roomData, submitDelivery, submitShot } = useGame();
  const [isPortrait, setIsPortrait] = useState<boolean>(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    if (typeof window.screen.orientation !== 'undefined' && 'lock' in window.screen.orientation) {
      (window.screen.orientation as any).lock('landscape').catch(() => {
        // Silently handled if user interaction is required
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  if (!roomData) {
    return <div className="loading" style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Loading Room Data...</div>;
  }

  // Dual Fallback: Support both matchState and roomData.match
  const match = matchState || (roomData as any).match;

  if (!match) {
    return <div className="loading" style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Initializing Match Engine...</div>;
  }

  // Innings Extraction with fallbacks
  const currentInningsNum = match.currentInnings || 1;
  const rawInnings = match.innings
    ? match.innings[currentInningsNum - 1]
    : currentInningsNum === 1
    ? match.innings1
    : match.innings2;

  if (!rawInnings) {
    return <div className="loading" style={{ color: '#fff', textAlign: 'center', padding: '50px' }}>Loading Innings State...</div>;
  }

  // Normalize Innings Values
  const totalRuns = rawInnings.totalRuns ?? rawInnings.score ?? 0;
  const wickets = rawInnings.wickets ?? 0;
  const legalBalls = rawInnings.legalBalls ?? rawInnings.balls ?? 0;
  const isFreeHit = rawInnings.isFreeHitActive ?? match.isFreeHit ?? false;

  const battingTeamId = rawInnings.battingTeamId || match.battingTeamId || roomData.teams[0]?.id;
  const bowlingTeamId = rawInnings.bowlingTeamId || match.bowlingTeamId || roomData.teams[1]?.id;

  const battingTeam = roomData.teams.find((t: TeamPublicData) => t.id === battingTeamId) || roomData.teams[0];
  const bowlingTeam = roomData.teams.find((t: TeamPublicData) => t.id === bowlingTeamId) || roomData.teams[1];

  // Extract Active Players
  const strikerName = rawInnings.strikerName || 
    (rawInnings.battingLineup?.find((p: any) => p.id === rawInnings.strikerId)?.name) || 
    (battingTeam as any)?.squad?.[0]?.player?.name ||
    (battingTeam as any)?.squad?.[0]?.name || 
    'Striker';

  const bowlerName = rawInnings.bowlerName || 
    (rawInnings.bowlingLineup?.find((p: any) => p.id === rawInnings.currentBowlerId)?.name) || 
    (bowlingTeam as any)?.squad?.[0]?.player?.name ||
    (bowlingTeam as any)?.squad?.[0]?.name || 
    'Bowler';

  // Target Score Calculation
  const firstInningsRuns = match.innings
    ? (match.innings[0]?.score ?? match.innings[0]?.totalRuns ?? 0)
    : (match.innings1?.totalRuns ?? match.innings1?.score ?? 0);

  const targetScore = match.target || (currentInningsNum === 2 ? firstInningsRuns + 1 : null);

  // Overs & Run Rate Calculations
  const totalOvers = match.totalOvers || 5;
  const ballsInCurrentOver = legalBalls % 6;
  const completedOvers = Math.floor(legalBalls / 6);

  const crr = legalBalls > 0 
    ? (totalRuns / (legalBalls / 6)).toFixed(2) 
    : "0.00";

  let rrr: string | null = null;
  if (currentInningsNum === 2 && targetScore) {
    const remainingRuns = Math.max(0, targetScore - totalRuns);
    const maxMatchBalls = totalOvers * 6;
    const remainingBalls = Math.max(0, maxMatchBalls - legalBalls);
    rrr = remainingBalls > 0 ? (remainingRuns / (remainingBalls / 6)).toFixed(2) : "0.00";
  }

  // Extras breakdown
  const extrasObj = rawInnings.extras || {};
  const totalExtras = typeof extrasObj === 'number' ? extrasObj : extrasObj.total || 0;
  const wides = rawInnings.wides ?? extrasObj.wides ?? 0;
  const noBalls = rawInnings.noBalls ?? extrasObj.noBalls ?? 0;
  const byes = rawInnings.byes ?? extrasObj.byes ?? 0;
  const legByes = rawInnings.legByes ?? extrasObj.legByes ?? 0;

  const isBatting = myTeamId === battingTeamId;
  const isBowling = myTeamId === bowlingTeamId;
  const matchPhase = match.phase || 'AWAITING_DELIVERY';

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
          style={{ borderBottomColor: (battingTeam as any)?.teamColor || '#2980b9' }}
        >
          <span className="team-name">{(battingTeam as any)?.teamName || (battingTeam as any)?.name || 'BATTING'}</span>
          <span className="score-main">{totalRuns}/{wickets}</span>
          <span className="overs-sub">({completedOvers}.{ballsInCurrentOver} / {totalOvers} Ov)</span>
        </div>

        <div className="match-info-center">
          {targetScore ? (
            <div className="target-pill">TARGET: {targetScore}</div>
          ) : (
            <div className="inning-pill">1ST INNINGS</div>
          )}
          {isFreeHit && (
            <div className="free-hit-banner">⚡ FREE HIT!</div>
          )}
        </div>

        <div 
          className="team-score-block bowling" 
          style={{ borderBottomColor: (bowlingTeam as any)?.teamColor || '#e74c3c' }}
        >
          <span className="team-name">{(bowlingTeam as any)?.teamName || (bowlingTeam as any)?.name || 'BOWLING'}</span>
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
          phase={matchPhase}
          battingTeamName={(battingTeam as any)?.teamName || (battingTeam as any)?.name || 'Batting Team'}
          bowlingTeamName={(bowlingTeam as any)?.teamName || (bowlingTeam as any)?.name || 'Bowling Team'}
          strikerName={strikerName}
          bowlerName={bowlerName}
          onDeliverySubmit={submitDelivery}
          onShotSubmit={submitShot}
        />
      </div>

      {/* Bottom HUD: Bat/Bowl Stats & Extras Breakdown */}
      <div className="match-hud-bottom">
        <div className="player-stats">
          <div className="stat-item active">
            <span className="label">BAT:</span>
            <span className="value">{strikerName} *</span>
          </div>
          <div className="stat-item">
            <span className="label">BOWL:</span>
            <span className="value">{bowlerName}</span>
          </div>
        </div>

        <div className="extras-breakdown">
          <span className="extra-tag">EXTRAS: {totalExtras}</span>
          <div className="extra-details">
            (W: {wides}, NB: {noBalls}, B: {byes}, LB: {legByes})
          </div>
        </div>

        <div className="user-role-indicator">
          {isBatting ? (
            <span className="role-bat">🏏 YOU ARE BATTING</span>
          ) : (
            <span className="role-bowl">⚡ YOU ARE BOWLING</span>
          )}
        </div>
      </div>

      {/* Ball Result Showcase Overlay */}
      {matchPhase === 'RESULT_SHOWCASE' && match.lastOutcome && (
        <div className="ball-result-overlay">
          <div className="result-text animate-pop">
            {match.lastOutcome.isWicket 
              ? `☝️ WICKET! (${match.lastOutcome.wicketType || 'OUT'})` 
              : match.lastOutcome.isWide 
                ? '↔️ WIDE BALL!' 
                : match.lastOutcome.isNoBall 
                  ? '⚡ NO BALL!' 
                  : `${match.lastOutcome.runs} RUNS`}
          </div>
        </div>
      )}

      {/* Match Finished Modal */}
      {(matchPhase === 'MATCH_OVER' || roomData.gameState === 'FINISHED') && (
        <div className="match-end-modal">
          <div className="modal-content">
            <h1>🏆 MATCH FINISHED</h1>
            <p className="result-summary">
              {match.winningMargin 
                ? `${match.winnerTeamId || 'WINNER'} WON BY ${match.winningMargin}` 
                : "GREAT MATCH! ALL INNINGS COMPLETED"}
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Back to Home</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchScreen;
