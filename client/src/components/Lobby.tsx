// client/src/components/Lobby.tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import './Lobby.css';

function Lobby() {
  const { roomData, myTeamId, isHost, toggleReady, startAuction, leaveRoom } = useGame();

  if (!roomData) return null;

  const connectedTeams = roomData.teams.filter((t) => t.isConnected);
  const allReady = connectedTeams.length >= 2 && connectedTeams.every((t) => t.isReady || t.isHost);
  const myTeam = roomData.teams.find((t) => t.id === myTeamId);

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1 className="lobby-title">🏏 AUCTION LOBBY</h1>
        <div className="room-code-display">
          <span className="room-code-label">Room Code</span>
          <span className="room-code-value">{roomData.code}</span>
          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(roomData.code);
            }}
          >
            📋
          </button>
        </div>
      </div>

      <div className="lobby-info">
        <div className="info-chip">
          <span>👥</span> {connectedTeams.length}/{roomData.settings.maxPlayers} Players
        </div>
        <div className="info-chip">
          <span>💰</span> ₹{roomData.settings.initialPurse} Cr Purse
        </div>
        <div className="info-chip">
          <span>🏏</span> {roomData.auction.totalPlayers} Players
        </div>
      </div>

      <div className="teams-list">
        <h2 className="teams-list-title">Teams</h2>
        {roomData.teams.map((team) => (
          <div
            key={team.id}
            className={`team-row ${team.id === myTeamId ? 'my-team' : ''} ${!team.isConnected ? 'disconnected' : ''}`}
            style={{ borderLeftColor: team.teamColor }}
          >
            <div className="team-row-left">
              <span className="team-row-logo">{team.teamLogo}</span>
              <div className="team-row-info">
                <span className="team-row-name">{team.teamName}</span>
                <span className="team-row-player">{team.playerName}</span>
              </div>
            </div>
            <div className="team-row-right">
              {team.isHost && <span className="host-badge">👑 HOST</span>}
              {!team.isConnected && <span className="dc-badge">OFFLINE</span>}
              {team.isConnected && !team.isHost && (
                <span className={`ready-badge ${team.isReady ? 'ready' : 'not-ready'}`}>
                  {team.isReady ? '✅ READY' : '⏳ NOT READY'}
                </span>
              )}
              {team.id === myTeamId && <span className="you-badge">YOU</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="lobby-actions">
        {!isHost && myTeam && (
          <button
            className={`btn btn-lg btn-full ${myTeam.isReady ? 'btn-danger' : 'btn-primary'}`}
            onClick={toggleReady}
          >
            {myTeam.isReady ? '❌ Cancel Ready' : '✅ Ready Up'}
          </button>
        )}

        {isHost && (
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={startAuction}
            disabled={!allReady || connectedTeams.length < 2}
          >
            🏏 Start Auction
            {connectedTeams.length < 2 && ' (Need 2+ players)'}
          </button>
        )}

        <button className="btn btn-secondary btn-sm" onClick={leaveRoom}>
          🚪 Leave Room
        </button>
      </div>
    </div>
  );
}

export default Lobby;
