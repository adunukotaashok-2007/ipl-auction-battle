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
  const [myTeamId, setMyTeamId] = useState<string | null>(() => localStorage.getItem('ipl_team_id'));
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [soldAnimation, setSoldAnimation] = useState<{ player: Player; teamName: string; price: number } | null>(null);
  const [unsoldAnimation, setUnsoldAnimation] = useState<{ player: Player } | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      const savedRoomCode = localStorage.getItem('ipl_room_code') || roomData?.roomCode || (roomData as any)?.code;
      const savedTeamId = localStorage.getItem('ipl_team_id') || myTeamId;
      const savedUserName = localStorage.getItem('ipl_user_name') || 'Manager';

      if (savedRoomCode && savedTeamId) {
        socket.emit('rejoin-room', { roomCode: savedRoomCode, teamId: savedTeamId, userName: savedUserName });
        socket.emit('join-room', { 
          roomCode: savedRoomCode, 
          teamId: savedTeamId, 
          playerName: savedUserName, 
          userName: savedUserName 
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomCreated(data: { roomCode?: string; code?: string; teamId: string }) {
      const activeCode = data.roomCode || data.code || '';
      if (activeCode) localStorage.setItem('ipl_room_code', activeCode);
      if (data.teamId) localStorage.setItem('ipl_team_id', data.teamId);
      setMyTeamId(data.teamId);
      setError(null);
    }

    function onRoomJoined(data: { roomCode?: string; code?: string; teamId: string }) {
      const activeCode = data.roomCode || data.code || '';
      if (activeCode) localStorage.setItem('ipl_room_code', activeCode);
      if (data.teamId) localStorage.setItem('ipl_team_id', data.teamId);
      setMyTeamId(data.teamId);
      setError(null);
    }

    function onRoomUpdated(state: RoomPublicData) {
      setRoomData(state);
      const activeCode = state.roomCode || (state as any).code;
      if (activeCode) localStorage.setItem('ipl_room_code', activeCode);
    }

    function onMatchUpdated(state: LiveMatchState) {
      setMatchState(state);
    }

    function onReconnected(data: { teamId: string }) {
      setMyTeamId(data.teamId);
      localStorage.setItem('ipl_team_id', data.teamId);
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

    if (socket.connected) {
      onConnect();
    }

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
  }, []);

  const getActiveRoomCode = () => roomData?.roomCode || (roomData as any)?.code || localStorage.getItem('ipl_room_code') || '';

  const createRoom = (userName: string, teamName?: string, teamShortName?: string, teamColor?: string, teamLogo?: string) => {
    localStorage.setItem('ipl_user_name', userName);
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
    const cleanCode = roomCode.trim().toUpperCase();
    localStorage.setItem('ipl_room_code', cleanCode);
    localStorage.setItem('ipl_user_name', userName);
    socket.emit('join-room', { 
      roomCode: cleanCode, 
      playerName: userName,
      userName, 
      teamName: teamName || 'Chennai Super Kings', 
      teamShortName: teamShortName || 'CSK', 
      teamColor: teamColor || '#FFFF00', 
      teamLogo: teamLogo || '🦁' 
    });
  };

  const leaveRoom = () => {
    socket.emit('leave-room', { roomCode: getActiveRoomCode(), teamId: myTeamId });
    localStorage.removeItem('ipl_room_code');
    localStorage.removeItem('ipl_team_id');
    localStorage.removeItem('ipl_user_name');
    setRoomData(null);
    setMatchState(null);
    setMyTeamId(null);
  };

  const toggleReady = () => {
    socket.emit('toggle-ready', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const startAuction = () => {
    socket.emit('start-auction', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const placeBid = (amount?: number | any) => {
    const bidVal = typeof amount === 'number' ? amount : undefined;
    socket.emit('place-bid', { 
      roomCode: getActiveRoomCode(), 
      teamId: myTeamId, 
      amount: bidVal, 
      bidAmount: bidVal 
    });
  };

  const skipPlayer = () => {
    socket.emit('skip-player', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const pauseAuction = () => {
    socket.emit('pause-auction', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const resumeAuction = () => {
    socket.emit('resume-auction', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const nextPlayer = () => {
    socket.emit('next-player', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const endAuction = () => {
    socket.emit('end-auction', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const restartAuction = () => {
    socket.emit('restart-auction', { roomCode: getActiveRoomCode(), teamId: myTeamId });
  };

  const submitLineup = (playerIds: string[]) => {
    socket.emit('submit-lineup', { 
      roomCode: getActiveRoomCode(), 
      teamId: myTeamId, 
      playingXI: playerIds, 
      lineup: playerIds, 
      impactPlayerId: null 
    });
  };

  const startMatch = (overs: number = 2) => {
    socket.emit('start-match', { roomCode: getActiveRoomCode(), teamId: myTeamId, overs });
  };

  const submitDelivery = (delivery: DeliveryInput) => {
    socket.emit('submit-delivery', { roomCode: getActiveRoomCode(), teamId: myTeamId, ...delivery });
  };

  const submitShot = (shot: ShotInput) => {
    socket.emit('submit-shot', { roomCode: getActiveRoomCode(), teamId: myTeamId, ...shot });
  };

  const clearError = () => setError(null);
  const clearNotification = () => setNotification(null);

  const myTeam = roomData?.teams.find((t: TeamPublicData) => t.id === myTeamId) || null;
  const isHost = (roomData?.hostId === myTeamId) || (myTeam?.isHost ?? false);

  const skippedPlayers: string[] = (roomData?.auction?.unsoldPlayers || []).map((p: any) => 
    typeof p === 'string' ? p : p.id || p.name
  );

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
