// client/src/components/Lobby.tsx

import React from 'react';
import { useGame } from '../context/GameContext';
import './Lobby.css';

function Lobby() {
  const {
    roomData,
    myTeamId,
    isHost,
    toggleReady,
    startAuction,
    leaveRoom,
  } = useGame();

  if (!roomData) return null;

  const connectedTeams = roomData.teams.filter(
    (team) => team.isConnected
  );

  const allReady =
    connectedTeams.length >= 2 &&
    connectedTeams.every(
      (team) => team.isReady || team.isHost
    );

  const myTeam = roomData.teams.find(
    (team) => team.id === myTeamId
  );

  return (
    <div className="lobby">

      {/* =====================================================
          LOBBY HEADER
          ===================================================== */}

      <div className="lobby-header">

        <h1 className="lobby-title">
          🏏 AUCTION LOBBY
        </h1>

        <div className="room-code-display">

          <span className="room-code-label">
            Room Code
          </span>

          <span className="room-code-value">
            {roomData.code}
          </span>

          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard
                .writeText(roomData.code)
                .catch(() => {});
            }}
            title="Copy room code"
            type="button"
          >
            📋
          </button>

        </div>

      </div>

      {/* =====================================================
          LOBBY INFORMATION
          ===================================================== */}

      <div className="lobby-info">

        <div className="info-chip">
          <span>👥</span>
          <span>
            {connectedTeams.length}/
            {roomData.settings.maxPlayers} Players
          </span>
        </div>

        <div className="info-chip">
          <span>💰</span>
          <span>
            ₹{roomData.settings.initialPurse} Cr Purse
          </span>
        </div>

        <div className="info-chip">
          <span>🏏</span>
          <span>
            {roomData.auction.totalPlayers} Players
          </span>
        </div>

      </div>

      {/* =====================================================
          MAIN SIDE-BY-SIDE LAYOUT
          ===================================================== */}

      <div className="lobby-main-grid">

        {/* ===================================================
            TEAMS PANEL
            =================================================== */}

        <div className="teams-panel">

          <div className="teams-list">

            <h2 className="teams-list-title">
              Teams
            </h2>

            {roomData.teams.map((team) => {

              const isMyTeam = team.id === myTeamId;
              const isDisconnected = !team.isConnected;

              return (
                <div
                  key={team.id}
                  className={[
                    'team-row',
                    isMyTeam ? 'my-team' : '',
                    isDisconnected ? 'disconnected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    borderLeftColor: team.teamColor,
                  }}
                >

                  {/* ===============================
                      TEAM INFORMATION
                      =============================== */}

                  <div className="team-row-left">

                    <span className="team-row-logo">
                      {team.teamLogo}
                    </span>

                    <div className="team-row-info">

                      <span className="team-row-name">
                        {team.teamName}
                      </span>

                      <span className="team-row-player">
                        {team.playerName}
                      </span>

                    </div>

                  </div>

                  {/* ===============================
                      TEAM STATUS
                      =============================== */}

                  <div className="team-row-right">

                    {team.isHost && (
                      <span className="host-badge">
                        👑 HOST
                      </span>
                    )}

                    {!team.isConnected && (
                      <span className="dc-badge">
                        OFFLINE
                      </span>
                    )}

                    {team.isConnected &&
                      !team.isHost && (
                        <span
                          className={`ready-badge ${
                            team.isReady
                              ? 'ready'
                              : 'not-ready'
                          }`}
                        >
                          {team.isReady
                            ? '✅ READY'
                            : '⏳ NOT READY'}
                        </span>
                      )}

                    {isMyTeam && (
                      <span className="you-badge">
                        YOU
                      </span>
                    )}

                  </div>

                </div>
              );
            })}

          </div>

        </div>

        {/* ===================================================
            LOBBY CONTROLS PANEL
            =================================================== */}

        <div className="lobby-actions-panel">

          <h2 className="lobby-actions-title">
            🎮 LOBBY CONTROLS
          </h2>

          <div className="lobby-actions">

            {/* ===============================================
                NORMAL PLAYER READY BUTTON
                =============================================== */}

            {!isHost && myTeam && (
              <button
                type="button"
                className={`btn btn-lg btn-full ${
                  myTeam.isReady
                    ? 'btn-danger'
                    : 'btn-primary'
                }`}
                onClick={toggleReady}
              >
                {myTeam.isReady
                  ? '❌ Cancel Ready'
                  : '✅ Ready Up'}
              </button>
            )}

            {/* ===============================================
                HOST START AUCTION
                =============================================== */}

            {isHost && (
              <button
                type="button"
                className="btn btn-primary btn-lg btn-full"
                onClick={startAuction}
                disabled={
                  !allReady ||
                  connectedTeams.length < 2
                }
              >
                🏏 Start Auction

                {connectedTeams.length < 2 &&
                  ' (Need 2+ players)'}
              </button>
            )}

            {/* ===============================================
                LEAVE ROOM
                =============================================== */}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={leaveRoom}
            >
              🚪 Leave Room
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Lobby;
