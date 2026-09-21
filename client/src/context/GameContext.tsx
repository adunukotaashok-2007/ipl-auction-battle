import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../socket';
import { 
  RoomPublicData, 
  DeliveryInput, 
  ShotInput, 
  LiveMatchState,
  TeamPublicData,
  Player
} from '../types';

export interface GameContextType {
  roomData: RoomPublicData | null;
  roomState: RoomPublicData | null;
  matchState: LiveMatchState | null;
  myTeamId: string | null;
  currentTeamId: string | null;
  myTeam: TeamPublicData | null;
  isHost: boolean;
  isConnected: boolean;
  connected: boolean;
  error: string | null;
  notification: string | null;
  soldAnimation: { player: Player; teamName: string; price: number } | null;
  unsoldAnimation: { player: Player } | null;
  skippedPlayers: string[];
  clearNotification: () => void;
  clearError: () => void;
  createRoom: (userName: string, teamName?: string, teamShortName?: string, teamColor?: string, teamLogo?: string) => void;
  joinRoom: (roomCode: string, userName: string, teamName?: string, teamShortName?: string, teamColor?: string, teamLogo?: string) => void;
  leaveRoom: () => void;
  toggleReady: () => void;
  startAuction: () => void;
  placeBid: (amount?: number | any) => void;
  skipPlayer: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  nextPlayer: () => void;
  endAuction: () => void;
  restartAuction: () => void;
  submitLineup: (playerIds: string[]) => void;
  startMatch: (overs?: number) => void;
  submitDelivery: (delivery: DeliveryInput) => void;
  submitShot: (shot: ShotInput) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roomData, setRoomData] = useState<RoomPublicData | null>(null);
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [soldAnimation, setSoldAnimation] = useState<{ player: Player; teamName: string; price: number } | null>(null);
  const [unsoldAnimation, setUnsoldAnimation] = useState<{ player: Player } | null>(null);

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

    function onRoomCreated(data: { roomCode: string; teamId: string }) {
      setMyTeamId(data.teamId);
      setError(null);
    }

    function onRoomJoined(data: { teamId: string }) {
      setMyTeamId(data.teamId);
      setError(null);
    }

    function onRoomUpdated(state: RoomPublicData) {
      setRoomData(state);
    }

    function onMatchUpdated(state: LiveMatchState) {
      setMatchState(state);
    }

    function onReconnected(data: { teamId: string }) {
      setMyTeamId(data.teamId);
    }

    function onPlayerSold(data: { player: Player; teamName: string; price: number }) {
      setSoldAnimation(data);
      setTimeout(() => setSoldAnimation(null), 3500);
    }

    function onPlayerUnsold(data: { player: Player }) {
      setUnsoldAnimation(data);
      setTimeout(() => setUnsoldAnimation(null), 3000);
    }

    function onNotification(msg: string) {
      setNotification(msg);
      setTimeout(() => setNotification(null), 4000);
    }

    function onError(data: any) {
      const message = typeof data === 'string' ? data : data?.message || 'An error occurred';
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
    socket.on('player-sold', onPlayerSold);
    socket.on('player-unsold', onPlayerUnsold);
    socket.on('notification', onNotification);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('room-updated', onRoomUpdated);
      socket.off('match-updated', onMatchUpdated);
      socket.off('reconnected', onReconnected);
      socket.off('player-sold', onPlayerSold);
      socket.off('player-unsold', onPlayerUnsold);
      socket.off('notification', onNotification);
      socket.off('error', onError);
    };
  }, [roomData?.code, myTeamId]);

  const createRoom = (userName: string, teamName?: string, teamShortName?: string, teamColor?: string, teamLogo?: string) => {
    socket.emit('create-room', { 
      playerName: userName,
      userName, 
      teamName: teamName || 'Royal Challengers Bengaluru', 
      teamShortName: teamShortName || 'RCB', 
      teamColor: teamColor || '#EC1C24', 
      teamLogo: teamLogo || '🔴' 
    });
  };

  const joinRoom = (roomCode: string, userName: string, teamName?: string, teamShortName?: string, teamColor?: string, teamLogo?: string) => {
    socket.emit('join-room', { 
      roomCode: roomCode.toUpperCase(), 
      playerName: userName,
      userName, 
      teamName: teamName || 'Chennai Super Kings', 
      teamShortName: teamShortName || 'CSK', 
      teamColor: teamColor || '#FFFF00', 
      teamLogo: teamLogo || '🦁' 
    });
  };

  const leaveRoom = () => {
    socket.emit('leave-room');
    setRoomData(null);
    setMatchState(null);
    setMyTeamId(null);
  };

  const toggleReady = () => socket.emit('toggle-ready');
  const startAuction = () => socket.emit('start-auction');

  const placeBid = (amount?: number | any) => {
    const bidVal = typeof amount === 'number' ? amount : undefined;
    socket.emit('place-bid', { amount: bidVal });
  };

  const skipPlayer = () => socket.emit('skip-player');
  const pauseAuction = () => socket.emit('pause-auction');
  const resumeAuction = () => socket.emit('resume-auction');
  const nextPlayer = () => socket.emit('next-player');
  const endAuction = () => socket.emit('end-auction');
  const restartAuction = () => socket.emit('restart-auction');
  const submitLineup = (playerIds: string[]) => socket.emit('submit-lineup', { playingXI: playerIds, impactPlayerId: null });
  const startMatch = (overs: number = 2) => socket.emit('start-match', { overs });
  const submitDelivery = (delivery: DeliveryInput) => socket.emit('submit-delivery', delivery);
  const submitShot = (shot: ShotInput) => socket.emit('submit-shot', shot);

  const clearError = () => setError(null);
  const clearNotification = () => setNotification(null);

  const myTeam = roomData?.teams.find((t: TeamPublicData) => t.id === myTeamId) || null;
  const isHost = myTeam?.isHost ?? false;
  const skippedPlayers: string[] = roomData?.auction?.unsoldPlayers || [];

  const value: GameContextType = {
    roomData,
    roomState: roomData,
    matchState,
    myTeamId,
    currentTeamId: myTeamId,
    myTeam,
    isHost,
    isConnected,
    connected: isConnected,
    error,
    notification,
    soldAnimation,
    unsoldAnimation,
    skippedPlayers,
    clearNotification,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startAuction,
    placeBid,
    skipPlayer,
    pauseAuction,
    resumeAuction,
    nextPlayer,
    endAuction,
    restartAuction,
    submitLineup,
    startMatch,
    submitDelivery,
    submitShot
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
