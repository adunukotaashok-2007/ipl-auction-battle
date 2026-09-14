// client/src/components/FinishScreen.tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import './FinishScreen.css';

function FinishScreen() {
  const { roomData, myTeamId, isHost, restartAuction, leaveRoom } = useGame();

  if (!roomData) return null;

  const sortedTeams = [...roomData.teams]
    .filter((t) => t.isConnected || t.squadSize > 0)
    .sort((a, b) => {
      // Sort by squad size descending, then by money spent descending
      if (b.squadSize !== a.squadSize) return b.squadSize - a.squadSize;
      return (b.initialPurse - b.purse) - (a.initialPurse - a.purse);
    });

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  return (
    <div className="finish-screen">
      <div className="finish-header">
        <div className="trophy-icon">🏆</div>
        <h1 className="finish-title">AUCTION COMPLETE</h1>
        <p className="finish-subtitle">Final Results</p>
      </div>

      <div className="finish-stats-row">
        <div className="finish-stat">
          <span className="finish-stat-value">{roomData.auction.soldPlayers.length}</span>
          <span className="finish-stat-label">Players Sold</span>
        </div>
        <div className="finish-stat">
          <span className="finish-stat-value">{roomData.auction.unsoldPlayers.length}</span>
          <span className="finish-stat-label">Unsold</span>
        </div>
        <div className="finish-stat">
          <span className="finish-stat-value">{sortedTeams.length}</span>
          <span className="finish-stat-label">Teams</span>
        </div>
      </div>

      <div className="finish-teams">
        {sortedTeams.map((team, index) => {
          const spent = Math.round((team.initialPurse - team.purse) * 100) / 100;
          const roleCounts: Record<string, number> = {};
          team.squad.forEach((p) => {
            roleCounts[p.player.role] = (roleCounts[p.player.role] || 0) + 1;
          });

          return (
            <div
              key={team.id}
              className={`finish-team-card ${team.id === myTeamId ? 'my-finish-team' : ''}`}
              style={{ borderTopColor: team.teamColor }}
            >
              <div className="finish-team-header">
                <span className="finish-medal">{getMedal(index)}</span>
                <div className="finish-team-info">
                  <span className="finish-team-logo">{team.teamLogo}</span>
                  <div>
                    <h3 className="finish-team-name">
                      {team.teamName}
                      {team.id === myTeamId && <span className="finish-you-tag">YOU</span>}
                    </h3>
                    <span className="finish-team-player">{team.playerName}</span>
                  </div>
                </div>
              </div>

              <div className="finish-team-stats">
                <div className="finish-team-stat">
                  <span className="fts-label">Squad</span>
                  <span className="fts-value">{team.squadSize}</span>
                </div>
                <div className="finish-team-stat">
                  <span className="fts-label">Spent</span>
                  <span className="fts-value">₹{spent.toFixed(1)} Cr</span>
                </div>
                <div className="finish-team-stat">
                  <span className="fts-label">Remaining</span>
                  <span className="fts-value fts-green">₹{team.purse.toFixed(1)} Cr</span>
                </div>
              </div>

              {team.squad.length > 0 && (
                <div className="finish-squad-list">
                  {team.squad.map((purchased) => (
                    <div key={purchased.player.id} className="finish-squad-row">
                      <span className="finish-sq-name">{purchased.player.name}</span>
                      <span className="finish-sq-role">{purchased.player.role}</span>
                      <span className="finish-sq-price">₹{purchased.purchasePrice.toFixed(2)} Cr</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="finish-actions">
        {isHost && (
          <button className="btn btn-primary btn-lg" onClick={restartAuction}>
            🔄 New Auction
          </button>
        )}
        <button className="btn btn-secondary btn-lg" onClick={leaveRoom}>
          🚪 Leave Room
        </button>
      </div>
    </div>
  );
}

export default FinishScreen;
