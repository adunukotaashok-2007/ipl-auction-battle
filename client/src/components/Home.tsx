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
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">IPL AUCTION BATTLE</h1>
        <p className="home-subtitle">Build your dream squad & battle live on pitch!</p>

        {mode === 'menu' && (
          <div className="menu-buttons">
            <button className="btn btn-primary" onClick={() => setMode('create')}>
              Create Room
            </button>
            <button className="btn btn-secondary" onClick={() => setMode('join')}>
              Join Room
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="form-wrapper">
            <button className="back-btn" onClick={() => setMode('menu')}>
              ← Back
            </button>

            <h2>{mode === 'create' ? 'Create Room' : 'Join Room'}</h2>

            <form onSubmit={mode === 'create' ? handleCreateRoomSubmit : handleJoinRoomSubmit}>
              {mode === 'join' && (
                <div className="form-group">
                  <label>Room Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit Room Code"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your manager name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                />
              </div>

              {/* Team Selector Tabs */}
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

              {teamTab === 'ipl' ? (
                <div className="ipl-preset-grid">
                  {IPL_TEAMS.map((team) => (
                    <div
                      key={team.shortName}
                      className={`preset-card ${selectedPreset.shortName === team.shortName ? 'selected' : ''}`}
                      onClick={() => setSelectedPreset(team)}
                      style={{ borderColor: team.color }}
                    >
                      <span className="preset-logo">{team.logo}</span>
                      <span className="preset-short">{team.shortName}</span>
                      <span className="preset-name">{team.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="custom-team-inputs">
                  <div className="form-group">
                    <label>Team Name</label>
                    <input
                      type="text"
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
                        placeholder="e.g. APX"
                        value={customShortName}
                        onChange={(e) => setCustomShortName(e.target.value.toUpperCase())}
                        maxLength={4}
                      />
                    </div>

                    <div>
                      <label>Team Color</label>
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Emoji Logo</label>
                      <input
                        type="text"
                        placeholder="e.g. ⚡"
                        value={customLogo}
                        onChange={(e) => setCustomLogo(e.target.value)}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-submit">
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
