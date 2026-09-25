import React, { useState } from 'react';

const TossScreen = ({ onToss, onDecision, tossInfo, phase, isLoading }) => {
  const [coinSide, setCoinSide] = useState(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleCoinFlip = (call) => {
    setCoinSide(call);
    setIsFlipping(true);

    // Animate then call
    setTimeout(() => {
      onToss(call);
      setIsFlipping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 text-center max-w-lg w-full">
        {/* Pre-toss */}
        {phase === 'TOSS' && !tossInfo && (
          <>
            <h2 className="text-4xl font-bold text-white mb-2">🪙 Toss Time!</h2>
            <p className="text-green-300 mb-8">Call it in the air!</p>

            {/* Coin Animation */}
            <div className="mb-8">
              <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl font-bold text-yellow-900 shadow-2xl shadow-yellow-500/30 ${
                isFlipping ? 'animate-spin' : 'hover:scale-110 transition-transform'
              }`}>
                {isFlipping ? '🪙' : coinSide || '?'}
              </div>
            </div>

            {/* Call Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleCoinFlip('HEADS')}
                disabled={isLoading || isFlipping}
                className="bg-gradient-to-br from-yellow-500 to-amber-600 text-black font-bold py-4 px-6 rounded-2xl text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                👑 HEADS
              </button>
              <button
                onClick={() => handleCoinFlip('TAILS')}
                disabled={isLoading || isFlipping}
                className="bg-gradient-to-br from-gray-400 to-gray-600 text-black font-bold py-4 px-6 rounded-2xl text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                🦅 TAILS
              </button>
            </div>
          </>
        )}

        {/* Toss Result - Need Decision */}
        {phase === 'TOSS_DECISION' && tossInfo?.userWonToss && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">You Won the Toss!</h2>
            <p className="text-green-300 mb-2">It was {tossInfo.coinResult}!</p>
            <p className="text-white/70 mb-8">What would you like to do?</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => onDecision('BAT')}
                disabled={isLoading}
                className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold py-4 px-6 rounded-2xl text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                🏏 BAT First
              </button>
              <button
                onClick={() => onDecision('BOWL')}
                disabled={isLoading}
                className="bg-gradient-to-br from-red-500 to-red-700 text-white font-bold py-4 px-6 rounded-2xl text-lg hover:scale-105 transition-all shadow-lg disabled:opacity-50"
              >
                🎯 BOWL First
              </button>
            </div>
          </>
        )}

        {/* Toss Result - AI Won or Decision Made */}
        {tossInfo && !tossInfo.userWonToss && phase === 'TOSS' && (
          <>
            <div className="text-6xl mb-4">😤</div>
            <h2 className="text-3xl font-bold text-white mb-2">Opponent Won the Toss!</h2>
            <p className="text-yellow-300 text-lg mb-2">{tossInfo.message}</p>
            <p className="text-white/50 text-sm">Match starting...</p>
            <div className="mt-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </>
        )}

        {tossInfo?.decision && phase !== 'TOSS_DECISION' && tossInfo.userWonToss && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-white mb-2">{tossInfo.message}</h2>
            <p className="text-white/50 text-sm">Match starting...</p>
            <div className="mt-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TossScreen;
