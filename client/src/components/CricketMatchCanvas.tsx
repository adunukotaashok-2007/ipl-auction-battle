// client/src/components/CricketMatchCanvas.tsx
import React, { useEffect, useRef, useState } from 'react';
import './CricketMatchCanvas.css';
import { PitchZone, PitchLine, ShotDirection, ShotType } from '../types';

export interface MatchCanvasProps {
  isBatting: boolean;
  isBowling: boolean;
  phase: 'AWAITING_DELIVERY' | 'BALL_IN_FLIGHT' | 'RESULT_SHOWCASE' | 'MATCH_OVER';
  battingTeamName: string;
  bowlingTeamName: string;
  battingColor?: string;
  bowlingColor?: string;
  strikerName: string;
  bowlerName: string;
  lastOutcome?: {
    runs: number;
    isWicket: boolean;
    wicketType?: string;
    commentary: string;
    shotQuality: string;
  };
  onDeliverBall: (zone: PitchZone, line: PitchLine, speed: number) => void;
  onHitShot: (direction: ShotDirection, shotType: ShotType, timing: number) => void;
}

export const CricketMatchCanvas: React.FC<MatchCanvasProps> = ({
  isBatting,
  isBowling,
  phase,
  battingTeamName,
  bowlingTeamName,
  battingColor = '#0284c7',
  bowlingColor = '#dc2626',
  strikerName,
  bowlerName,
  lastOutcome,
  onDeliverBall,
  onHitShot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Bowling
  const [selectedZone, setSelectedZone] = useState<PitchZone>('GOOD_LENGTH');
  const [selectedLine, setSelectedLine] = useState<PitchLine>('MIDDLE');
  const [bowlingSpeed, setBowlingSpeed] = useState<number>(85);

  // Batting
  const [shotDirection, setShotDirection] = useState<ShotDirection>('STRAIGHT');
  const [shotType, setShotType] = useState<ShotType>('LOFTED');

  // Animation Refs
  const timingRef = useRef<number>(0);
  const timingDirectionRef = useRef<number>(1);
  const animFrameRef = useRef<number>(0);
  const ballProgressRef = useRef<number>(0);
  const batSwingRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Stadium Turf & Pitch
      drawStadium(ctx, canvas.width, canvas.height);
      const pitchTopY = 140, pitchBottomY = 460, pitchWidthTop = 70, pitchWidthBottom = 110;
      drawPitch(ctx, canvas.width, pitchTopY, pitchBottomY, pitchWidthTop, pitchWidthBottom);

      // Calculate Target Marker
      let targetX = canvas.width / 2;
      let targetY = 320;
      if (selectedLine === 'OUTSIDE_OFF') targetX = canvas.width / 2 - 25;
      if (selectedLine === 'LEG') targetX = canvas.width / 2 + 25;
      if (selectedZone === 'YORKER') targetY = 410;
      if (selectedZone === 'SHORT') targetY = 240;

      if (isBowling || phase === 'AWAITING_DELIVERY') {
        drawPitchTarget(ctx, targetX, targetY);
      }

      // 2. Draw Players
      drawWicketKeeper(ctx, canvas.width / 2, 490, bowlingColor);
      drawFielders(ctx, bowlingColor);

      const bowlerRunUp = phase === 'BALL_IN_FLIGHT' ? Math.sin(elapsed * 12) * 6 : 0;
      drawBowler(ctx, canvas.width / 2 - 15, pitchTopY - 20 + bowlerRunUp, bowlingColor, phase);

      const batterX = canvas.width / 2 + 12;
      const batterY = 430;
      drawBatter(ctx, batterX, batterY, battingColor, batSwingRef.current, phase);

      // 3. Animate Ball Flight
      if (phase === 'BALL_IN_FLIGHT') {
        ballProgressRef.current += 0.025;
        if (ballProgressRef.current > 1) ballProgressRef.current = 1;

        const p = ballProgressRef.current;
        const startX = canvas.width / 2 - 10;
        const startY = pitchTopY + 10;
        let curX = startX + (targetX - startX) * p;
        let curY = startY + (targetY - startY) * p;
        let ballHeight = Math.sin(p * Math.PI) * 20;

        // Bounce path
        if (p > 0.6) {
          const p2 = (p - 0.6) / 0.4;
          curX = targetX + ((canvas.width / 2) - targetX) * p2;
          curY = targetY + (batterY - targetY) * p2;
          ballHeight = Math.sin(p2 * Math.PI) * 15;
        }

        drawBall(ctx, curX, curY - ballHeight);

        // Update Batting Timing Bar
        timingRef.current += 0.035 * timingDirectionRef.current;
        if (timingRef.current >= 1) {
          timingRef.current = 1;
          timingDirectionRef.current = -1;
        } else if (timingRef.current <= 0) {
          timingRef.current = 0;
          timingDirectionRef.current = 1;
        }
      } else {
        ballProgressRef.current = 0;
      }

      // 4. Result Animation
      if (phase === 'RESULT_SHOWCASE' && lastOutcome) {
        if (lastOutcome.isWicket) drawWicketExplosion(ctx, canvas.width / 2, 445, elapsed);
        else if (lastOutcome.runs >= 4) drawBoundaryFireworks(ctx, canvas.width, canvas.height, lastOutcome.runs, elapsed);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, selectedZone, selectedLine, isBowling, lastOutcome, battingColor, bowlingColor]);

  const handleHitClick = () => {
    if (phase !== 'BALL_IN_FLIGHT') return;
    const score = Math.max(0, 1 - Math.abs(0.82 - timingRef.current) * 2.2);
    batSwingRef.current = 1;
    setTimeout(() => { batSwingRef.current = 0; }, 400);
    onHitShot(shotDirection, shotType, score);
  };

  const handleDeliverClick = () => {
    if (phase !== 'AWAITING_DELIVERY') return;
    onDeliverBall(selectedZone, selectedLine, bowlingSpeed);
  };

  return (
    <div className="cricket-match-container">
      <div className="match-hud">
        <div className="hud-team batting">
          <span className="team-badge" style={{ backgroundColor: battingColor }}>🏏 BAT</span>
          <span className="team-name">{battingTeamName}</span>
          <span className="player-highlight">{strikerName}</span>
        </div>
        <div className="hud-status">
          <span className="phase-pill">{phase.replace(/_/g, ' ')}</span>
        </div>
        <div className="hud-team bowling">
          <span className="player-highlight">{bowlerName}</span>
          <span className="team-name">{bowlingTeamName}</span>
          <span className="team-badge" style={{ backgroundColor: bowlingColor }}>🎳 BOWL</span>
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={600} height={560} className="cricket-canvas" />

        {isBatting && phase === 'BALL_IN_FLIGHT' && (
          <div className="timing-meter-overlay">
            <div className="meter-label">⚡ TIMING METER — TAP HIT WHEN IN GREEN!</div>
            <div className="meter-track">
              <div className="sweet-zone" style={{ left: '70%', width: '22%' }} />
              <div className="meter-needle" style={{ left: `${timingRef.current * 100}%` }} />
            </div>
            <div className="shot-controls-inline">
              <div className="control-group">
                <button className={`btn-toggle ${shotDirection === 'OFF' ? 'active' : ''}`} onClick={() => setShotDirection('OFF')}>↖ OFF</button>
                <button className={`btn-toggle ${shotDirection === 'STRAIGHT' ? 'active' : ''}`} onClick={() => setShotDirection('STRAIGHT')}>↑ STRAIGHT</button>
                <button className={`btn-toggle ${shotDirection === 'LEG' ? 'active' : ''}`} onClick={() => setShotDirection('LEG')}>↗ LEG</button>
              </div>
              <div className="control-group">
                <button className={`btn-toggle ${shotType === 'GROUND' ? 'active' : ''}`} onClick={() => setShotType('GROUND')}>👇 GROUND</button>
                <button className={`btn-toggle ${shotType === 'LOFTED' ? 'active' : ''}`} onClick={() => setShotType('LOFTED')}>🚀 LOFTED (6)</button>
              </div>
              <button className="btn-hit-swing" onClick={handleHitClick}>💥 SWING BAT!</button>
            </div>
          </div>
        )}

        {isBowling && phase === 'AWAITING_DELIVERY' && (
          <div className="bowling-tactics-overlay">
            <h4>🎯 Select Pitch Target</h4>
            <div className="tactics-row">
              <button className={selectedZone === 'YORKER' ? 'active' : ''} onClick={() => setSelectedZone('YORKER')}>Yorker</button>
              <button className={selectedZone === 'GOOD_LENGTH' ? 'active' : ''} onClick={() => setSelectedZone('GOOD_LENGTH')}>Good</button>
              <button className={selectedZone === 'SHORT' ? 'active' : ''} onClick={() => setSelectedZone('SHORT')}>Short</button>
            </div>
            <div className="tactics-row">
              <button className={selectedLine === 'OUTSIDE_OFF' ? 'active' : ''} onClick={() => setSelectedLine('OUTSIDE_OFF')}>Off</button>
              <button className={selectedLine === 'MIDDLE' ? 'active' : ''} onClick={() => setSelectedLine('MIDDLE')}>Mid</button>
              <button className={selectedLine === 'LEG' ? 'active' : ''} onClick={() => setSelectedLine('LEG')}>Leg</button>
            </div>
            <button className="btn-deliver-ball" onClick={handleDeliverClick}>🎳 BOWL DELIVERY</button>
          </div>
        )}
      </div>

      {lastOutcome && (
        <div className={`outcome-banner ${lastOutcome.isWicket ? 'wicket' : 'runs'}`}>
          <div className="outcome-title">{lastOutcome.isWicket ? `☝️ OUT! (${lastOutcome.wicketType})` : `🏏 ${lastOutcome.runs} RUNS! [${lastOutcome.shotQuality}]`}</div>
          <div className="commentary-text">{lastOutcome.commentary}</div>
        </div>
      )}
    </div>
  );
};

