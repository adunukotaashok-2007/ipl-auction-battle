// client/src/components/SoldAnimation.tsx
import React from 'react';
import './SoldAnimation.css';

interface SoldAnimationProps {
  playerName: string;
  teamName: string;
  price: number;
  type: 'sold' | 'unsold';
}

function SoldAnimation({ playerName, teamName, price, type }: SoldAnimationProps) {
  return (
    <div className={`sold-overlay ${type}`}>
      <div className="sold-content">
        {type === 'sold' ? (
          <>
            <div className="sold-stamp">SOLD! 🎉</div>
            <div className="sold-player-name">{playerName}</div>
            <div className="sold-to">sold to</div>
            <div className="sold-team-name">{teamName}</div>
            <div className="sold-price">₹{price.toFixed(2)} Cr</div>
          </>
        ) : (
          <>
            <div className="unsold-stamp">UNSOLD ❌</div>
            <div className="sold-player-name">{playerName}</div>
            <div className="sold-to">No bids received</div>
          </>
        )}
      </div>
    </div>
  );
}

export default SoldAnimation;
