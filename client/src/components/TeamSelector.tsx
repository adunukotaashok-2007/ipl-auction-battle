// client/src/components/TeamSelector.tsx
import React, { useState } from 'react';
import { IPL_TEAMS, IPLTeamPreset } from '../types';
import './TeamSelector.css';

interface TeamSelectorProps {
  onSelect: (team: { name: string; shortName: string; color: string; logo: string }) => void;
  selected: { name: string; shortName: string; color: string; logo: string } | null;
}

function TeamSelector({ onSelect, selected }: TeamSelectorProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customName, setCustomName] = useState('');
  const [customShort, setCustomShort] = useState('');
  const [customColor, setCustomColor] = useState('#FFD700');
  const [customLogo, setCustomLogo] = useState('🏏');

  const logos = ['🏏', '⚡', '🔥', '🦁', '🐯', '🦅', '👑', '💎', '🌟', '🎯', '🛡️', '⚔️', '🏆', '🎪', '🚀'];

  const handlePresetSelect = (team: IPLTeamPreset) => {
    onSelect({
      name: team.name,
      shortName: team.shortName,
      color: team.color,
      logo: team.logo,
    });
  };

  const handleCustomApply = () => {
    if (!customName.trim()) return;
    onSelect({
      name: customName.trim(),
      shortName: customShort.trim() || customName.trim().substring(0, 3).toUpperCase(),
      color: customColor,
      logo: customLogo,
    });
  };

  return (
    <div className="team-selector">
      <div className="team-selector-tabs">
        <button
          className={`tab ${mode === 'preset' ? 'active' : ''}`}
          onClick={() => setMode('preset')}
        >
          IPL Teams
        </button>
        <button
          className={`tab ${mode === 'custom' ? 'active' : ''}`}
          onClick={() => setMode('custom')}
        >
          Custom Team
        </button>
      </div>

      {mode === 'preset' ? (
        <div className="team-grid">
          {IPL_TEAMS.map((team) => (
            <button
              key={team.shortName}
              className={`team-card ${selected?.name === team.name ? 'selected' : ''}`}
              onClick={() => handlePresetSelect(team)}
              style={{
                borderColor: selected?.name === team.name ? team.color : 'transparent',
                boxShadow: selected?.name === team.name ? `0 0 15px ${team.color}40` : 'none',
              }}
            >
              <span className="team-card-logo">{team.logo}</span>
              <span className="team-card-short">{team.shortName}</span>
              <span className="team-card-name">{team.name}</span>
              <div
                className="team-card-stripe"
                style={{ background: team.color }}
              ></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="custom-team-form">
          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              placeholder="e.g., Thunder Warriors"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              maxLength={25}
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Short Name</label>
            <input
              type="text"
              placeholder="e.g., TW"
              value={customShort}
              onChange={(e) => setCustomShort(e.target.value.toUpperCase())}
              maxLength={4}
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Team Color</label>
            <div className="color-picker-row">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="color-input"
              />
              <span className="color-preview" style={{ background: customColor }}>
                {customColor}
              </span>
            </div>
          </div>
          <div className="form-group">
            <label>Team Logo</label>
            <div className="logo-grid">
              {logos.map((logo) => (
                <button
                  key={logo}
                  className={`logo-option ${customLogo === logo ? 'selected' : ''}`}
                  onClick={() => setCustomLogo(logo)}
                >
                  {logo}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-full"
            onClick={handleCustomApply}
            disabled={!customName.trim()}
          >
            ✅ Apply Custom Team
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamSelector;
