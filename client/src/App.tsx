import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import AuctionScreen from './components/AuctionScreen';
import FinishScreen from './components/FinishScreen';
import MatchScreen from './components/MatchScreen';
import SoldAnimation from './components/SoldAnimation';
import './App.css';

function AppContent() {
  const {
    roomData,
    notification,
    soldAnimation,
    unsoldAnimation,
    connected,
    clearNotification,
    error,
    clearError,
  } = useGame();

  // Mobile Landscape / Portrait Check
  const [isPortrait, setIsPortrait] = useState<boolean>(
    window.innerHeight > window.innerWidth && window.innerWidth < 768
  );

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(
        window.innerHeight > window.innerWidth &&
        window.innerWidth < 768
      );
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Attempt orientation lock on supported mobile browsers.
    // Some TypeScript DOM versions don't expose `lock`,
    // so we safely extend the type here.
    const orientation = window.screen?.orientation as
      | (ScreenOrientation & {
          lock?: (
            orientation: OrientationLockType
          ) => Promise<void>;
        })
      | undefined;

    if (orientation?.lock) {
      orientation.lock('landscape').catch(() => {
        // Browser may block orientation lock.
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const renderScreen = () => {
    if (!roomData) {
      return <Home />;
    }

    switch (roomData.gameState) {
      case 'LOBBY':
        return <Lobby />;

      case 'MATCH_PLAYING':
        return <MatchScreen />;

      case 'LINEUP_SELECTION':
      case 'FINISHED':
        return <FinishScreen />;

      case 'AUCTION':
      case 'PLAYER_REVEAL':
      case 'SOLD':
      case 'UNSOLD':
      case 'NEXT_PLAYER':
      case 'PAUSED':
        return <AuctionScreen />;

      default:
        return <AuctionScreen />;
    }
  };

  return (
    <div className="app">
      {/* Mobile Orientation Overlay */}
      {isPortrait && (
        <div
          className="portrait-warning-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#090d16',
            color: '#ffffff',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              marginBottom: '15px',
            }}
          >
            📱
          </div>

          <h2
            style={{
              fontSize: '1.5rem',
              color: '#f59e0b',
              margin: '0 0 10px 0',
            }}
          >
            PLEASE ROTATE YOUR PHONE
          </h2>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              maxWidth: '300px',
            }}
          >
            IPL Auction Battle is optimized for Landscape view
            for full field &amp; auction visibility.
          </p>
        </div>
      )}

      {/* Connection Banner */}
      {!connected && (
        <div className="connection-banner">
          <div className="connection-dot"></div>
          Reconnecting...
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div
          className="notification"
          onClick={clearNotification}
        >
          {notification}
        </div>
      )}

      {/* Errors */}
      {error && (
        <div
          className="notification error-notification"
          onClick={clearError}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Sold Animation */}
      {soldAnimation && soldAnimation.player && (
        <SoldAnimation
          playerName={soldAnimation.player.name}
          teamName={soldAnimation.teamName}
          price={soldAnimation.price}
          type="sold"
        />
      )}

      {/* Unsold Animation */}
      {unsoldAnimation && unsoldAnimation.player && (
        <SoldAnimation
          playerName={unsoldAnimation.player.name}
          teamName=""
          price={0}
          type="unsold"
        />
      )}

      {renderScreen()}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
