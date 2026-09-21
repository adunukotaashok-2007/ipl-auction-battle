import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../socket';
import { 
  RoomPublicData, 
  DeliveryInput, 
  ShotInput, 
  LiveMatchState 
} from '../types';

interface GameContextType {
  roomData: RoomPublicData | null;
  matchState: LiveMatchState | null;
  myTeamId: string | null;
  currentTeamId: string | null;
  isConnected: boolean;
  error: string | null;
  createRoom: (userName: string) => void;
  joinRoom: (roomCode: string, userName: string) => void;
  toggleReady: () => void;
  startAuction: () => void;
  placeBid: (amount: number) => void;
  skipPlayer: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  nextPlayer: () => void;
  restartAuction: () => void;
  submitLineup: (playerIds: string[]) => void;
  startMatch: (overs?: number) => void;
  submitDelivery: (delivery: DeliveryInput) => void;
  submitShot: (shot: ShotInput) => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomData, setRoomData] = useState<RoomPublicData | null>(null);
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      const savedRoomCode = roomData?.code;
      if (savedRoomCode && myTeamId) {
        socket.emit('rejoin-room', { roomCode: savedRoomCode, teamId: myTeamId });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated(data: { roomState: RoomPublicData; teamId: string }) {
      setRoomData(data.roomState);
      setMyTeamId(data.teamId);
      setError(null);
    }

    function onRoomJoined(data: { roomState: RoomPublicData; teamId: string; matchState?: LiveMatchState }) {
      setRoomData(data.roomState);
      setMyTeamId(data.teamId);
      if (data.matchState) setMatchState(data.matchState);
      setError(null);
    }

    function onRoomUpdated(state: RoomPublicData) {
      setRoomData(state);
    }

    function onMatchUpdated(state: LiveMatchState) {
      setMatchState(state);
    }

    function onReconnected(data: { roomState: RoomPublicData; teamId: string; matchState?: LiveMatchState }) {
      setRoomData(data.roomState);
      setMyTeamId(data.teamId);
      if (data.matchState) setMatchState(data.matchState);
    }

    function onError(message: string) {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('room-updated', onRoomUpdated);
    socket.on('match-updated', onMatchUpdated);
    socket.on('reconnected', onReconnected);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('room-updated', onRoomUpdated);
      socket.off('match-updated', onMatchUpdated);
      socket.off('reconnected', onReconnected);
      socket.off('error', onError);
    };
  }, [roomData?.code, myTeamId]);

  const createRoom = (userName: string) => {
    socket.emit('create-room', { userName });
  };

  const joinRoom = (roomCode: string, userName: string) => {
    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), userName });
  };

  const toggleReady = () => {
    socket.emit('toggle-ready');
  };

  const startAuction = () => {
    socket.emit('start-auction');
  };

  const placeBid = (amount: number) => {
    socket.emit('place-bid', { amount });
  };

  const skipPlayer = () => {
    socket.emit('skip-player');
  };

  const pauseAuction = () => {
    socket.emit('pause-auction');
  };

  const resumeAuction = () => {
    socket.emit('resume-auction');
  };

  const nextPlayer = () => {
    socket.emit('next-player');
  };

  const restartAuction = () => {
    socket.emit('restart-auction');
  };

  const submitLineup = (playerIds: string[]) => {
    socket.emit('submit-lineup', { playerIds });
  };

  const startMatch = (overs: number = 2) => {
    socket.emit('start-match', { overs });
  };

  const submitDelivery = (delivery: DeliveryInput) => {
    socket.emit('submit-delivery', delivery);
  };

  const submitShot = (shot: ShotInput) => {
    socket.emit('submit-shot', shot);
  };

  const clearError = () => setError(null);

  const value = {
    roomData,
    matchState,
    myTeamId,
    currentTeamId: myTeamId,
    isConnected,
    error,
    createRoom,
    joinRoom,
    toggleReady,
    startAuction,
    placeBid,
    skipPlayer,
    pauseAuction,
    resumeAuction,
    nextPlayer,
    restartAuction,
    submitLineup,
    startMatch,
    submitDelivery,
    submitShot,
    clearError,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