// Canvas Helper Functions
function drawStadium(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const grad = ctx.createRadialGradient(width/2, height/2, 80, width/2, height/2, 340);
  grad.addColorStop(0, '#2e7d32');
  grad.addColorStop(1, '#0d3813');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(width/2, height/2, width/2 - 20, height/2 - 20, 0, 0, Math.PI*2);
  ctx.stroke();
}

function drawPitch(ctx: CanvasRenderingContext2D, width: number, topY: number, bottomY: number, wTop: number, wBottom: number) {
  const cX = width/2;
  ctx.fillStyle = '#d7ccc8';
  ctx.beginPath();
  ctx.moveTo(cX - wTop/2, topY); ctx.lineTo(cX + wTop/2, topY);
  ctx.lineTo(cX + wBottom/2, bottomY); ctx.lineTo(cX - wBottom/2, bottomY);
  ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cX - wTop/2 + 6, topY + 25); ctx.lineTo(cX + wTop/2 - 6, topY + 25); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cX - wBottom/2 + 8, bottomY - 30); ctx.lineTo(cX + wBottom/2 - 8, bottomY - 30); ctx.stroke();
  drawStumps(ctx, cX, topY + 12, 0.7); drawStumps(ctx, cX, bottomY - 15, 1.0);
}

function drawStumps(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = '#ffb300';
  for(let i=-1; i<=1; i++) ctx.fillRect(x + i*6*scale - 2*scale, y - 24*scale, 4*scale, 24*scale);
  ctx.fillStyle = '#d32f2f'; ctx.fillRect(x - 8*scale, y - 27*scale, 16*scale, 3*scale);
}

