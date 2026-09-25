import React from 'react';

const DELIVERIES = [
  { type: 'FAST', emoji: '💨', label: 'Fast', desc: 'Full pace delivery', color: 'from-red-600 to-red-800' },
  { type: 'SHORT', emoji: '⬆️', label: 'Short', desc: 'Bouncer/Short pitch', color: 'from-orange-500 to-orange-700' },
  { type: 'YORKER', emoji: '🎯', label: 'Yorker', desc: 'Full at the base', color: 'from-purple-600 to-purple-800' },
  { type: 'SPIN', emoji: '🌀', label: 'Spin', desc: 'Turn & flight', color: 'from-blue-500 to-blue-700' },
  { type: 'SLOWER', emoji: '🐢', label: 'Slower', desc: 'Change of pace', color: 'from-teal-500 to-teal-700' }
];

const BowlingPanel = ({ onBowl, isLoading, lastResult, currentBowler }) => {
  const handleBowl = (deliveryType) => {
    onBowl({ deliveryType });
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🎯 Your Bowling</h3>
        {currentBowler && (
          <span className="text-red-400 text-sm font-semibold">
            🔴 {currentBowler.name} ({currentBowler.stats?.wickets || 0}/{currentBowler.stats?.runs || 0})
          </span>
        )}
      </div>

      <p className="text-white/60 text-sm mb-4">Choose your delivery wisely!</p>

      {/* Delivery Selection */}
      <div className="space-y-3">
        {DELIVERIES.map(delivery => (
          <button
            key={delivery.type}
            onClick={() => handleBowl(delivery.type)}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r ${delivery.color} p-4 rounded-xl text-left hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50 disabled:scale-100 flex items-center gap-4`}
          >
            <span className="text-3xl">{delivery.emoji}</span>
            <div>
              <span className="text-white font-bold text-lg">{delivery.label}</span>
              <p className="text-white/60 text-xs">{delivery.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Auto-Bowl */}
      <button
        onClick={() => handleBowl(DELIVERIES[Math.floor(Math.random() * DELIVERIES.length)].type)}
        disabled={isLoading}
        className="w-full mt-3 bg-white/5 border border-white/10 text-white/50 py-2 rounded-xl text-sm hover:bg-white/10 transition-all disabled:opacity-30"
      >
        🎲 Auto Bowl (Random)
      </button>
    </div>
  );
};

export default BowlingPanel;
