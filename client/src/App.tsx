// client/src/App.tsx
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import AuctionScreen from './components/AuctionScreen';
import FinishScreen from './components/FinishScreen';
import SoldAnimation from './components/SoldAnimation';
import './App.css';

function AppContent() {
  const { roomData, notification, soldAnimation, unsoldAnimation, connected, clearNotification } = useGame();

  const renderScreen = () => {
    if (!roomData) return <Home />;

    switch (roomData.gameState) {
      case 'LOBBY':
        return <Lobby />;
      case 'FINISHED':
        return <FinishScreen />;
      default:
        return <AuctionScreen />;
    }
  };

  return (
    <div className="app">
      {!connected && (
        <div className="connection-banner">
          <div className="connection-dot"></div>
          Reconnecting...
        </div>
      )}

      {notification && (
        <div className="notification" onClick={clearNotification}>
          {notification}
        </div>
      )}

      {soldAnimation && (
        <SoldAnimation
          playerName={soldAnimation.player.name}
          teamName={soldAnimation.teamName}
          price={soldAnimation.price}
          type="sold"
        />
      )}

      {unsoldAnimation && (
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
