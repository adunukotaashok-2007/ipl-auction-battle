import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TeamPublicData, PurchasedPlayer } from '../types';
import './FinishScreen.css';

export const FinishScreen: React.FC = () => {
  const { roomData, myTeamId, submitLineup, startMatch, error } = useGame();
  const [selectedOvers, setSelectedOvers] = useState<number>(2);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  if (!roomData) return null;

  const teams = roomData.teams;
  const isHost = roomData.hostId === myTeamId;
  const myTeam = teams.find((t: TeamPublicData) => t.id === myTeamId);

  // Check if all active teams have submitted their lineups
  const allLineupsSubmitted = teams.every((t: TeamPublicData) => t.lineupSubmitted);

  // Handle player selection for Playing XI
  const togglePlayerSelection = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleConfirmLineup = () => {
    if (selectedPlayerIds.length >= 2) {
      submitLineup(selectedPlayerIds);
    }
  };

  const handleStartMatch = () => {
    if (allLineupsSubmitted) {
      startMatch(selectedOvers);
    }
  };

  // Sort teams by remaining purse / squad strength
  const sortedTeams = [...teams].sort((a, b) => b.purse - a.purse);

  return (
    <div className="finish-screen">
      <div className="finish-overlay" />
      <div className="finish-container">
        
        {/* Header */}
        <div className="finish-header">
          <div className="trophy-badge">🏆</div>
          <h1 className="finish-title">AUCTION COMPLETED</h1>
          <p className="finish-subtitle">Final Leaderboard & Match Setup</p>
        </div>

        {/* Team Leaderboard Rankings */}
        <div className="rankings-container">
          <h2 className="section-heading">Team Standings</h2>
          <div className="rankings-grid">
            {sortedTeams.map((team: TeamPublicData, index: number) => {
              const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
              const isMyTeam = team.id === myTeamId;

              return (
                <div 
                  key={team.id} 
                  className={`rank-card ${isMyTeam ? 'is-me' : ''}`}
                  style={{ borderLeftColor: team.teamColor }}
                >
                  <div className="rank-badge">{rankIcon}</div>
                  <div className="team-details">
                    <div className="team-title-row">
                      <span className="team-logo">{team.teamLogo}</span>
                      <span className="team-name">{team.teamName}</span>
                      <span className="manager-tag">({team.playerName})</span>
                    </div>
                    <div className="team-stats-row">
                      <span>Squad: <strong>{team.squad.length}</strong></span>
                      <span className="dot">•</span>
                      <span>Purse Left: <strong>₹{(team.purse / 100).toFixed(2)} Cr</strong></span>
                    </div>
                  </div>

                  <div className="status-indicator">
                    {team.lineupSubmitted ? (
                      <span className="badge-ready">READY ✓</span>
                    ) : (
                      <span className="badge-pending">SELECTING...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* In-Screen Lineup Selection (If My Lineup Not Submitted) */}
        {myTeam && (
          <div className="lineup-builder-card" style={{ borderColor: myTeam.teamColor }}>
            <div className="builder-header">
              <h3>
                🏏 Select Your Playing XI ({myTeam.teamName})
              </h3>
              <p>Tap players to include in your active squad (Min 2 players required)</p>
            </div>

            {myTeam.squad.length === 0 ? (
              <p className="empty-squad-notice">No players bought during auction.</p>
            ) : (
              <div className="squad-selector-grid">
                {myTeam.squad.map((item: PurchasedPlayer, idx: number) => {
                  const player = item.player;
                  const isSelected = selectedPlayerIds.includes(player.id);

                  return (
                    <div
                      key={player.id || idx}
                      className={`squad-select-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() => togglePlayerSelection(player.id)}
                    >
                      <span className="pill-role">{player.role.substring(0, 3)}</span>
                      <span className="pill-name">{player.name}</span>
                      <span className="pill-check">{isSelected ? '✓' : '+'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="builder-footer">
              <span className="selected-count">
                Selected: <strong>{selectedPlayerIds.length}</strong> / {myTeam.squad.length}
              </span>
              <button
                className="confirm-lineup-btn"
                disabled={selectedPlayerIds.length < 2}
                onClick={handleConfirmLineup}
              >
                {myTeam.lineupSubmitted ? 'UPDATE PLAYING XI' : 'CONFIRM PLAYING XI ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Host Control / Guest Notice Section */}
        <div className="match-launcher-card">
          {isHost ? (
            <div className="host-launcher-panel">
              <div className="launcher-settings">
                <label className="overs-label">MATCH OVERS:</label>
                <div className="overs-btn-group">
                  {[2, 5, 10, 20].map((ov) => (
                    <button
                      key={ov}
                      className={`over-btn ${selectedOvers === ov ? 'active' : ''}`}
                      onClick={() => setSelectedOvers(ov)}
                    >
                      {ov} OVERS
                    </button>
                  ))}
                </div>
              </div>

              {!allLineupsSubmitted && (
                <div className="waiting-banner">
                  ⏳ Waiting for all managers to confirm their Playing XI...
                </div>
              )}

              <button
                className="start-match-btn"
                disabled={!allLineupsSubmitted}
                onClick={handleStartMatch}
              >
                🚀 START CRICKET MATCH ({selectedOvers} OVERS)
              </button>
            </div>
          ) : (
            <div className="guest-launcher-panel">
              {myTeam?.lineupSubmitted ? (
                <div className="guest-waiting-msg">
                  <span className="pulse-dot" /> Waiting for the Host to launch the match...
                </div>
              ) : (
                <div className="guest-action-msg">
                  ⚠️ Please select and confirm your Playing XI above!
                </div>
              )}
            </div>
          )}
        </div>

        {error && <div className="finish-error-toast">⚠️ {error}</div>}
      </div>
    </div>
  );
};

export default FinishScreen;
