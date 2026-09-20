import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './FinishScreen.css';

const FinishScreen: React.FC = () => {
  const { roomState, currentTeamId, startMatch, error } = useGame();
  const [selectedOvers, setSelectedOvers] = useState<number>(2);

  if (!roomState) return null;

  const teams = roomState.teams;
  const isHost = roomState.hostId === currentTeamId;

  // Check if all teams have submitted a valid lineup (minimum 2 players for a match)
  const allLineupsSubmitted = teams.every(t => t.lineup && t.lineup.length >= 2);
  const myTeam = teams.find(t => t.id === currentTeamId);
  const hasSubmittedLineup = myTeam?.lineup && myTeam.lineup.length >= 2;

  const handleStartMatch = () => {
    if (allLineupsSubmitted) {
      startMatch(selectedOvers);
    }
  };

  // Sort teams by budget remaining or squad size for a "leaderboard" feel
  const sortedTeams = [...teams].sort((a, b) => b.budget - a.budget);

  return (
    <div className="finish-screen">
      <div className="finish-container">
        <h1>Auction Completed!</h1>
        <p className="subtitle">Final Team Standings</p>

        <div className="rankings-list">
          {sortedTeams.map((team, index) => (
            <div key={team.id} className={`rank-card ${team.id === currentTeamId ? 'my-team' : ''}`}>
              <div className="rank-pos">#{index + 1}</div>
              <div className="rank-info">
                <h3>{team.name}</h3>
                <p>Players: {team.squad.length} | Budget Left: ₹{(team.budget / 100).toFixed(2)} Cr</p>
                <div className="lineup-status">
                  {team.lineup && team.lineup.length >= 2 ? (
                    <span className="status-ready">Lineup Ready ✓</span>
                  ) : (
                    <span className="status-waiting">Selecting Lineup...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="match-controls">
          {isHost ? (
            <div className="host-panel">
              <h3>Match Configuration (Host)</h3>
              <div className="overs-selector">
                <label>Select Overs:</label>
                <select 
                  value={selectedOvers} 
                  onChange={(e) => setSelectedOvers(parseInt(e.target.value))}
                  disabled={!allLineupsSubmitted}
                >
                  <option value={2}>2 Overs</option>
                  <option value={5}>5 Overs</option>
                  <option value={10}>10 Overs</option>
                  <option value={20}>20 Overs</option>
                </select>
              </div>

              {!allLineupsSubmitted && (
                <p className="warning-text">Waiting for all teams to submit lineups (min 2 players)...</p>
              )}

              <button 
                className="start-match-btn"
                onClick={handleStartMatch}
                disabled={!allLineupsSubmitted}
              >
                START CRICKET MATCH
              </button>
            </div>
          ) : (
            <div className="guest-panel">
              {!hasSubmittedLineup ? (
                <p className="instruction">Please finalize your lineup in the Squad Panel!</p>
              ) : (
                <p className="instruction">Waiting for the host to start the match...</p>
              )}
            </div>
          )}
        </div>

        {error && <div className="error-toast">{error}</div>}
      </div>
    </div>
  );
};

export default FinishScreen;
