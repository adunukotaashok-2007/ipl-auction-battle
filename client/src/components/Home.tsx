// client/src/components/Home.tsx
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import TeamSelector from './TeamSelector';
import './Home.css';

function Home() {
  const { createRoom, joinRoom } = useGame();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<{
    name: string;
    shortName: string;
    color: string;
    logo: string;
  } | null>(null);

  const handleCreate = () => {
    if (!playerName.trim() || !selectedTeam) return;
    createRoom(
      playerName.trim(),
      selectedTeam.name,
      selectedTeam.shortName,
      selectedTeam.color,
      selectedTeam.logo
    );
  };

  const handleJoin = () => {
    if (!playerName.trim() || !selectedTeam || !roomCode.trim()) return;
    joinRoom(
      roomCode.trim().toUpperCase(),
      playerName.trim(),
      selectedTeam.name,
      selectedTeam.shortName,
      selectedTeam.color,
      selectedTeam.logo
    );
  };

  if (mode === 'menu') {
    return (
      <div className="home">
        <div className="home-bg-effects">
          <div className="bg-circle bg-circle-1"></div>
          <div className="bg-circle bg-circle-2"></div>
          <div className="bg-circle bg-circle-3"></div>
        </div>
        <div className="home-content">
          <div className="home-logo">🏏</div>
          <h1 className="home-title">IPL AUCTION</h1>
          <h2 className="home-subtitle">BATTLE</h2>
          <p className="home-desc">Real-time multiplayer cricket auction game</p>
          <div className="home-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => setMode('create')}>
              <span className="btn-icon">🏟️</span>
              Create Room
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => setMode('join')}>
              <span className="btn-icon">🎮</span>
              Join Room
            </button>
          </div>
          <div className="home-features">
            <div className="feature">👥 Up to 10 Players</div>
            <div className="feature">⚡ Real-time Bidding</div>
            <div className="feature">🏆 60 Cricket Stars</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-bg-effects">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
      </div>
      <div className="home-content">
        <button className="btn-back" onClick={() => { setMode('menu'); setSelectedTeam(null); }}>
          ← Back
        </button>

        <h1 className="home-title-sm">
          {mode === 'create' ? '🏟️ Create Room' : '🎮 Join Room'}
        </h1>

        <div className="form-group">
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="input"
          />
        </div>

        {mode === 'join' && (
          <div className="form-group">
            <label>Room Code</label>
            <input
              type="text"
              placeholder="Enter 6-digit room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="input input-code"
            />
          </div>
        )}

        <TeamSelector onSelect={setSelectedTeam} selected={selectedTeam} />

        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={mode === 'create' ? handleCreate : handleJoin}
          disabled={!playerName.trim() || !selectedTeam || (mode === 'join' && !roomCode.trim())}
        >
          {mode === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}

export default Home;
