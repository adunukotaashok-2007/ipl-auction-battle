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

  // Ball Flight Progress Animation Ref
  const flightProgressRef = useRef<number>(0);

  // Handle Delivery Submission
  const handleDeliverBall = () => {
    flightProgressRef.current = 0;
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

  // Canvas 3D Perspective Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Auto-resize canvas to fill container
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Stadium Sky & Floodlights Backdrop
      const skyGradient = ctx.createLinearGradient(0, 0, 0, h * 0.35);
      skyGradient.addColorStop(0, '#0a1128');
      skyGradient.addColorStop(1, '#1c3144');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, w, h * 0.35);

      // Draw Stadium Floodlight Towers
      const drawFloodlight = (x: number, y: number) => {
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x - 4, y, 8, 40);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x, y - 4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 4, 6, 0, Math.PI * 2);
        ctx.fill();
      };
      drawFloodlight(w * 0.15, h * 0.08);
      drawFloodlight(w * 0.85, h * 0.08);

      // 2. Outfield Grass with Realistic Stripes
      const fieldY = h * 0.35;
      const fieldHeight = h * 0.65;

      const grassGradient = ctx.createLinearGradient(0, fieldY, 0, h);
      grassGradient.addColorStop(0, '#1e7e34');
      grassGradient.addColorStop(1, '#155724');
      ctx.fillStyle = grassGradient;
      ctx.fillRect(0, fieldY, w, fieldHeight);

      // Outfield Boundary Arc
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.7, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner 30-Yard Circle Arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.68, w * 0.3, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 3D Perspective Clay Pitch Trapezoid
      // Pitch top at bowler end, pitch bottom wider at batter end
      const pitchTopY = h * 0.42;
      const pitchBottomY = h * 0.88;
      const pitchTopW = w * 0.08;
      const pitchBottomW = w * 0.22;

      const p1 = { x: w / 2 - pitchTopW / 2, y: pitchTopY };
      const p2 = { x: w / 2 + pitchTopW / 2, y: pitchTopY };
      const p3 = { x: w / 2 + pitchBottomW / 2, y: pitchBottomY };
      const p4 = { x: w / 2 - pitchBottomW / 2, y: pitchBottomY };

      const pitchGradient = ctx.createLinearGradient(0, pitchTopY, 0, pitchBottomY);
      pitchGradient.addColorStop(0, '#c29b62');
      pitchGradient.addColorStop(1, '#dcb17a');

      ctx.fillStyle = pitchGradient;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#a67c46';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Crease Lines (3D Perspective)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      // Bowler Crease (Top)
      const topCreaseY = pitchTopY + (pitchBottomY - pitchTopY) * 0.08;
      const topCreaseW = pitchTopW * 1.1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - topCreaseW / 2, topCreaseY);
      ctx.lineTo(w / 2 + topCreaseW / 2, topCreaseY);
      ctx.stroke();

      // Batter Popping Crease (Bottom)
      const botCreaseY = pitchBottomY - (pitchBottomY - pitchTopY) * 0.12;
      const botCreaseW = pitchBottomW * 1.05;
      ctx.beginPath();
      ctx.moveTo(w / 2 - botCreaseW / 2, botCreaseY);
      ctx.lineTo(w / 2 + botCreaseW / 2, botCreaseY);
      ctx.stroke();

      // 4. Stumps & Bails (3D Projected)
      // Top Stumps (Bowler End)
      ctx.fillStyle = '#f39c12';
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(w / 2 + i * 4 - 1.5, topCreaseY - 14, 3, 14);
      }
      ctx.fillRect(w / 2 - 6, topCreaseY - 15, 12, 2); // Bails

      // Bottom Stumps (Batter End)
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(w / 2 + i * 7 - 2, botCreaseY - 22, 4, 22);
      }
      ctx.fillRect(w / 2 - 10, botCreaseY - 23, 20, 3); // Bails

      // 5. Anatomical Bowler Graphic (Top Crease)
      const bowlerX = w / 2 - 12;
      const bowlerY = topCreaseY - 5;

      // Head
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(bowlerX, bowlerY - 16, 5, 0, Math.PI * 2);
      ctx.fill();
      // Jersey Torso
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bowlerX - 4, bowlerY - 11, 8, 12);
      // Legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bowlerX - 4, bowlerY, 3, 10);
      ctx.fillRect(bowlerX + 1, bowlerY, 3, 10);

      // 6. Anatomical Batter Graphic (Bottom Crease - Stance Pose)
      const batterX = w / 2 + 18;
      const batterY = botCreaseY;

      // Batting Pads (White Padded Rectangles)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(batterX - 8, batterY - 12, 6, 22);
      ctx.fillRect(batterX, batterY - 12, 6, 22);

      // Torso / Jersey
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(batterX - 7, batterY - 32, 14, 20);

      // Batting Gloves (Padded Grip)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(batterX - 4, batterY - 20, 3, 0, Math.PI * 2);
      ctx.fill();

      // Helmet with Visor Line
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(batterX, batterY - 38, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(batterX - 6, batterY - 36);
      ctx.lineTo(batterX + 2, batterY - 36);
      ctx.stroke();

      // Wooden Willow Bat in Ready Posture
      ctx.save();
      ctx.translate(batterX - 4, batterY - 18);
      ctx.rotate((-25 * Math.PI) / 180);
      ctx.fillStyle = '#d97706'; // Willow Wood
      ctx.fillRect(0, 0, 5, 28);
      ctx.fillStyle = '#1e293b'; // Handle Grip
      ctx.fillRect(1, -8, 3, 8);
      ctx.restore();

      // 7. Parabolic 3D Ball Trajectory Engine (When Ball is in Flight)
      if (phase === 'BALL_IN_FLIGHT') {
        flightProgressRef.current = Math.min(1, flightProgressRef.current + 0.02);
        const t = flightProgressRef.current;

        // Ball start at bowler end -> pitch bounce -> batter end
        const startX = bowlerX;
        const startY = bowlerY;
        const endX = batterX - 10;
        const endY = batterY;

        // X, Y linear interpolation on pitch
        const ballX = startX + (endX - startX) * t;
        const ballGroundY = startY + (endY - startY) * t;

        // Parabolic height Arc Z(t)
        const heightArc = Math.sin(t * Math.PI) * 45;
        const ballRenderY = ballGroundY - heightArc;

        // Shadow on Pitch Ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(ballX, ballGroundY, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Leather Cricket Ball
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ballX, ballRenderY, 5, 0, Math.PI * 2);
        ctx.fill();

        // White Seam Stitch
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ballX, ballRenderY, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [phase]);

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
