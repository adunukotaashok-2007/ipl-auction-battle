import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './FinishScreen.css';

export const FinishScreen: React.FC = () => {
  const { roomState, currentTeamId, startMatch } = useGame();
  const [selectedOvers, setSelectedOvers] = useState<number>(2);

  if (!roomState) return null;

  const isHost = roomState.hostId === currentTeamId;
  const activeTeams = roomState.teams.filter((t) => t.isConnected && t.squad.length > 0);

  const canStartMatch = activeTeams.length >= 2 && activeTeams.every((t) => t.lineupSubmitted);
  const hasInvalidLineups = activeTeams.some((t) => t.lineupSubmitted && (!t.lineup || t.lineup.playingXI.length < 2));

  return (
    <div className="finish-screen fade-in">
      <div className="finish-header">
        <h1>🏆 AUCTION COMPLETE</h1>
        <p>Team Rankings & Playing XIs</p>
      </div>

      <div className="match-start-panel">
        <div className="panel-content">
          <h2>🎉 All Lineups Submitted!</h2>
          <p>
            {isHost
              ? 'You are the Host. Select overs and start the live cricket match!'
              : 'Waiting for the host to start the match...'}
          </p>

          {isHost && (
            <div className="match-settings" style={{ margin: '15px 0' }}>
              <label htmlFor="overs-select" style={{ color: '#94a3b8', marginRight: '10px' }}>Match Length:</label>
              <select 
                id="overs-select" 
                value={selectedOvers} 
                onChange={(e) => setSelectedOvers(Number(e.target.value))}
                style={{ padding: '8px', borderRadius: '5px', background: '#1e293b', color: 'white', border: '1px solid #475569' }}
              >
                <option value={2}>2 Overs (Quick Test)</option>
                <option value={5}>5 Overs (T5 Blitz)</option>
                <option value={10}>10 Overs (T10)</option>
                <option value={20}>20 Overs (T20 Pro)</option>
              </select>
            </div>
          )}

          {hasInvalidLineups && isHost && (
            <div className="error-banner" style={{ color: '#ef4444', marginBottom: '15px' }}>
              ⚠️ Cannot start match: One or more teams submitted fewer than 2 players.
            </div>
          )}

          <button
            type="button"
            className="action-btn"
            style={{ padding: '12px 24px', background: canStartMatch && !hasInvalidLineups ? '#16a34a' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: canStartMatch && !hasInvalidLineups ? 'pointer' : 'not-allowed', fontSize: '1.1rem', fontWeight: 'bold' }}
            onClick={() => startMatch(selectedOvers)}
            disabled={!canStartMatch || !isHost || hasInvalidLineups}
          >
            {!canStartMatch
              ? 'Waiting for all teams...'
              : `🏏 START MATCH (${selectedOvers} OVERS)`}
          </button>
        </div>
      </div>

      <div className="rankings-list" style={{ marginTop: '30px' }}>
        {roomState.rankings?.map((team) => (
          <div key={team.teamId} className="ranking-card" style={{ background: '#1e293b', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid #334155' }}>
            <h3 style={{ color: team.teamColor }}>{team.teamName} {team.teamId === currentTeamId ? '(YOU)' : ''}</h3>
            <p style={{ color: '#cbd5e1' }}>Score: {team.score} PTS</p>
            <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#94a3b8' }}>
              Playing XI: {team.playingXI.map(p => p.name).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
