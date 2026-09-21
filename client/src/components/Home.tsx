import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { IPL_TEAMS, IPLTeamPreset } from '../types';
import './Home.css';

const Home: React.FC = () => {
  const { createRoom, joinRoom, error } = useGame();

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [userName, setUserName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [teamTab, setTeamTab] = useState<'ipl' | 'custom'>('ipl');

  // Selected IPL preset
  const [selectedPreset, setSelectedPreset] = useState<IPLTeamPreset>(IPL_TEAMS[2]); // Default RCB

  // Custom Team state
  const [customName, setCustomName] = useState('');
  const [customShortName, setCustomShortName] = useState('');
  const [customColor, setCustomColor] = useState('#FFD700');
  const [customLogo, setCustomLogo] = useState('🏏');

  const getActiveTeamDetails = () => {
    if (teamTab === 'ipl') {
      return {
        teamName: selectedPreset.name,
        teamShortName: selectedPreset.shortName,
        teamColor: selectedPreset.color,
        teamLogo: selectedPreset.logo,
      };
    }
    return {
      teamName: customName || 'Custom XI',
      teamShortName: customShortName || customName.substring(0, 3).toUpperCase() || 'CXI',
      teamColor: customColor || '#FFD700',
      teamLogo: customLogo || '🏏',
    };
  };

  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    const team = getActiveTeamDetails();
    createRoom(
      userName.trim(),
      team.teamName,
      team.teamShortName,
      team.teamColor,
      team.teamLogo
    );
  };

  const handleJoinRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !roomCodeInput.trim()) return;

    const team = getActiveTeamDetails();
    joinRoom(
      roomCodeInput.trim().toUpperCase(),
      userName.trim(),
      team.teamName,
      team.teamShortName,
      team.teamColor,
      team.teamLogo
    );
  };

  return (
    <div className="home">
      <div className="home-bg-effects">
        <div className="bg-circle bg-circle-1" />
        <div className="bg-circle bg-circle-2" />
        <div className="bg-circle bg-circle-3" />
      </div>

      <div className="home-content">
        <div className="home-logo">🏏</div>
        <h1 className="home-title">IPL</h1>
        <div className="home-subtitle">AUCTION BATTLE</div>
        <p className="home-desc">Build your dream squad & battle live on pitch!</p>

        {mode === 'menu' && (
          <>
            <div className="home-buttons">
              <button className="btn btn-primary btn-lg" onClick={() => setMode('create')}>
                <span className="btn-icon">⚡</span> Create Room
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => setMode('join')}>
                <span className="btn-icon">🚪</span> Join Room
              </button>
            </div>
            <div className="home-features">
              <span className="feature">🏏 Realistic Physics</span>
              <span className="feature">💰 Live Bidding</span>
              <span className="feature">⚔️ Multiplayer</span>
            </div>
          </>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="form-container">
            <button type="button" className="btn-back" onClick={() => setMode('menu')}>
              ← Back
            </button>

            <h2 className="home-title-sm">
              {mode === 'create' ? 'Create Room' : 'Join Room'}
            </h2>

            <form onSubmit={mode === 'create' ? handleCreateRoomSubmit : handleJoinRoomSubmit}>
              {mode === 'join' && (
                <div className="form-group">
                  <label>Room Code</label>
                  <input
                    type="text"
                    className="input input-code"
                    placeholder="ENTER 6-LETTER CODE"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Your Manager Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              {/* Team Selector Tabs */}
              <div className="form-group">
                <label>Select Team Type</label>
                <div className="team-tabs">
                  <button
                    type="button"
                    className={`tab-btn ${teamTab === 'ipl' ? 'active' : ''}`}
                    onClick={() => setTeamTab('ipl')}
                  >
                    IPL TEAMS
                  </button>
                  <button
                    type="button"
                    className={`tab-btn ${teamTab === 'custom' ? 'active' : ''}`}
                    onClick={() => setTeamTab('custom')}
                  >
                    CUSTOM TEAM
                  </button>
                </div>
              </div>

              {teamTab === 'ipl' ? (
                <div className="ipl-preset-grid">
                  {IPL_TEAMS.map((team) => {
                    const isSelected = selectedPreset.shortName === team.shortName;
                    return (
                      <div
                        key={team.shortName}
                        className={`preset-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedPreset(team)}
                        style={{ borderColor: isSelected ? team.color : 'rgba(255, 255, 255, 0.15)' }}
                      >
                        <span className="preset-logo">{team.logo}</span>
                        <span className="preset-short">{team.shortName}</span>
                        <span className="preset-name">{team.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="custom-team-inputs">
                  <div className="form-group">
                    <label>Team Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Apex Predators"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      required={teamTab === 'custom'}
                    />
                  </div>

                  <div className="form-group row-group">
                    <div>
                      <label>Short Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="APX"
                        value={customShortName}
                        onChange={(e) => setCustomShortName(e.target.value.toUpperCase())}
                        maxLength={4}
                      />
                    </div>

                    <div>
                      <label>Color</label>
                      <input
                        type="color"
                        className="input input-color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Logo</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="⚡"
                        value={customLogo}
                        onChange={(e) => setCustomLogo(e.target.value)}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg btn-full">
                {mode === 'create' ? 'Create Room' : 'Join Room'}
              </button>
            </form>
          </div>
        )}

        {error && <div className="home-error-msg">{error}</div>}
      </div>
    </div>
  );
};

export default Home;
