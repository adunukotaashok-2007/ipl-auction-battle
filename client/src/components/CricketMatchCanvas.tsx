import React, { useRef, useEffect, useState } from 'react';
import { 
  DeliveryInput, 
  ShotInput, 
  PitchZone, 
  PitchLine, 
  ShotDirection, 
  ShotType 
} from '../types';
import './CricketMatchCanvas.css';

export interface MatchCanvasProps {
  isBatting: boolean;
  isBowling: boolean;
  phase: 'AWAITING_DELIVERY' | 'BALL_IN_FLIGHT' | 'RESULT_SHOWCASE' | 'MATCH_OVER' | string;
  battingTeamName: string;
  bowlingTeamName: string;
  strikerName: string;
  bowlerName: string;
  onDeliverySubmit: (delivery: DeliveryInput) => void;
  onShotSubmit: (shot: ShotInput) => void;
}

export const CricketMatchCanvas: React.FC<MatchCanvasProps> = ({
  isBatting,
  isBowling,
  phase,
  strikerName,
  bowlerName,
  onDeliverySubmit,
  onShotSubmit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Bowling Controls State
  const [selectedZone, setSelectedZone] = useState<PitchZone>('GOOD_LENGTH');
  const [selectedLine, setSelectedLine] = useState<PitchLine>('MIDDLE');
  const [bowlingSpeed, setBowlingSpeed] = useState<number>(135);

  // Batting Controls State
  const [selectedDirection, setSelectedDirection] = useState<ShotDirection>('STRAIGHT');
  const [selectedShotType, setSelectedShotType] = useState<ShotType>('GROUND');
  const [timing, setTiming] = useState<number>(50);

  // Handle Delivery Submission
  const handleDeliverBall = () => {
    onDeliverySubmit({
      zone: selectedZone,
      line: selectedLine,
      speed: bowlingSpeed,
    });
  };

  // Handle Shot Submission
  const handlePlayShot = () => {
    onShotSubmit({
      direction: selectedDirection,
      shotType: selectedShotType,
      timing: timing,
    });
  };

  // Canvas Animation & Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Set resolution based on parent container width
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Field (Grass Ground)
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(0, 0, width, height);

      // Outfield Boundary Oval
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width * 0.45, height * 0.42, 0, 0, 2 * Math.PI);
      ctx.stroke();

      // 2. Draw Pitch (Tan/Clay Color)
      const pitchWidth = width * 0.16;
      const pitchHeight = height * 0.7;
      const pitchX = (width - pitchWidth) / 2;
      const pitchY = (height - pitchHeight) / 2;

      ctx.fillStyle = '#d3a369';
      ctx.fillRect(pitchX, pitchY, pitchWidth, pitchHeight);
      ctx.strokeStyle = '#b88248';
      ctx.lineWidth = 3;
      ctx.strokeRect(pitchX, pitchY, pitchWidth, pitchHeight);

      // Crease Lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      // Top Crease
      ctx.beginPath();
      ctx.moveTo(pitchX, pitchY + pitchHeight * 0.15);
      ctx.lineTo(pitchX + pitchWidth, pitchY + pitchHeight * 0.15);
      ctx.stroke();

      // Bottom Crease
      ctx.beginPath();
      ctx.moveTo(pitchX, pitchY + pitchHeight * 0.85);
      ctx.lineTo(pitchX + pitchWidth, pitchY + pitchHeight * 0.85);
      ctx.stroke();

      // 3. Draw Stumps (Top and Bottom)
      ctx.fillStyle = '#f39c12';
      // Top Stumps
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(pitchX + pitchWidth * 0.35 + i * 8, pitchY + pitchHeight * 0.1, 4, 15);
      }
      // Bottom Stumps
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(pitchX + pitchWidth * 0.35 + i * 8, pitchY + pitchHeight * 0.85 - 15, 4, 15);
      }

      // 4. Draw Human Anatomical Batter (Bottom Crease)
      const batterX = pitchX + pitchWidth * 0.5;
      const batterY = pitchY + pitchHeight * 0.82;

      // Head with Visor
      ctx.fillStyle = '#f1c40f'; // Helmet
      ctx.beginPath();
      ctx.arc(batterX, batterY - 25, 8, 0, Math.PI * 2);
      ctx.fill();

      // Body / Jersey
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(batterX - 6, batterY - 17, 12, 18);

      // Batting Pads
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(batterX - 7, batterY, 5, 15);
      ctx.fillRect(batterX + 2, batterY, 5, 15);

      // Bat
      ctx.strokeStyle = '#8e44ad';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(batterX + 6, batterY - 5);
      ctx.lineTo(batterX + 16, batterY + 10);
      ctx.stroke();

      // 5. Draw Human Anatomical Bowler (Top Crease)
      const bowlerX = pitchX + pitchWidth * 0.5;
      const bowlerY = pitchY + pitchHeight * 0.12;

      // Head
      ctx.fillStyle = '#e67e22';
      ctx.beginPath();
      ctx.arc(bowlerX, bowlerY - 10, 7, 0, Math.PI * 2);
      ctx.fill();

      // Body / Jersey
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(bowlerX - 5, bowlerY - 3, 10, 16);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="cricket-canvas-wrapper">
      <canvas ref={canvasRef} className="match-canvas" />

      {/* Bowling Controls Overlay */}
      {isBowling && phase === 'AWAITING_DELIVERY' && (
        <div className="canvas-controls-overlay bowling-controls">
          <h3>BOWLING CONTROLS ({bowlerName})</h3>

          <div className="control-group">
            <label>Length (Zone):</label>
            <div className="btn-group">
              {(['YORKER', 'GOOD_LENGTH', 'SHORT', 'FULL_TOSS'] as PitchZone[]).map((zone) => (
                <button
                  key={zone}
                  className={selectedZone === zone ? 'active' : ''}
                  onClick={() => setSelectedZone(zone)}
                >
                  {zone.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Line:</label>
            <div className="btn-group">
              {(['OUTSIDE_OFF', 'MIDDLE', 'LEG'] as PitchLine[]).map((line) => (
                <button
                  key={line}
                  className={selectedLine === line ? 'active' : ''}
                  onClick={() => setSelectedLine(line)}
                >
                  {line.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Pace: {bowlingSpeed} km/h</label>
            <input
              type="range"
              min="110"
              max="155"
              value={bowlingSpeed}
              onChange={(e) => setBowlingSpeed(Number(e.target.value))}
            />
          </div>

          <button className="action-btn deliver-btn" onClick={handleDeliverBall}>
            DELIVER BALL 🏏
          </button>
        </div>
      )}

      {/* Batting Controls Overlay */}
      {isBatting && (phase === 'AWAITING_DELIVERY' || phase === 'BALL_IN_FLIGHT') && (
        <div className="canvas-controls-overlay batting-controls">
          <h3>BATTING CONTROLS ({strikerName})</h3>

          <div className="control-group">
            <label>Shot Direction:</label>
            <div className="btn-group">
              {(['OFF', 'STRAIGHT', 'LEG'] as ShotDirection[]).map((dir) => (
                <button
                  key={dir}
                  className={selectedDirection === dir ? 'active' : ''}
                  onClick={() => setSelectedDirection(dir)}
                >
                  {dir} SIDE
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Shot Elevation:</label>
            <div className="btn-group">
              {(['GROUND', 'LOFTED'] as ShotType[]).map((type) => (
                <button
                  key={type}
                  className={selectedShotType === type ? 'active' : ''}
                  onClick={() => setSelectedShotType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Timing Control: {timing}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={timing}
              onChange={(e) => setTiming(Number(e.target.value))}
            />
          </div>

          <button className="action-btn shot-btn" onClick={handlePlayShot}>
            PLAY SHOT 💥
          </button>
        </div>
      )}
    </div>
  );
};

export default CricketMatchCanvas;
