import React, { useEffect, useState } from 'react';
import './IntroAnimation.css';

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 500),
      window.setTimeout(() => setStage(2), 1600),
      window.setTimeout(() => setStage(3), 2800),
      window.setTimeout(() => setShowButton(true), 4200),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const handleEnter = () => {
    setStage(4);

    window.setTimeout(() => {
      onComplete();
    }, 700);
  };

  return (
    <div className={`intro-screen stage-${stage}`}>
      <div className="intro-stadium">
        <div className="stadium-glow stadium-glow-left" />
        <div className="stadium-glow stadium-glow-right" />

        <div className="floodlight floodlight-left">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="floodlight floodlight-right">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="stadium-stands">
          <div className="stand stand-one" />
          <div className="stand stand-two" />
          <div className="stand stand-three" />
        </div>

        <div className="stadium-field">
          <div className="field-line field-line-one" />
          <div className="field-line field-line-two" />
          <div className="pitch">
            <div className="pitch-line pitch-line-top" />
            <div className="pitch-line pitch-line-bottom" />
          </div>
        </div>
      </div>

      <div className="particles">
        {Array.from({ length: 35 }).map((_, index) => (
          <span
            key={index}
            className="particle"
            style={{
              '--delay': `${(index % 10) * 0.35}s`,
              '--left': `${(index * 29) % 100}%`,
              '--duration': `${4 + (index % 5)}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="cricket-ball">
        <div className="ball-seam" />
      </div>

      <div className="intro-content">
        <div className="welcome-text">
          {stage >= 1 && (
            <div className="welcome-small">
              WELCOME TO
            </div>
          )}

          {stage >= 2 && (
            <div className="main-title">
              <span className="title-top">IPL</span>
              <span className="title-bottom">AUCTION</span>
            </div>
          )}

          {stage >= 3 && (
            <div className="battle-title">
              BATTLE
            </div>
          )}

          {stage >= 3 && (
            <div className="subtitle">
              BUILD YOUR SQUAD • BID • COMPETE • WIN
            </div>
          )}
        </div>

        {showButton && stage < 4 && (
          <button
            type="button"
            className="enter-button"
            onClick={handleEnter}
          >
            <span>ENTER AUCTION</span>
            <span className="button-arrow">→</span>
          </button>
        )}
      </div>

      <div className="intro-bottom">
        <span>CRICKET AUCTION BATTLE</span>
      </div>

      <div className="intro-vignette" />
    </div>
  );
};

export default IntroAnimation;
