import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socket } from '../socket';
import { RoomPublicData, GameState, LiveMatchState, DeliveryInput, ShotInput } from '../types';

interface GameContextType {
  roomState: RoomPublicData | null;
  matchState: LiveMatchState | null;
  currentTeamId: string | null;
  error: string | null;
  clearError: () => void;
  startMatch: (overs?: number) => void;
  submitDelivery: (delivery: DeliveryInput) => void;
  submitShot: (shot: ShotInput) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roomState, setRoomState] = useState<RoomPublicData | null>(null);
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.on('room-updated', (data: RoomPublicData) => {
      setRoomState(data);
    });

    socket.on('room-joined', (data: { teamId: string }) => {
      setCurrentTeamId(data.teamId);
    });

    socket.on('room-created', (data: { teamId: string }) => {
      setCurrentTeamId(data.teamId);
    });

    socket.on('reconnected', (data: { teamId: string }) => {
      setCurrentTeamId(data.teamId);
    });

    socket.on('match-updated', (match: LiveMatchState) => {
      setMatchState(match);
    });

    socket.on('error', (payload: { message: string }) => {
      console.error('[Server Error]', payload.message);
      setError(payload.message);
    });

    return () => {
      socket.off('room-updated');
      socket.off('room-joined');
      socket.off('room-created');
      socket.off('reconnected');
      socket.off('match-updated');
      socket.off('error');
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // NEW: Accept overs parameter (defaults to 2)
  const startMatch = useCallback((overs: number = 2) => {
    socket.emit('start-match', { overs });
  }, []);

  const submitDelivery = useCallback((delivery: DeliveryInput) => {
    socket.emit('submit-delivery', delivery);
  }, []);

  const submitShot = useCallback((shot: ShotInput) => {
    socket.emit('submit-shot', shot);
  }, []);

  return (
    <GameContext.Provider
      value={{
        roomState,
        matchState,
        currentTeamId,
        error,
        clearError,
        startMatch,
        submitDelivery,
        submitShot,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