function drawPitchTarget(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(250, 204, 21, 0.25)'; ctx.fill();
}

function drawBatter(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, swing: number, phase: string) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#fff'; ctx.fillRect(-8, -14, 6, 16); ctx.fillRect(-1, -14, 6, 16);
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-9, -32, 16, 18, 4); ctx.fill();
  ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(-1, -38, 7, 0, Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(-4, -22); ctx.rotate(swing > 0 ? -Math.PI/1.4 : -Math.PI/6);
  ctx.fillStyle = '#d7ccc8'; ctx.fillRect(-3, -22, 6, 22); ctx.restore();
  ctx.restore();
}

function drawBowler(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, phase: string) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color; ctx.fillRect(-5, -12, 4, 14); ctx.fillRect(1, -12, 4, 14); ctx.fillRect(-6, -26, 12, 15);
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, -32, 5, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -24); ctx.lineTo(8, phase==='BALL_IN_FLIGHT'?-42:-20); ctx.stroke();
  ctx.restore();
}

function drawWicketKeeper(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color; ctx.fillRect(-8, -14, 16, 12);
  ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, -20, 6, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawFielders(ctx: CanvasRenderingContext2D, color: string) {
  const pos = [{x: 100, y: 200}, {x: 480, y: 180}, {x: 80, y: 360}, {x: 520, y: 380}, {x: 300, y: 80}];
  pos.forEach(p => { ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = color; ctx.fillRect(-4, -14, 8, 14); ctx.restore(); });
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
}

function drawWicketExplosion(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number) {
  const spread = Math.sin(elapsed*10)*15;
  ctx.fillStyle = '#ffb300'; ctx.fillRect(x-12-spread, y-20-spread, 4, 20); ctx.fillRect(x+12+spread, y-20-spread, 4, 20);
}

function drawBoundaryFireworks(ctx: CanvasRenderingContext2D, w: number, h: number, runs: number, elapsed: number) {
  ctx.fillStyle = runs === 6 ? '#facc15' : '#38bdf8'; ctx.font = '900 48px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(runs === 6 ? '🚀 6 SIX!' : '⚡ 4 FOUR!', w/2, h/2-40);
}
