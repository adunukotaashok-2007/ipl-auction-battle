import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PurchasedPlayer, TeamPublicData } from '../types';
import './SquadPanel.css';

const SquadPanel: React.FC = () => {
  const { roomData, myTeamId, submitLineup } = useGame();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  if (!roomData || !myTeamId) return null;

  const myTeam = roomData.teams.find((t: TeamPublicData) => t.id === myTeamId);
  if (!myTeam) return null;

  // Calculate role composition safely
  const roleCounts: Record<'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper', number> = {
    'Batsman': 0,
    'Bowler': 0,
    'All-Rounder': 0,
    'Wicket-Keeper': 0
  };

  myTeam.squad.forEach((item: PurchasedPlayer) => {
    if (roleCounts[item.player.role] !== undefined) {
      roleCounts[item.player.role] += 1;
    }
  });

  const totalSpent = myTeam.squad.reduce((sum: number, item: PurchasedPlayer) => sum + item.purchasePrice, 0);

  const togglePlayerSelection = (playerId: string) => {
    if (selectedPlayerIds.includes(playerId)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, playerId]);
    }
  };

  const handleSubmitLineup = () => {
    if (selectedPlayerIds.length >= 2) {
      submitLineup(selectedPlayerIds);
    }
  };

  return (
    <div className="squad-panel">
      <div className="squad-header" style={{ borderLeftColor: myTeam.teamColor }}>
        <div className="team-title">
          <h2>{myTeam.teamName} Squad</h2>
          <span className="team-owner">Owner: {myTeam.playerName}</span>
        </div>
        <div className="squad-summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Purse Left</span>
            <span className="stat-val">₹{(myTeam.purse / 100).toFixed(2)} Cr</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Total Spent</span>
            <span className="stat-val">₹{(totalSpent / 100).toFixed(2)} Cr</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Players</span>
            <span className="stat-val">{myTeam.squad.length} / {myTeam.maxSquadSize}</span>
          </div>
        </div>
      </div>

      <div className="roles-bar">
        <span className="role-badge">Batsmen: {roleCounts['Batsman']}</span>
        <span className="role-badge">Bowlers: {roleCounts['Bowler']}</span>
        <span className="role-badge">All-Rounders: {roleCounts['All-Rounder']}</span>
        <span className="role-badge">WK: {roleCounts['Wicket-Keeper']}</span>
      </div>

      {roomData.gameState === 'LINEUP_SELECTION' && (
        <div className="lineup-selection-controls">
          <h3>Select Playing XI (Selected: {selectedPlayerIds.length})</h3>
          <button 
            className="submit-lineup-btn"
            disabled={selectedPlayerIds.length < 2}
            onClick={handleSubmitLineup}
          >
            {myTeam.lineupSubmitted ? 'Update Playing Lineup' : 'Confirm Playing Lineup'}
          </button>
        </div>
      )}

      <div className="squad-grid">
        {myTeam.squad.length === 0 ? (
          <div className="empty-squad-msg">No players bought yet.</div>
        ) : (
          myTeam.squad.map((item: PurchasedPlayer, index: number) => {
            const isSelected = selectedPlayerIds.includes(item.player.id);
            return (
              <div 
                key={item.player.id || index} 
                className={`squad-card ${isSelected ? 'selected' : ''}`}
                onClick={() => roomData.gameState === 'LINEUP_SELECTION' && togglePlayerSelection(item.player.id)}
              >
                <div className="card-top">
                  <span className="player-role-tag">{item.player.role}</span>
                  <span className="player-country">{item.player.country}</span>
                </div>
                <div className="player-name-main">{item.player.name}</div>
                <div className="ratings-row">
                  <span>BAT: {item.player.battingRating}</span>
                  <span>BOWL: {item.player.bowlingRating}</span>
                </div>
                <div className="purchase-price-tag">
                  Bought for ₹{(item.purchasePrice / 100).toFixed(2)} Cr
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SquadPanel;
