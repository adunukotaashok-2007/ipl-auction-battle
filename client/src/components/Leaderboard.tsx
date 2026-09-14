// client/src/components/Leaderboard.tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import './Leaderboard.css';

function Leaderboard() {
  const { roomData, myTeamId } = useGame();

  if (!roomData) return null;

  const sortedTeams = [...roomData.teams]
    .filter((t) => t.isConnected)
    .sort((a, b) => b.squadSize - a.squadSize || (a.initialPurse - a.purse) - (b.initialPurse - b.purse));

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">📊 Auction Standings</h3>

      <div className="leaderboard-list">
        {sortedTeams.map((team, index) => {
          const spent = Math.round((team.initialPurse - team.purse) * 100) / 100;
          return (
            <div
              key={team.id}
              className={`lb-row ${team.id === myTeamId ? 'lb-my-team' : ''}`}
            >
              <div className="lb-rank">{index + 1}</div>
              <div className="lb-team-info">
                <span className="lb-logo">{team.teamLogo}</span>
                <div className="lb-team-details">
                  <span className="lb-team-name">
                    {team.teamShortName}
                    {team.id === myTeamId && <span className="lb-you">(You)</span>}
                  </span>
                  <span className="lb-squad-size">{team.squadSize} players</span>
                </div>
              </div>
              <div className="lb-money">
                <span className="lb-purse">₹{team.purse.toFixed(1)} Cr</span>
                <span className="lb-spent">Spent: ₹{spent.toFixed(1)} Cr</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="auction-progress">
        <div className="progress-label">
          Auction Progress: {roomData.auction.auctionedPlayerIds.length}/{roomData.auction.totalPlayers}
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${(roomData.auction.auctionedPlayerIds.length / roomData.auction.totalPlayers) * 100}%`,
            }}
          ></div>
        </div>
        <div className="progress-stats">
          <span>✅ Sold: {roomData.auction.soldPlayers.length}</span>
          <span>❌ Unsold: {roomData.auction.unsoldPlayers.length}</span>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
