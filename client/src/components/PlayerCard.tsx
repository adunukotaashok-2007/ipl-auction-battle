// client/src/components/PlayerCard.tsx
import React, { useState } from 'react';
import { Player } from '../types';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  isRevealing?: boolean;
}

function PlayerCard({ player, isRevealing }: PlayerCardProps) {
  const [imgError, setImgError] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Batsman': return '🏏';
      case 'Bowler': return '🎳';
      case 'All-Rounder': return '⚡';
      case 'Wicket-Keeper': return '🧤';
      default: return '🏏';
    }
  };

  const getCountryFlag = (country: string) => {
    const flags: Record<string, string> = {
      'India': '🇮🇳',
      'Australia': '🇦🇺',
      'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      'South Africa': '🇿🇦',
      'New Zealand': '🇳🇿',
      'Pakistan': '🇵🇰',
      'West Indies': '🌴',
      'Afghanistan': '🇦🇫',
      'Sri Lanka': '🇱🇰',
      'Bangladesh': '🇧🇩',
    };
    return flags[country] || '🏳️';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 90) return '#FFD700';
    if (rating >= 80) return '#4CAF50';
    if (rating >= 70) return '#2196F3';
    return '#FF9800';
  };

  return (
    <div className={`player-card ${isRevealing ? 'revealing' : ''}`}>
      <div className="player-card-glow"></div>

      <div className="player-photo-container">
        {!imgError ? (
          <img
            src={player.photo}
            alt={player.name}
            className="player-photo"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="player-photo-fallback">
            {getRoleIcon(player.role)}
          </div>
        )}
        <div className="player-rating" style={{ background: getRatingColor(player.rating) }}>
          {player.rating}
        </div>
      </div>

      <h2 className="player-name">{player.name}</h2>

      <div className="player-meta">
        <span className="player-role">
          {getRoleIcon(player.role)} {player.role}
        </span>
        <span className="player-country">
          {getCountryFlag(player.country)} {player.country}
        </span>
      </div>

      <div className="player-stats">
        <div className="stat">
          <div className="stat-bar-bg">
            <div
              className="stat-bar"
              style={{ width: `${player.battingRating}%`, background: '#4CAF50' }}
            ></div>
          </div>
          <span className="stat-label">BAT {player.battingRating}</span>
        </div>
        <div className="stat">
          <div className="stat-bar-bg">
            <div
              className="stat-bar"
              style={{ width: `${player.bowlingRating}%`, background: '#2196F3' }}
            ></div>
          </div>
          <span className="stat-label">BOWL {player.bowlingRating}</span>
        </div>
      </div>

      <div className="player-base-price">
        <span className="base-price-label">Base Price</span>
        <span className="base-price-value">₹{player.basePrice.toFixed(2)} Cr</span>
      </div>
    </div>
  );
}

export default PlayerCard;
