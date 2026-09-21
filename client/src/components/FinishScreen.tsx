import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { TeamPublicData } from '../types';
import './FinishScreen.css';

const FinishScreen: React.FC = () => {
  const { roomData, myTeamId, startMatch, error } = useGame();
  const [selectedOvers, setSelectedOvers] = useState<number>(2);

  if (!roomData) return null;

  const teams = roomData.teams;
  const isHost = roomData.hostId === myTeamId;

  // Check if all teams submitted lineups
  const allLineupsSubmitted = teams.every((t: TeamPublicData) => t.lineupSubmitted);
  const myTeam = teams.find((t: TeamPublicData) => t.id === myTeamId);

  const handleStartMatch = () => {
    if (allLineupsSubmitted) {
      startMatch(selectedOvers);
    }
  };

  const sortedTeams = [...teams].sort((a, b) => b.purse - a.purse);

  return (
    <div className="finish-screen">
      <div className="finish-container">
        <h1>Auction Completed!</h1>
        <p className="subtitle">Final Team Standings</p>

        <div className="rankings-list">
          {sortedTeams.map((team: TeamPublicData, index: number) => (
            <div key={team.id} className={`rank-card ${team.id === myTeamId ? 'my-team' : ''}`}>
              <div className="rank-pos">#{index + 1}</div>
              <div className="rank-info">
                <h3>{team.teamName} ({team.playerName})</h3>
                <p>Squad Size: {team.squad.length} | Purse Left: ₹{(team.purse / 100).toFixed(2)} Cr</p>
                <div className="lineup-status">
                  {team.lineupSubmitted ? (
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
                <p className="warning-text">Waiting for all teams to submit their Playing XI...</p>
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
              {!myTeam?.lineupSubmitted ? (
                <p className="instruction">Please finalize your lineup in the Squad Panel!</p>
              ) : (
                <p className="instruction">Waiting for host to configure overs and start match...</p>
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
