// client/src/components/AuctionScreen.tsx
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import PlayerCard from './PlayerCard';
import BidControls from './BidControls';
import Leaderboard from './Leaderboard';
import SquadPanel from './SquadPanel';
import './AuctionScreen.css';

function AuctionScreen() {
  const { roomData, myTeamId, isHost, pauseAuction, resumeAuction, nextPlayer, endAuction, restartAuction, leaveRoom } = useGame();
  const [sidePanel, setSidePanel] = useState<'leaderboard' | 'squad'>('leaderboard');
  const [showPanel, setShowPanel] = useState(false);

  if (!roomData) return null;

  const auction = roomData.auction;
  const gameState = roomData.gameState;
  const timer = auction.auctionTimer;
  const maxTimer = auction.maxTimer;
  const timerPercent = maxTimer > 0 ? (timer / maxTimer) * 100 : 0;
  const timerColor = timer <= 3 ? '#FF1744' : timer <= 7 ? '#FF9800' : '#4CAF50';

  return (
    <div className="auction-screen">
      {/* Header */}
      <div className="auction-header">
        <div className="auction-header-left">
          <h1 className="auction-logo">🏏 IPL AUCTION</h1>
          <span className="auction-room-code">Room: {roomData.code}</span>
        </div>

        <div className="auction-header-center">
          {(gameState === 'AUCTION' || gameState === 'PAUSED') && (
            <div className="timer-container">
              <svg className="timer-svg" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - timerPercent / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90, 50, 50)"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
              </svg>
              <span className="timer-text" style={{ color: timerColor }}>
                {timer}
              </span>
            </div>
          )}

          {gameState === 'PLAYER_REVEAL' && (
            <div className="state-badge reveal">REVEALING...</div>
          )}
          {gameState === 'SOLD' && (
            <div className="state-badge sold">SOLD!</div>
          )}
          {gameState === 'UNSOLD' && (
            <div className="state-badge unsold">UNSOLD</div>
          )}
          {gameState === 'PAUSED' && (
            <div className="state-badge paused">PAUSED</div>
          )}
        </div>

        <div className="auction-header-right">
          <span className="auction-progress-text">
            Player {auction.currentPlayerIndex + 1}/{auction.totalPlayers}
          </span>
          <button
            className="panel-toggle-btn"
            onClick={() => setShowPanel(!showPanel)}
          >
            📊
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`auction-main ${showPanel ? 'panel-open' : ''}`}>
        <div className="auction-center">
          {auction.currentPlayer ? (
            <>
              <PlayerCard
                player={auction.currentPlayer}
                isRevealing={gameState === 'PLAYER_REVEAL'}
              />
              <BidControls />
            </>
          ) : (
            <div className="waiting-message">
              <span className="waiting-icon">⏳</span>
              <h2>Waiting for next player...</h2>
            </div>
          )}

          {/* Host Controls */}
          {isHost && (
            <div className="host-controls">
              <h4 className="host-controls-title">👑 Host Controls</h4>
              <div className="host-buttons">
                {gameState === 'AUCTION' && (
                  <button className="btn-host" onClick={pauseAuction}>
                    ⏸️ Pause
                  </button>
                )}
                {gameState === 'PAUSED' && (
                  <button className="btn-host" onClick={resumeAuction}>
                    ▶️ Resume
                  </button>
                )}
                <button className="btn-host" onClick={nextPlayer}>
                  ⏭️ Next Player
                </button>
                <button className="btn-host btn-host-danger" onClick={endAuction}>
                  🏁 End Auction
                </button>
                <button className="btn-host" onClick={restartAuction}>
                  🔄 Restart
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Desktop */}
        <div className="auction-side-desktop">
          <div className="side-panel-tabs">
            <button
              className={`side-tab ${sidePanel === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setSidePanel('leaderboard')}
            >
              📊 Standings
            </button>
            <button
              className={`side-tab ${sidePanel === 'squad' ? 'active' : ''}`}
              onClick={() => setSidePanel('squad')}
            >
              👥 Squads
            </button>
          </div>
          {sidePanel === 'leaderboard' ? <Leaderboard /> : <SquadPanel />}
        </div>
      </div>

      {/* Mobile Panel Overlay */}
      {showPanel && (
        <div className="mobile-panel-overlay" onClick={() => setShowPanel(false)}>
          <div className="mobile-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-panel-header">
              <div className="side-panel-tabs">
                <button
                  className={`side-tab ${sidePanel === 'leaderboard' ? 'active' : ''}`}
                  onClick={() => setSidePanel('leaderboard')}
                >
                  📊 Standings
                </button>
                <button
                  className={`side-tab ${sidePanel === 'squad' ? 'active' : ''}`}
                  onClick={() => setSidePanel('squad')}
                >
                  👥 Squads
                </button>
              </div>
              <button className="mobile-panel-close" onClick={() => setShowPanel(false)}>
                ✕
              </button>
            </div>
            {sidePanel === 'leaderboard' ? <Leaderboard /> : <SquadPanel />}
          </div>
        </div>
      )}

      {/* Leave button */}
      <button className="leave-btn-floating" onClick={leaveRoom}>
        🚪
      </button>
    </div>
  );
}

export default AuctionScreen;
