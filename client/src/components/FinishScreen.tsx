// client/src/components/FinishScreen.tsx
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PurchasedPlayer } from '../types';
import './FinishScreen.css';

function FinishScreen() {
  const {
    roomData,
    myTeamId,
    myTeam,
    isHost,
    restartAuction,
    leaveRoom,
    submitLineup,
    startMatch,
  } = useGame();

  // Local state for lineup building
  const [selectedXI, setSelectedXI] = useState<string[]>([]);
  const [impactPlayerId, setImpactPlayerId] = useState<string | null>(null);
  const [hasSubmittedLocal, setHasSubmittedLocal] = useState(false);

  if (!roomData) return null;

  // Sync submission status with server data (resilient to page reload)
  const isSubmitted = hasSubmittedLocal || myTeam?.lineupSubmitted || false;

  const mySquad = myTeam?.squad || [];
  const totalSquadCount = mySquad.length;

  // Track overseas players in XI
  const selectedOverseasCount = mySquad.filter(
    (item) => selectedXI.includes(item.player.id) && item.player.country !== 'India'
  ).length;

  // Toggle selection for Playing XI
  const togglePlayerXI = (playerId: string) => {
    if (selectedXI.includes(playerId)) {
      setSelectedXI((prev) => prev.filter((id) => id !== playerId));
      return;
    }

    if (selectedXI.length >= 11) {
      alert('You can only select up to 11 players for your Playing XI!');
      return;
    }

    // If this player was chosen as Impact Player, remove from Impact
    if (impactPlayerId === playerId) {
      setImpactPlayerId(null);
    }

    setSelectedXI((prev) => [...prev, playerId]);
  };

  // Toggle selection for Impact Player
  const toggleImpactPlayer = (playerId: string) => {
    if (selectedXI.includes(playerId)) {
      alert('Impact Player cannot be a part of the Playing XI!');
      return;
    }

    if (impactPlayerId === playerId) {
      setImpactPlayerId(null);
    } else {
      setImpactPlayerId(playerId);
    }
  };

  // Submit Lineup to Server
  const handleSubmitLineup = () => {
    const minRequired = Math.min(11, totalSquadCount);

    if (selectedXI.length < minRequired) {
      alert(`Please select ${minRequired} players for your Playing XI.`);
      return;
    }

    if (selectedOverseasCount > 4) {
      alert('Maximum 4 Overseas players allowed in Playing XI!');
      return;
    }

    submitLineup(selectedXI, impactPlayerId);
    setHasSubmittedLocal(true);
  };

  const getMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  // Display Leaderboard if rankings are available
  const hasRankings = roomData.rankings && roomData.rankings.length > 0;

  // Check if all connected teams with squads have submitted lineups
  const allTeamsSubmitted = roomData.teams
    .filter((t) => t.isConnected && t.squadSize > 0)
    .every((t) => t.lineupSubmitted);

  return (
    <div className="finish-screen">
      <div className="finish-header">
        <div className="trophy-icon">🏆</div>
        <h1 className="finish-title">AUCTION COMPLETE</h1>
        <p className="finish-subtitle">
          {hasRankings ? 'Team Rankings & Playing XIs' : 'Select your Playing XI & Impact Player'}
        </p>
      </div>

      {/* PHASE 1: LINEUP SELECTION */}
      {!isSubmitted && (
        <div className="lineup-selection-box">
          <h2>🏏 Build Your Match Squad ({myTeam?.teamName})</h2>
          <div className="lineup-stats">
            <span className={`stat-badge ${selectedXI.length === Math.min(11, totalSquadCount) ? 'valid' : ''}`}>
              Playing XI: {selectedXI.length}/{Math.min(11, totalSquadCount)}
            </span>
            <span className={`stat-badge ${selectedOverseasCount <= 4 ? 'valid' : 'invalid'}`}>
              Overseas in XI: {selectedOverseasCount}/4
            </span>
            <span className={`stat-badge ${impactPlayerId ? 'valid' : ''}`}>
              Impact Player: {impactPlayerId ? 'Selected' : 'None'}
            </span>
          </div>

          <div className="squad-selection-list">
            {mySquad.map(({ player }: PurchasedPlayer) => {
              const inXI = selectedXI.includes(player.id);
              const isImpact = impactPlayerId === player.id;
              const isOverseas = player.country !== 'India';

              return (
                <div
                  key={player.id}
                  className={`squad-select-card ${inXI ? 'selected-xi' : ''} ${isImpact ? 'selected-impact' : ''}`}
                >
                  <div className="player-details">
                    <span className="player-name">
                      {player.name} {isOverseas ? '✈️' : ''}
                    </span>
                    <span className="player-role">{player.role} | Rating: ⭐{player.rating}</span>
                  </div>

                  <div className="selection-buttons">
                    <button
                      className={`btn-select ${inXI ? 'btn-active' : ''}`}
                      onClick={() => togglePlayerXI(player.id)}
                    >
                      {inXI ? 'In XI ✓' : '+ Add XI'}
                    </button>
                    <button
                      className={`btn-select impact ${isImpact ? 'btn-impact-active' : ''}`}
                      disabled={inXI}
                      onClick={() => toggleImpactPlayer(player.id)}
                    >
                      {isImpact ? 'Impact ⭐' : 'Impact'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="btn btn-primary btn-lg submit-lineup-btn"
            onClick={handleSubmitLineup}
          >
            🚀 Submit XI & Impact Player
          </button>
        </div>
      )}

      {/* PHASE 2: WAITING FOR OTHERS */}
      {isSubmitted && !allTeamsSubmitted && (
        <div className="waiting-box">
          <h2>⏳ Lineup Submitted!</h2>
          <p>Waiting for remaining teams to submit their lineups...</p>
        </div>
      )}

      {/* PHASE 3: START REALISTIC MATCH BUTTON (Host Only) */}
      {isSubmitted && allTeamsSubmitted && isHost && (
        <div className="start-match-box">
          <h2>🎉 All Lineups Submitted!</h2>
          <p>You are the Host. Start the live cricket match now!</p>
          <button
            className="btn-start-match"
            onClick={startMatch}
          >
            🏏 START REALISTIC MATCH (2 Overs)
          </button>
        </div>
      )}

      {/* PHASE 3B: NON-HOST WAITING FOR MATCH TO START */}
      {isSubmitted && allTeamsSubmitted && !isHost && !hasRankings && (
        <div className="waiting-box">
          <h2>⏳ Waiting for Host</h2>
          <p>The host will start the live cricket match shortly...</p>
        </div>
      )}

      {/* PHASE 4: FINAL LEADERBOARD (After match ends OR rankings calculated) */}
      {hasRankings && (
        <div className="finish-teams">
          {roomData.rankings?.map((team) => (
            <div
              key={team.teamId}
              className={`finish-team-card ${team.teamId === myTeamId ? 'my-finish-team' : ''}`}
              style={{ borderTopColor: team.teamColor }}
            >
              <div className="finish-team-header">
                <span className="finish-medal">{getMedal(team.rank)}</span>
                <div className="finish-team-info">
                  <div>
                    <h3 className="finish-team-name">
                      {team.teamName} ({team.teamShortName})
                      {team.teamId === myTeamId && <span className="finish-you-tag">YOU</span>}
                    </h3>
                  </div>
                </div>
                <div className="team-score-badge">
                  <span>Score</span>
                  <strong>{team.score} PTS</strong>
                </div>
              </div>

              {team.isValidLineup ? (
                <div className="lineup-summary">
                  <h4>Playing XI ({team.playingXI.length})</h4>
                  <div className="xi-tags">
                    {team.playingXI.map((p) => (
                      <span key={p.id} className="xi-tag">
                        {p.name} ({p.role})
                      </span>
                    ))}
                  </div>

                  {team.impactPlayer && (
                    <div className="impact-summary">
                      <strong>Impact Player:</strong> {team.impactPlayer.name} ⭐
                    </div>
                  )}
                </div>
              ) : (
                <div className="lineup-error">
                  ⚠️ Invalid Lineup: {team.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
