import React, { useEffect, useState } from 'react';
import './IntroAnimation.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'action' | 'exit'>('intro');

  useEffect(() => {
    const actionTimer = window.setTimeout(() => {
      setPhase('action');
    }, 1200);

    const exitTimer = window.setTimeout(() => {
      setPhase('exit');
    }, 3600);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      window.clearTimeout(actionTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`intro-screen ${phase}`}>
      {/* Stadium lights */}
      <div className="stadium-lights">
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Background stadium */}
      <div className="intro-stadium">
        <div className="stadium-stand stand-left" />
        <div className="stadium-stand stand-right" />

        <div className="stadium-field">
          <div className="pitch">
            <div className="pitch-line pitch-top" />
            <div className="pitch-line pitch-bottom" />
          </div>
        </div>
      </div>

      {/* Cricket ball */}
      <div className="intro-ball">
        <div className="ball-seam" />
      </div>

      {/* Bowler */}
      <div className="intro-player bowler">
        <div className="player-head" />
        <div className="player-body" />
        <div className="player-arm left-arm" />
        <div className="player-arm right-arm" />
        <div className="player-leg left-leg" />
        <div className="player-leg right-leg" />
      </div>

      {/* Batsman */}
      <div className="intro-player batsman">
        <div className="player-head helmet" />
        <div className="player-body" />
        <div className="player-arm left-arm" />
        <div className="player-arm right-arm" />

        <div className="bat">
          <div className="bat-handle" />
          <div className="bat-blade" />
        </div>

        <div className="player-leg left-leg" />
        <div className="player-leg right-leg" />
      </div>

      {/* Title */}
      <div className="intro-title">
        <div className="small-title">WELCOME TO</div>
        <h1>CRICKET</h1>
        <h2>AUCTION BATTLE</h2>
        <div className="title-line" />
      </div>

      {/* Loading */}
      <div className="intro-loading">
        <span>LOADING GAME</span>
        <div className="loading-bar">
          <div className="loading-progress" />
        </div>
      </div>

      {/* Dark transition */}
      <div className="intro-fade" />
    </div>
  );
};

export default IntroAnimation;
