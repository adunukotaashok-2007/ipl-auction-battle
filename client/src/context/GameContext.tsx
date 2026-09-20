// client/src/context/GameContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import socket from '../socket';
import {
  RoomPublicData,
  TeamPublicData,
  AuctionState,
  Player,
  LiveMatchState,
  PitchZone,
  PitchLine,
  ShotDirection,
  ShotType,
} from '../types';

interface GameContextType {
  roomData: RoomPublicData | null;
  myTeamId: string | null;
  myTeam: TeamPublicData | null;
  isHost: boolean;
  skippedPlayers: string[];
  notification: string | null;
  soldAnimation: { player: Player; teamName: string; price: number } | null;
  unsoldAnimation: { player: Player } | null;
  connected: boolean;
  matchState: LiveMatchState | null;

  createRoom: (playerName: string, teamName: string, teamShortName: string, teamColor: string, teamLogo: string) => void;
  joinRoom: (roomCode: string, playerName: string, teamName: string, teamShortName: string, teamColor: string, teamLogo: string) => void;
  toggleReady: () => void;
  startAuction: () => void;
  placeBid: () => void;
  skipPlayer: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  nextPlayer: () => void;
  endAuction: () => void;
  restartAuction: () => void;
  submitLineup: (playingXI: string[], impactPlayerId: string | null) => void;
  leaveRoom: () => void;
  clearNotification: () => void;

  // NEW MATCH FUNCTIONS
  startMatch: () => void;
  submitDelivery: (zone: PitchZone, line: PitchLine, speed: number) => void;
  submitShot: (direction: ShotDirection, shotType: ShotType, timing: number) => void;
}

const GameContext = createContext<GameContextType>({} as GameContextType);

