import React from 'react';

const Scoreboard = ({ score, target, requiredRuns, requiredRate, currentBatsman, currentBowler, tossInfo }) => {
  if (!score) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <p className="text-white/50 text-center">Waiting for match to start...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Score */}
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-lg">{score.battingTeam}</h3>
          <span className="text-white/40 text-xs">vs {score.bowlingTeam}</span>
        </div>

        {/* Score Display */}
        <div className="text-center my-4">
          <div className="text-5xl font-black text-white">
            {score.runs}<span className="text-white/50">/{score.wickets}</span>
          </div>
          <div className="text-green-400 text-lg font-mono mt-1">
            ({score.overs} overs)
          </div>
        </div>

        {/* Run Rate */}
        <div className="flex justify-between text-sm border-t border-white/10 pt-3">
          <div className="text-white/70">
            CRR: <span className="text-white font-bold">{score.runRate}</span>
          </div>
          {target && (
            <div className="text-yellow-400">
              Target: <span className="font-bold">{target}</span>
            </div>
          )}
        </div>

        {/* Required Runs */}
        {requiredRuns !== null && requiredRuns > 0 && (
          <div className="mt-2 bg-yellow-500/10 rounded-lg p-2 text-center">
            <span className="text-yellow-300 text-sm">
              Need <span className="font-bold text-yellow-400">{requiredRuns}</span> runs
              {requiredRate && <> @ <span className="font-bold text-yellow-400">{requiredRate}</span> rpo</>}
            </span>
          </div>
        )}
      </div>

      {/* Batsmen */}
      {currentBatsman && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h4 className="text-white/50 text-xs font-semibold uppercase mb-3">🏏 At the Crease</h4>
          
          {/* Striker */}
          {currentBatsman.striker && (
            <div className="flex justify-between items-center mb-2 bg-green-500/10 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">⚡</span>
                <span className="text-white font-semibold text-sm">{currentBatsman.striker}</span>
              </div>
              <div className="text-right">
                <span className="text-white font-bold">
                  {currentBatsman.strikerStats?.runs || 0}
                </span>
                <span className="text-white/40 text-xs ml-1">
                  ({currentBatsman.strikerStats?.balls || 0})
                </span>
                {currentBatsman.strikerStats?.fours > 0 && (
                  <span className="text-blue-400 text-xs ml-1">
                    {currentBatsman.strikerStats.fours}×4
                  </span>
                )}
                {currentBatsman.strikerStats?.sixes > 0 && (
                  <span className="text-yellow-400 text-xs ml-1">
                    {currentBatsman.strikerStats.sixes}×6
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Non-Striker */}
          {currentBatsman.nonStriker && (
            <div className="flex justify-between items-center bg-white/5 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs">○</span>
                <span className="text-white/70 text-sm">{currentBatsman.nonStriker}</span>
              </div>
              <div className="text-right">
                <span className="text-white/70 font-bold">
                  {currentBatsman.nonStrikerStats?.runs || 0}
                </span>
                <span className="text-white/30 text-xs ml-1">
                  ({currentBatsman.nonStrikerStats?.balls || 0})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Bowler */}
      {currentBowler && currentBowler.name && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <h4 className="text-white/50 text-xs font-semibold uppercase mb-2">🎯 Bowling</h4>
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold text-sm">{currentBowler.name}</span>
            <div className="text-right">
              <span className="text-white font-bold">
                {currentBowler.stats?.wickets || 0}/{currentBowler.stats?.runs || 0}
              </span>
              <span className="text-white/40 text-xs ml-1">
                ({currentBowler.stats?.overs || 0}.{(currentBowler.stats?.balls || 0) % 6})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Toss Info */}
      {tossInfo && (
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-white/40 text-xs">{tossInfo.message}</p>
        </div>
      )}
    </div>
  );
};

export default Scoreboard;
