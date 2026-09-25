import React, { useState, useCallback } from 'react';

const SHOTS = [
  { type: 'DRIVE', emoji: '🏏', label: 'Drive', desc: 'Straight/Cover drive', risk: 'Medium', color: 'from-blue-500 to-blue-700' },
  { type: 'PULL', emoji: '💪', label: 'Pull', desc: 'Pull/Hook shot', risk: 'Medium', color: 'from-purple-500 to-purple-700' },
  { type: 'SWEEP', emoji: '🔄', label: 'Sweep', desc: 'Sweep/Reverse sweep', risk: 'Medium', color: 'from-teal-500 to-teal-700' },
  { type: 'DEFEND', emoji: '🛡️', label: 'Defend', desc: 'Block/Leave', risk: 'Low', color: 'from-gray-500 to-gray-700' },
  { type: 'LOFT', emoji: '🚀', label: 'Loft', desc: 'Big hit over top', risk: 'High', color: 'from-red-500 to-red-700' },
  { type: 'SCOOP', emoji: '✨', label: 'Scoop', desc: 'Innovative scoop', risk: 'High', color: 'from-yellow-500 to-orange-600' }
];

const BattingPanel = ({ onPlayShot, isLoading, lastResult, currentBatsman }) => {
  const [selectedShot, setSelectedShot] = useState(null);
  const [showTimingMeter, setShowTimingMeter] = useState(false);
  const [timingPosition, setTimingPosition] = useState(50);
  const [timingInterval, setTimingInterval] = useState(null);

  // Simple timing meter
  const startTimingMeter = useCallback((shotType) => {
    setSelectedShot(shotType);
    setShowTimingMeter(true);
    setTimingPosition(0);

    // Oscillating meter
    let pos = 0;
    let direction = 1;
    const speed = 3;

    const interval = setInterval(() => {
      pos += speed * direction;
      if (pos >= 100) direction = -1;
      if (pos <= 0) direction = 1;
      setTimingPosition(pos);
    }, 30);

    setTimingInterval(interval);
  }, []);

  const stopTimingMeter = useCallback(() => {
    if (timingInterval) clearInterval(timingInterval);
    setShowTimingMeter(false);

    // Calculate timing quality based on position
    // Sweet spot is 45-55 (center)
    let timing;
    const pos = timingPosition;
    if (pos >= 45 && pos <= 55) timing = 'PERFECT';
    else if (pos >= 35 && pos <= 65) timing = 'GOOD';
    else if (pos >= 25 && pos <= 75) timing = 'AVERAGE';
    else if (pos >= 15 && pos <= 85) timing = 'MISTIMED';
    else timing = 'MISS';

    // Play the shot
    onPlayShot({
      shotType: selectedShot,
      timing
    });

    setSelectedShot(null);
  }, [timingInterval, timingPosition, selectedShot, onPlayShot]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🏏 Your Batting</h3>
        {currentBatsman?.striker && (
          <span className="text-green-400 text-sm font-semibold">
            ⚡ {currentBatsman.striker} ({currentBatsman.strikerStats?.runs || 0}*)
          </span>
        )}
      </div>

      {/* Timing Meter */}
      {showTimingMeter && (
        <div className="mb-6">
          <p className="text-yellow-300 text-center text-sm font-semibold mb-2">
            TAP to time your {selectedShot}!
          </p>
          <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden border-2 border-yellow-500/50">
            {/* Zones */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-red-900/40"></div>
              <div className="flex-1 bg-orange-900/40"></div>
              <div className="flex-1 bg-yellow-900/40"></div>
              <div className="flex-1 bg-green-500/30 border-x-2 border-green-400/50"></div>
              <div className="flex-1 bg-yellow-900/40"></div>
              <div className="flex-1 bg-orange-900/40"></div>
              <div className="flex-1 bg-red-900/40"></div>
            </div>
            {/* Sweet spot indicator */}
            <div className="absolute top-0 bottom-0 left-[43%] w-[14%] border-2 border-green-400 rounded-full bg-green-400/10"></div>
            {/* Moving indicator */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-lg shadow-white/50 transition-none"
              style={{ left: `${timingPosition}%` }}
            ></div>
          </div>
          <button
            onClick={stopTimingMeter}
            className="w-full mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-3 rounded-xl text-lg hover:scale-[1.02] transition-all animate-pulse"
          >
            ⚡ HIT!
          </button>
        </div>
      )}

      {/* Shot Selection Grid */}
      {!showTimingMeter && (
        <div className="grid grid-cols-2 gap-3">
          {SHOTS.map(shot => (
            <button
              key={shot.type}
              onClick={() => startTimingMeter(shot.type)}
              disabled={isLoading}
              className={`bg-gradient-to-br ${shot.color} p-4 rounded-xl text-left hover:scale-[1.03] transition-all shadow-lg disabled:opacity-50 disabled:scale-100 group`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{shot.emoji}</span>
                <span className="text-white font-bold text-lg">{shot.label}</span>
              </div>
              <p className="text-white/70 text-xs">{shot.desc}</p>
              <span className={`text-xs font-semibold ${
                shot.risk === 'Low' ? 'text-green-300' :
                shot.risk === 'Medium' ? 'text-yellow-300' : 'text-red-300'
              }`}>
                Risk: {shot.risk}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Auto-Play (for testing/fast mode) */}
      {!showTimingMeter && (
        <button
          onClick={() => onPlayShot({ shotType: SHOTS[Math.floor(Math.random() * SHOTS.length)].type, timing: 'AVERAGE' })}
          disabled={isLoading}
          className="w-full mt-3 bg-white/5 border border-white/10 text-white/50 py-2 rounded-xl text-sm hover:bg-white/10 transition-all disabled:opacity-30"
        >
          🎲 Auto Play (Random)
        </button>
      )}
    </div>
  );
};

export default BattingPanel;
