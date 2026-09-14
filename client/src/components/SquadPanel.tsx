// client/src/components/SquadPanel.tsx
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TeamPublicData } from '../types';
import './SquadPanel.css';

function SquadPanel() {
  const { roomData, myTeamId } = useGame();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (!roomData) return null;

  const viewTeamId = selectedTeamId || myTeamId;
  const viewTeam = roomData.teams.find((t) => t.id === viewTeamId);

  if (!viewTeam) return null;

  const roleCounts = {
    Batsman: 0,
    Bowler: 0,
    'All-Rounder': 0,
    'Wicket-Keeper': 0,
  };

  viewTeam.squad.forEach((p) => {
    if (roleCounts[p.player.role] !== undefined) {
      roleCounts[p.player.role]++;
    }
  });

  const totalSpent = viewTeam.squad.reduce((sum, p) => sum + p.purchasePrice, 0);

  return (
    <div className="squad-panel">
      <div className="squad-team-selector">
        {roomData.teams
          .filter((t) => t.isConnected)
          .map((team) => (
            <button
              key={team.id}
              className={`squad-tab ${(viewTeamId === team.id) ? 'active' : ''}`}
              onClick={() => setSelectedTeamId(team.id)}
              style={{
                borderBottomColor: viewTeamId === team.id ? team.teamColor : 'transparent',
              }}
            >
              {team.teamLogo} {team.teamShortName}
            </button>
          ))}
      </div>

      <div className="squad-header">
        <div className="squad-team-name">
          {viewTeam.teamLogo} {viewTeam.teamName}
          {viewTeam.id === myTeamId && <span className="squad-you-tag">YOU</span>}
        </div>
        <div className="squad-meta">
          <span>Purse: <strong>₹{viewTeam.purse.toFixed(2)} Cr</strong></span>
          <span>Spent: <strong>₹{totalSpent.toFixed(2)} Cr</strong></span>
          <span>Squad: <strong>{viewTeam.squadSize}/{viewTeam.maxSquadSize}</strong></span>
        </div>
      </div>

      <div className="role-counts">
        <div className="role-chip">🏏 BAT: {roleCounts.Batsman}</div>
        <div className="role-chip">🎳 BOWL: {roleCounts.Bowler}</div>
        <div className="role-chip">⚡ AR: {roleCounts['All-Rounder']}</div>
        <div className="role-chip">🧤 WK: {roleCounts['Wicket-Keeper']}</div>
      </div>

      <div className="squad-list">
        {viewTeam.squad.length === 0 ? (
          <div className="squad-empty">No players purchased yet</div>
        ) : (
          viewTeam.squad.map((purchased, index) => (
            <div key={purchased.player.id} className="squad-player-row">
              <span className="squad-player-num">{index + 1}</span>
              <div className="squad-player-info">
                <span className="squad-player-name">{purchased.player.name}</span>
                <span className="squad-player-role">{purchased.player.role} • {purchased.player.country}</span>
              </div>
              <span className="squad-player-price">₹{purchased.purchasePrice.toFixed(2)} Cr</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SquadPanel;
