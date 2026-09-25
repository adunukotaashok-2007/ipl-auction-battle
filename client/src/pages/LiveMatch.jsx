/**
 * LiveMatch.jsx
 * =============
 * The main game screen where cricket happens.
 * Handles toss, batting, bowling, scoreboard, and results.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TossScreen from '../components/game/TossScreen';
import BattingPanel from '../components/game/BattingPanel';
import BowlingPanel from '../components/game/BowlingPanel';
import Scoreboard from '../components/game/Scoreboard';
import CommentaryBox from '../components/game/CommentaryBox';
import MatchResult from '../components/game/MatchResult';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LiveMatch = () => {
  // Game flow states
  const [gamePhase, setGamePhase] = useState('SETUP'); // SETUP, TOSS, TOSS_DECISION, PLAYING, INNINGS_BREAK, RESULT
  const [matchId, setMatchId] = useState(null);
  const [isUserBatting, setIsUserBatting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Match data
  const [score, setScore] = useState(null);
  const [target, setTarget] = useState(null);
  const [requiredRuns, setRequiredRuns] = useState(null);
  const [requiredRate, setRequiredRate] = useState(null);
  const [currentBatsman, setCurrentBatsman] = useState(null);
  const [currentBowler, setCurrentBowler] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [lastBallResult, setLastBallResult] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [manOfMatch, setManOfMatch] = useState(null);
  const [tossInfo, setTossInfo] = useState(null);
  const [inningsBreakInfo, setInningsBreakInfo] = useState(null);

  // Teams config - these would come from your existing team selection
  const [team1Config, setTeam1Config] = useState(null);
  const [team2Config, setTeam2Config] = useState(null);
  const [difficulty, setDifficulty] = useState('MEDIUM');

  const commentaryRef = useRef(null);

  // ============ SETUP PHASE ============
  const startMatch = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use existing teams or generate defaults for testing
      const t1 = team1Config || generateTestTeam('Mumbai Indians', 'MI');
      const t2 = team2Config || generateTestTeam('Chennai Super Kings', 'CSK');

      const response = await fetch(`${API_BASE}/match/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1: t1,
          team2: t2,
          config: { difficulty, totalOvers: 20 }
        })
      });

      const data = await response.json();
      if (data.success) {
        setMatchId(data.matchId);
        setTeam1Config(t1);
        setTeam2Config(t2);
        setGamePhase('TOSS');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to create match. Check server connection.');
    }
    setIsLoading(false);
  };

  // ============ TOSS ============
  const handleToss = async (userCall, decision = null) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/match/${matchId}/toss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCall,
          decision,
          team1Data: team1Config,
          team2Data: team2Config,
          team1PlayingXI: team1Config?.playingXI,
          team2PlayingXI: team2Config?.playingXI
        })
      });

      const data = await response.json();

      if (data.needsDecision) {
        // User won toss - needs to choose bat/bowl
        setTossInfo({
          coinResult: data.tossResult,
          userWonToss: true,
          message: data.message
        });
        setGamePhase('TOSS_DECISION');
      } else if (data.success) {
        setTossInfo({
          coinResult: data.tossResult,
          userWonToss: data.userWonToss,
          tossWinner: data.tossWinner,
          decision: data.tossDecision,
          message: data.message
        });
        setIsUserBatting(data.matchState.isUserBatting);

        // Short delay then start playing
        setTimeout(() => {
          setGamePhase('PLAYING');
        }, 2000);
      }
    } catch (err) {
      setError('Toss failed. Try again.');
    }
    setIsLoading(false);
  };

  const handleTossDecision = async (decision) => {
    await handleToss(null, decision);
  };

  // ============ PLAY A BALL ============
  const playBall = async (action) => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/match/${matchId}/ball`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      // Update all state from response
      setLastBallResult(data.ball);
      setScore(data.score);
      setTarget(data.target);
      setRequiredRuns(data.requiredRuns);
      setRequiredRate(data.requiredRate);
      setCurrentBatsman(data.currentBatsman);
      setCurrentBowler(data.currentBowler);

      // Add commentary
      if (data.commentary && data.commentary.length > 0) {
        setCommentary(prev => [...data.commentary.reverse(), ...prev].slice(0, 100));
      }

      // Handle innings break
      if (data.isInningsComplete && !data.isMatchComplete) {
        setInningsBreakInfo(data.inningsBreak);
        setIsUserBatting(data.inningsBreak.isUserBattingNext);
        setGamePhase('INNINGS_BREAK');
      }

      // Handle match complete
      if (data.isMatchComplete) {
        setMatchResult(data.result);
        setManOfMatch(data.manOfMatch);
        setGamePhase('RESULT');
      }

    } catch (err) {
      setError('Failed to process ball. Check connection.');
    }
    setIsLoading(false);
  };

  // Continue after innings break
  const continueAfterBreak = () => {
    setGamePhase('PLAYING');
    setLastBallResult(null);
  };

  // Scroll commentary
  useEffect(() => {
    if (commentaryRef.current) {
      commentaryRef.current.scrollTop = 0;
    }
  }, [commentary]);

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-green-500/20 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏏 IPL Cricket Match
          </h1>
          {matchId && (
            <span className="text-green-400 text-sm font-mono">
              Match: {matchId.slice(0, 12)}...
            </span>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-6xl mx-auto mt-2 px-4">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 text-red-200 text-sm flex justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ===== SETUP PHASE ===== */}
        {gamePhase === 'SETUP' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="text-center">
              <h2 className="text-5xl font-bold text-white mb-4">🏏 Ready to Play?</h2>
              <p className="text-green-300 text-lg">Set up your match and hit the ground!</p>
            </div>

            {/* Difficulty Selection */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md">
              <h3 className="text-white text-lg font-semibold mb-4">Select Difficulty</h3>
              <div className="grid grid-cols-3 gap-3">
                {['EASY', 'MEDIUM', 'HARD'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      difficulty === d
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {d === 'EASY' ? '🟢' : d === 'MEDIUM' ? '🟡' : '🔴'} {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startMatch}
              disabled={isLoading}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xl px-12 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl shadow-yellow-500/30 disabled:opacity-50 disabled:scale-100"
            >
              {isLoading ? '⏳ Setting up...' : '🏏 Start Match'}
            </button>
          </div>
        )}

        {/* ===== TOSS PHASE ===== */}
        {(gamePhase === 'TOSS' || gamePhase === 'TOSS_DECISION') && (
          <TossScreen
            onToss={handleToss}
            onDecision={handleTossDecision}
            tossInfo={tossInfo}
            phase={gamePhase}
            isLoading={isLoading}
          />
        )}

        {/* ===== PLAYING PHASE ===== */}
        {gamePhase === 'PLAYING' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Scoreboard */}
            <div className="lg:col-span-1 space-y-4">
              <Scoreboard
                score={score}
                target={target}
                requiredRuns={requiredRuns}
                requiredRate={requiredRate}
                currentBatsman={currentBatsman}
                currentBowler={currentBowler}
                tossInfo={tossInfo}
              />
            </div>

            {/* Center Column - Game Action */}
            <div className="lg:col-span-1">
              {/* Last Ball Result */}
              {lastBallResult && (
                <div className={`mb-4 rounded-2xl p-4 text-center font-bold text-2xl transition-all duration-500 ${
                  lastBallResult.isWicket ? 'bg-red-500/30 border-2 border-red-500 text-red-200 animate-pulse' :
                  lastBallResult.runs === 6 ? 'bg-yellow-500/30 border-2 border-yellow-500 text-yellow-200' :
                  lastBallResult.runs === 4 ? 'bg-blue-500/30 border-2 border-blue-500 text-blue-200' :
                  lastBallResult.runs === 0 ? 'bg-gray-500/20 border border-gray-500/50 text-gray-300' :
                  'bg-green-500/20 border border-green-500/50 text-green-200'
                }`}>
                  {lastBallResult.isWicket ? '🔴 WICKET!' :
                   lastBallResult.isExtra ? `📢 ${lastBallResult.extraType?.toUpperCase()}` :
                   lastBallResult.runs === 6 ? '💥 SIX!' :
                   lastBallResult.runs === 4 ? '🏏 FOUR!' :
                   lastBallResult.runs === 0 ? '⚫ DOT BALL' :
                   `✅ ${lastBallResult.runs} RUN${lastBallResult.runs > 1 ? 'S' : ''}`}
                </div>
              )}

              {/* Batting or Bowling Panel */}
              {isUserBatting ? (
                <BattingPanel
                  onPlayShot={playBall}
                  isLoading={isLoading}
                  lastResult={lastBallResult}
                  currentBatsman={currentBatsman}
                />
              ) : (
                <BowlingPanel
                  onBowl={playBall}
                  isLoading={isLoading}
                  lastResult={lastBallResult}
                  currentBowler={currentBowler}
                />
              )}
            </div>

            {/* Right Column - Commentary */}
            <div className="lg:col-span-1">
              <CommentaryBox
                commentary={commentary}
                ref={commentaryRef}
              />
            </div>
          </div>
        )}

        {/* ===== INNINGS BREAK ===== */}
        {gamePhase === 'INNINGS_BREAK' && inningsBreakInfo && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 text-center max-w-lg">
              <h2 className="text-4xl font-bold text-white mb-4">🏏 Innings Break</h2>
              <div className="text-6xl font-bold text-yellow-400 mb-2">
                {inningsBreakInfo.firstInningsScore}/{inningsBreakInfo.firstInningsWickets}
              </div>
              <p className="text-green-300 text-xl mb-6">{inningsBreakInfo.message}</p>
              <div className="bg-yellow-500/20 rounded-xl p-4 mb-8">
                <p className="text-yellow-300 text-lg font-semibold">
                  🎯 Target: {inningsBreakInfo.target} runs
                </p>
                <p className="text-yellow-200/70 text-sm mt-1">
                  You will {inningsBreakInfo.isUserBattingNext ? 'BAT 🏏' : 'BOWL 🎯'} now
                </p>
              </div>
              <button
                onClick={continueAfterBreak}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg px-10 py-4 rounded-2xl hover:scale-105 transition-all shadow-xl"
              >
                Start 2nd Innings →
              </button>
            </div>
          </div>
        )}

        {/* ===== RESULT PHASE ===== */}
        {gamePhase === 'RESULT' && matchResult && (
          <MatchResult
            result={matchResult}
            manOfMatch={manOfMatch}
            matchId={matchId}
            onPlayAgain={() => {
              setGamePhase('SETUP');
              setMatchId(null);
              setScore(null);
              setCommentary([]);
              setLastBallResult(null);
              setMatchResult(null);
              setTossInfo(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

// Helper to generate test teams
function generateTestTeam(name, shortName) {
  const miPlayers = [
    { name: 'Rohit Sharma', role: 'BATSMAN', battingRating: 88, bowlingRating: 25, isCaptain: true },
    { name: 'Ishan Kishan', role: 'WICKET_KEEPER', battingRating: 78, bowlingRating: 10, isKeeper: true },
    { name: 'Suryakumar Yadav', role: 'BATSMAN', battingRating: 90, bowlingRating: 15 },
    { name: 'Tilak Varma', role: 'BATSMAN', battingRating: 75, bowlingRating: 20 },
    { name: 'Hardik Pandya', role: 'ALL_ROUNDER', battingRating: 80, bowlingRating: 72, bowlingType: 'FAST' },
    { name: 'Kieron Pollard', role: 'ALL_ROUNDER', battingRating: 76, bowlingRating: 45, bowlingType: 'FAST' },
    { name: 'Tim David', role: 'BATSMAN', battingRating: 74, bowlingRating: 10 },
    { name: 'Jasprit Bumrah', role: 'BOWLER', battingRating: 15, bowlingRating: 95, bowlingType: 'FAST' },
    { name: 'Trent Boult', role: 'BOWLER', battingRating: 12, bowlingRating: 85, bowlingType: 'FAST' },
    { name: 'Piyush Chawla', role: 'BOWLER', battingRating: 20, bowlingRating: 75, bowlingType: 'SPIN' },
    { name: 'Rahul Chahar', role: 'BOWLER', battingRating: 10, bowlingRating: 78, bowlingType: 'SPIN' }
  ];

  const cskPlayers = [
    { name: 'Ruturaj Gaikwad', role: 'BATSMAN', battingRating: 82, bowlingRating: 15 },
    { name: 'Devon Conway', role: 'BATSMAN', battingRating: 80, bowlingRating: 10 },
    { name: 'MS Dhoni', role: 'WICKET_KEEPER', battingRating: 75, bowlingRating: 5, isCaptain: true, isKeeper: true },
    { name: 'Ambati Rayudu', role: 'BATSMAN', battingRating: 74, bowlingRating: 25 },
    { name: 'Ravindra Jadeja', role: 'ALL_ROUNDER', battingRating: 78, bowlingRating: 82, bowlingType: 'SPIN' },
    { name: 'Moeen Ali', role: 'ALL_ROUNDER', battingRating: 72, bowlingRating: 70, bowlingType: 'SPIN' },
    { name: 'Shivam Dube', role: 'ALL_ROUNDER', battingRating: 70, bowlingRating: 40, bowlingType: 'FAST' },
    { name: 'Deepak Chahar', role: 'BOWLER', battingRating: 30, bowlingRating: 80, bowlingType: 'FAST' },
    { name: 'Tushar Deshpande', role: 'BOWLER', battingRating: 10, bowlingRating: 72, bowlingType: 'FAST' },
    { name: 'Maheesh Theekshana', role: 'BOWLER', battingRating: 8, bowlingRating: 78, bowlingType: 'SPIN' },
    { name: 'Matheesha Pathirana', role: 'BOWLER', battingRating: 5, bowlingRating: 76, bowlingType: 'FAST' }
  ];

  const players = shortName === 'MI' ? miPlayers : cskPlayers;

  return {
    name,
    shortName,
    playingXI: players
  };
}

export default LiveMatch;