export function useGame(): GameContextType {
  return useContext(GameContext);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [roomData, setRoomData] = useState<RoomPublicData | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [skippedPlayers, setSkippedPlayers] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [soldAnimation, setSoldAnimation] = useState<{ player: Player; teamName: string; price: number } | null>(null);
  const [unsoldAnimation, setUnsoldAnimation] = useState<{ player: Player } | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [matchState, setMatchState] = useState<LiveMatchState | null>(null);

  const myTeam = roomData?.teams.find((t) => t.id === myTeamId) || null;
  const isHost = roomData?.hostId === myTeamId;

  useEffect(() => {
    // Restore session
    const storedTeam = localStorage.getItem('ipl_team_id');
    if (storedTeam) {
      setMyTeamId(storedTeam);
    }
  }, []);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onRoomCreated(data: { roomCode: string; teamId: string }) {
      localStorage.setItem('ipl_room_code', data.roomCode);
      localStorage.setItem('ipl_team_id', data.teamId);
      setMyTeamId(data.teamId);
    }

    function onRoomJoined(data: { teamId: string }) {
      localStorage.setItem('ipl_team_id', data.teamId);
      setMyTeamId(data.teamId);
    }

    function onReconnected(data: { teamId: string }) {
      setMyTeamId(data.teamId);
      showNotification('Reconnected successfully!');
    }

    function onRoomUpdated(data: RoomPublicData) {
      setRoomData(data);
      localStorage.setItem('ipl_room_code', data.code);
    }

    function onAuctionUpdated(data: AuctionState) {
      setRoomData((prev) => (prev ? { ...prev, auction: data } : null));
    }

    function onPlayerSold(data: { player: Player; teamId: string; teamName: string; price: number }) {
      setSoldAnimation({ player: data.player, teamName: data.teamName, price: data.price });
      setTimeout(() => setSoldAnimation(null), 4000);
    }

    function onPlayerUnsold(data: { player: Player }) {
      setUnsoldAnimation({ player: data.player });
      setTimeout(() => setUnsoldAnimation(null), 3000);
    }

    function onBidPlaced(data: { teamId: string; teamName: string; amount: number }) {
      showNotification(`${data.teamName} bid ₹${data.amount.toFixed(2)} Cr`);
    }

    function onTimerUpdate(data: { timer: number }) {
      setRoomData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          auction: { ...prev.auction, auctionTimer: data.timer },
        };
      });
    }

    function onError(data: { message: string }) {
      showNotification(`❌ ${data.message}`);
    }

    function onHostChanged(data: { newHostId: string; newHostName: string }) {
      showNotification(`👑 ${data.newHostName} is now the host`);
    }

    function onSkipList(data: { skippedPlayers: string[] }) {
      setSkippedPlayers(data.skippedPlayers);
    }

    function onAuctionFinished() {
      showNotification('🏆 Auction Complete! Select your Playing XI & Impact Player!');
    }

    // NEW: Match update listener
    function onMatchUpdated(data: LiveMatchState) {
      setMatchState(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-created', onRoomCreated);
    socket.on('room-joined', onRoomJoined);
    socket.on('reconnected', onReconnected);
    socket.on('room-updated', onRoomUpdated);
    socket.on('auction-updated', onAuctionUpdated);
    socket.on('player-sold', onPlayerSold);
    socket.on('player-unsold', onPlayerUnsold);
    socket.on('bid-placed', onBidPlaced);
    socket.on('timer-update', onTimerUpdate);
    socket.on('error', onError);
    socket.on('host-changed', onHostChanged);
    socket.on('your-skip-list', onSkipList);
    socket.on('auction-finished', onAuctionFinished);
    socket.on('match-updated', onMatchUpdated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-created', onRoomCreated);
      socket.off('room-joined', onRoomJoined);
      socket.off('reconnected', onReconnected);
      socket.off('room-updated', onRoomUpdated);
      socket.off('auction-updated', onAuctionUpdated);
      socket.off('player-sold', onPlayerSold);
      socket.off('player-unsold', onPlayerUnsold);
      socket.off('bid-placed', onBidPlaced);
      socket.off('timer-update', onTimerUpdate);
      socket.off('error', onError);
      socket.off('host-changed', onHostChanged);
      socket.off('your-skip-list', onSkipList);
      socket.off('auction-finished', onAuctionFinished);
      socket.off('match-updated', onMatchUpdated);
    };
  }, []);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const createRoom = useCallback(
    (playerName: string, teamName: string, teamShortName: string, teamColor: string, teamLogo: string) => {
      socket.emit('create-room', { playerName, teamName, teamShortName, teamColor, teamLogo });
    },
    []
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string, teamName: string, teamShortName: string, teamColor: string, teamLogo: string) => {
      socket.emit('join-room', { roomCode, playerName, teamName, teamShortName, teamColor, teamLogo });
    },
    []
  );

  const toggleReadyFn = useCallback(() => {
    socket.emit('toggle-ready');
  }, []);

  const startAuctionFn = useCallback(() => {
    socket.emit('start-auction');
  }, []);

  const placeBidFn = useCallback(() => {
    socket.emit('place-bid');
  }, []);

  const skipPlayerFn = useCallback(() => {
    socket.emit('skip-player');
  }, []);

  const pauseAuctionFn = useCallback(() => {
    socket.emit('pause-auction');
  }, []);

  const resumeAuctionFn = useCallback(() => {
    socket.emit('resume-auction');
  }, []);

  const nextPlayerFn = useCallback(() => {
    socket.emit('next-player');
  }, []);

  const endAuctionFn = useCallback(() => {
    socket.emit('end-auction');
  }, []);

  const restartAuctionFn = useCallback(() => {
    socket.emit('restart-auction');
  }, []);

  const submitLineupFn = useCallback((playingXI: string[], impactPlayerId: string | null) => {
    socket.emit('submit-lineup', { playingXI, impactPlayerId });
  }, []);

  // NEW MATCH EMITTERS
  const startMatchFn = useCallback(() => {
    socket.emit('start-match');
  }, []);

  const submitDeliveryFn = useCallback(
    (zone: PitchZone, line: PitchLine, speed: number) => {
      socket.emit('submit-delivery', { zone, line, speed });
    },
    []
  );

  const submitShotFn = useCallback(
    (direction: ShotDirection, shotType: ShotType, timing: number) => {
      socket.emit('submit-shot', { direction, shotType, timing });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('ipl_room_code');
    localStorage.removeItem('ipl_team_id');
    setRoomData(null);
    setMyTeamId(null);
    setSkippedPlayers([]);
    setMatchState(null);
    window.location.reload();
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <GameContext.Provider
      value={{
        roomData,
        myTeamId,
        myTeam,
        isHost,
        skippedPlayers,
        notification,
        soldAnimation,
        unsoldAnimation,
        connected,
        matchState,
        createRoom,
        joinRoom,
        toggleReady: toggleReadyFn,
        startAuction: startAuctionFn,
        placeBid: placeBidFn,
        skipPlayer: skipPlayerFn,
        pauseAuction: pauseAuctionFn,
        resumeAuction: resumeAuctionFn,
        nextPlayer: nextPlayerFn,
        endAuction: endAuctionFn,
        restartAuction: restartAuctionFn,
        submitLineup: submitLineupFn,
        startMatch: startMatchFn,
        submitDelivery: submitDeliveryFn,
        submitShot: submitShotFn,
        leaveRoom,
        clearNotification,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
