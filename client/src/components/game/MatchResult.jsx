import React, { useState, useEffect } from 'react';

const MatchResult = ({ result, manOfMatch, matchId, onPlayAgain }) => {
  const [showScorecard, setShowScorecard] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const [isLoadingScorecard, setIsLoadingScorecard] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const loadScorecard = async () => {
    setIsLoadingScorecard(true);
    try {
      const response = await fetch(`${API_BASE}/match/${matchId}/scorecard`);
      const data = await response.json();
      if (data.success) {
        setScorecard(data.scorecard);
        setShowScorecard(true);
      }
    } catch (err) {
      console.error('Failed to load scorecard');
    }
    setIsLoadingScorecard(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Result Card */}
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-3xl p-12 text-center max-w-2xl w-full border border-white/10 shadow-2xl">
        {/* Trophy */}
        <div className="text-8xl mb-4 animate-bounce">
          {result.winner ? '🏆' : '🤝'}
        </div>

        {/* Result Text */}
        <h2 className="text-3xl font-black text-white mb-4">
          {result.winner ? 'MATCH RESULT' : 'IT\'S A TIE!'}
        </h2>

        <p className="text-xl text-green-400 font-bold mb-6">{result.description}</p>

        {/* Scores */}
        {result.scores && (
          <div className="grid grid-cols-2 gap-6 mb-8">
            {Object.entries(result.scores).map(([team, score]) => (
              <div key={team} className={`p-4 rounded-xl ${
                result.winner === team ? 'bg-green-500/20 border-2 border-green-500/50' : 'bg-white/5 border border-white/10'
              }`}>
                <p className="text-white/60 text-sm capitalize">{team.replace('team', 'Team ')}</p>
                <p className={`text-3xl font-bold ${result.winner === team ? 'text-green-400' : 'text-white'}`}>
                  {score}
                </p>
                {result.winner === team && <span className="text-green-400 text-sm">🏆 Winner</span>}
              </div>
            ))}
          </div>
        )}

        {/* Man of the Match */}
        {manOfMatch && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
            <p className="text-yellow-400/70 text-sm font-semibold uppercase mb-2">🌟 Player of the Match</p>
            <p className="text-yellow-300 text-2xl font-bold">{manOfMatch.name}</p>
            {manOfMatch.team && (
              <p className="text-yellow-400/60 text-sm mt-1 capitalize">{manOfMatch.team.replace('team', 'Team ')}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={onPlayAgain}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-2xl hover:scale-105 transition-all shadow-lg"
          >
            🔄 Play Again
          </button>
          <button
            onClick={loadScorecard}
            disabled={isLoadingScorecard}
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-3 px-8 rounded-2xl hover:scale-105 transition-all shadow-lg disabled:opacity-50"
          >
            📊 {isLoadingScorecard ? 'Loading...' : 'View Scorecard'}
          </button>
        </div>
      </div>

      {/* Full Scorecard Modal */}
      {showScorecard && scorecard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-gray-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">📊 Full Scorecard</h3>
              <button
                onClick={() => setShowScorecard(false)}
                className="text-white/50 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {Object.entries(scorecard.innings).map(([innNum, inn]) => (
              <div key={innNum} className="mb-8">
                <h4 className="text-lg font-bold text-green-400 mb-4 border-b border-white/10 pb-2">
                  {inn.battingTeam} Innings - {inn.score} ({inn.overs} ov)
                  <span className="text-white/40 text-sm ml-2">RR: {inn.runRate}</span>
                </h4>

                {/* Batting Table */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="text-left py-2 px-2">Batter</th>
                        <th className="text-left py-2 px-2">Dismissal</th>
                        <th className="text-right py-2 px-1">R</th>
                        <th className="text-right py-2 px-1">B</th>
                        <th className="text-right py-2 px-1">4s</th>
                        <th className="text-right py-2 px-1">6s</th>
                        <th className="text-right py-2 px-2">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.batting.map((bat, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-white/80">
                          <td className="py-2 px-2 font-semibold">
                            {bat.name}
                            {bat.isStriker && <span className="text-green-400 text-xs ml-1">⚡</span>}
                          </td>
                          <td className="py-2 px-2 text-white/40 text-xs">{bat.dismissal}</td>
                          <td className="text-right py-2 px-1 font-bold">{bat.runs}</td>
                          <td className="text-right py-2 px-1 text-white/50">{bat.balls}</td>
                          <td className="text-right py-2 px-1 text-blue-400">{bat.fours}</td>
                          <td className="text-right py-2 px-1 text-yellow-400">{bat.sixes}</td>
                          <td className="text-right py-2 px-2 text-white/60">{bat.strikeRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extras */}
                <div className="text-white/40 text-xs mb-4 px-2">
                  Extras: {inn.extras.total} (w{inn.extras.wides}, nb{inn.extras.noBalls}, b{inn.extras.byes})
                </div>

                {/* Bowling Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="text-left py-2 px-2">Bowler</th>
                        <th className="text-right py-2 px-1">O</th>
                        <th className="text-right py-2 px-1">M</th>
                        <th className="text-right py-2 px-1">R</th>
                        <th className="text-right py-2 px-1">W</th>
                        <th className="text-right py-2 px-2">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inn.bowling.map((bowl, idx) => (
                        <tr key={idx} className="border-b border-white/5 text-white/80">
                          <td className="py-2 px-2 font-semibold">{bowl.name}</td>
                          <td className="text-right py-2 px-1">{bowl.overs}</td>
                          <td className="text-right py-2 px-1 text-white/50">{bowl.maidens}</td>
                          <td className="text-right py-2 px-1">{bowl.runs}</td>
                          <td className="text-right py-2 px-1 font-bold text-green-400">{bowl.wickets}</td>
                          <td className="text-right py-2 px-2 text-white/60">{bowl.economy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fall of Wickets */}
                {inn.fallOfWickets && inn.fallOfWickets.length > 0 && (
                  <div className="mt-3 px-2">
                    <p className="text-white/30 text-xs mb-1">Fall of Wickets:</p>
                    <p className="text-white/50 text-xs">
                      {inn.fallOfWickets.map((fow, i) =>
                        `${fow.score}/${fow.wicketNumber} (${fow.batsman}, ${fow.overs})`
                      ).join(' • ')}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {/* Match Result */}
            {scorecard.result && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 font-bold">{scorecard.result.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchResult;
