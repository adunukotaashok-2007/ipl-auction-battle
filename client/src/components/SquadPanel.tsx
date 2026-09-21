import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TeamPublicData } from '../types';
import './SquadPanel.css';

const SquadPanel: React.FC = () => {
  const { roomData, myTeamId, submitLineup } = useGame();
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (!roomData) return null;

  const teams = roomData.teams || [];
  const myTeam = teams.find((t: TeamPublicData) => t.id === myTeamId) || null;
  const activeTeam = teams.find((t: TeamPublicData) => t.id === (selectedTeamId || myTeamId)) || myTeam || teams[0];

  if (!activeTeam) return null;

  // Safe Purse Extractor
  const getPurseLeft = (team: any): number => {
    if (!team) return 0;
    if (typeof team.purse === 'number') return team.purse;
    if (team.purse && typeof team.purse.remaining === 'number') return team.purse.remaining;
    return 0;
  };

  const formatMoney = (value: number) => {
    if (value > 0 && value < 100000) {
      return `₹${(value / 100).toFixed(2)} Cr`;
    }
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  };

  // Safe Squad Item Normalizer
  const getPlayerData = (item: any) => {
    if (!item) return null;
    const player = item.player ? item.player : item;
    const price = item.purchasePrice ?? item.price ?? item.basePrice ?? player.basePrice ?? 0;
    return { player, price };
  };

  const squadItems = activeTeam.squad || [];

  // Calculate role composition safely
  const roleCounts = {
    'Batsman': 0,
    'Bowler': 0,
    'All-Rounder': 0,
    'Wicket-Keeper': 0
  };

  let totalSpent = 0;

  squadItems.forEach((item: any) => {
    const data = getPlayerData(item);
    if (!data) return;
    const { player, price } = data;
    totalSpent += price;

    const r = (player.role || '').toString().toUpperCase();
    if (r.includes('BAT')) roleCounts['Batsman']++;
    else if (r.includes('BOWL')) roleCounts['Bowler']++;
    else if (r.includes('ALL') || r.includes('ROUND')) roleCounts['All-Rounder']++;
    else if (r.includes('KEEP') || r.includes('WK')) roleCounts['Wicket-Keeper']++;
    else roleCounts['Batsman']++;
  });

  const togglePlayerSelection = (playerId: string) => {
    if (activeTeam.id !== myTeamId) return;
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
      {/* Team Selection Bar */}
      <div className="team-selector-tabs" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
        {teams.map((t: any) => {
          const isSelected = activeTeam.id === t.id;
          const isMe = t.id === myTeamId;
          return (
            <button
              key={t.id}
              type="button"
              className={`team-tab-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedTeamId(t.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                background: isSelected ? '#2563eb' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {t.teamLogo || t.logo || '🏏'} {t.teamName || t.name || t.shortName} {isMe ? '(YOU)' : ''}
            </button>
          );
        })}
      </div>

      <div className="squad-header" style={{ borderLeftColor: (activeTeam as any).teamColor || '#3b82f6' }}>
        <div className="team-title">
          <h2>{(activeTeam as any).teamName || activeTeam.name} Squad</h2>
          <span className="team-owner">
            Manager: {(activeTeam as any).playerName || (activeTeam as any).managerName || 'Owner'}
          </span>
        </div>
        <div className="squad-summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Purse Left</span>
            <span className="stat-val">{formatMoney(getPurseLeft(activeTeam))}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Total Spent</span>
            <span className="stat-val">{formatMoney(totalSpent)}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Players</span>
            <span className="stat-val">{squadItems.length} / {(activeTeam as any).maxSquadSize || 25}</span>
          </div>
        </div>
      </div>

      <div className="roles-bar">
        <span className="role-badge">BAT: {roleCounts['Batsman']}</span>
        <span className="role-badge">BOWL: {roleCounts['Bowler']}</span>
        <span className="role-badge">AR: {roleCounts['All-Rounder']}</span>
        <span className="role-badge">WK: {roleCounts['Wicket-Keeper']}</span>
      </div>

      {roomData.gameState === 'LINEUP_SELECTION' && activeTeam.id === myTeamId && (
        <div className="lineup-selection-controls">
          <h3>Select Playing XI (Selected: {selectedPlayerIds.length})</h3>
          <button 
            className="submit-lineup-btn"
            disabled={selectedPlayerIds.length < 2}
            onClick={handleSubmitLineup}
          >
            {(activeTeam as any).lineupSubmitted ? 'Update Playing Lineup' : 'Confirm Playing Lineup'}
          </button>
        </div>
      )}

      <div className="squad-grid">
        {squadItems.length === 0 ? (
          <div className="empty-squad-msg">No players bought yet.</div>
        ) : (
          squadItems.map((item: any, index: number) => {
            const data = getPlayerData(item);
            if (!data) return null;
            const { player, price } = data;
            const isSelected = selectedPlayerIds.includes(player.id);

            return (
              <div 
                key={player.id || index} 
                className={`squad-card ${isSelected ? 'selected' : ''}`}
                onClick={() => roomData.gameState === 'LINEUP_SELECTION' && togglePlayerSelection(player.id)}
              >
                <div className="card-top">
                  <span className="player-role-tag">{player.role}</span>
                  <span className="player-country">{player.isOverseas ? '✈️ Overseas' : '🇮🇳 Indian'}</span>
                </div>
                <div className="player-name-main">{player.name}</div>
                <div className="ratings-row">
                  <span>BAT: {player.stats?.runs || player.battingRating || 80}</span>
                  <span>BOWL: {player.stats?.wickets || player.bowlingRating || 80}</span>
                </div>
                <div className="purchase-price-tag">
                  Bought for {formatMoney(price)}
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
