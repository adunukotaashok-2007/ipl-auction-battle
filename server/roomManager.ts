// server/roomManager.ts
import { v4 as uuidv4 } from 'uuid';
import { Room, TeamInfo, RoomPublicData, TeamPublicData, RoomSettings, Player } from './types';
import { playerDatabase } from './players';

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, { roomCode: string; teamId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createRoom(
  socketId: string,
  playerName: string,
  teamName: string,
  teamShortName: string,
  teamColor: string,
  teamLogo: string
): { roomCode: string; teamId: string } | null {
  const roomCode = generateRoomCode();
  const teamId = uuidv4();

  const defaultSettings: RoomSettings = {
    initialPurse: 120,
    maxSquadSize: 25,
    bidIncrement: 0.25,
    auctionTimerSeconds: 15,
    maxPlayers: 10,
  };

  const team: TeamInfo = {
    id: teamId,
    socketId,
    playerName,
    teamName,
    teamShortName,
    teamColor,
    teamLogo,
    purse: defaultSettings.initialPurse,
    initialPurse: defaultSettings.initialPurse,
    squad: [],
    skippedPlayers: [],
    isReady: false,
    isConnected: true,
    isHost: true,
    maxSquadSize: defaultSettings.maxSquadSize,
  };

  const shuffledPlayers = shuffleArray([...playerDatabase]);

  const room: Room = {
    code: roomCode,
    teams: new Map([[teamId, team]]),
    gameState: 'LOBBY',
    auction: {
      currentPlayer: null,
      currentBid: 0,
      highestBidderId: null,
      highestBidderName: null,
      auctionTimer: defaultSettings.auctionTimerSeconds,
      maxTimer: defaultSettings.auctionTimerSeconds,
      bidIncrement: defaultSettings.bidIncrement,
      auctionedPlayerIds: [],
      soldPlayers: [],
      unsoldPlayers: [],
      currentPlayerIndex: -1,
      totalPlayers: shuffledPlayers.length,
      auctionRound: 1,
      isPaused: false,
    },
    playerPool: shuffledPlayers,
    auctionOrder: shuffledPlayers.map((p) => p.id),
    hostId: teamId,
    createdAt: Date.now(),
    settings: defaultSettings,
  };

  rooms.set(roomCode, room);
  socketToRoom.set(socketId, { roomCode, teamId });

  return { roomCode, teamId };
}

export function joinRoom(
  socketId: string,
  roomCode: string,
  playerName: string,
  teamName: string,
  teamShortName: string,
  teamColor: string,
  teamLogo: string
): { teamId: string; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) {
    return { teamId: '', error: 'Room not found' };
  }

  if (room.gameState !== 'LOBBY') {
    return { teamId: '', error: 'Auction already in progress' };
  }

  if (room.teams.size >= room.settings.maxPlayers) {
    return { teamId: '', error: 'Room is full (max 10 players)' };
  }

  // Check for duplicate team names
  for (const [, existingTeam] of room.teams) {
    if (existingTeam.teamName.toLowerCase() === teamName.toLowerCase() && existingTeam.isConnected) {
      return { teamId: '', error: 'Team name already taken in this room' };
    }
  }

  const teamId = uuidv4();

  const team: TeamInfo = {
    id: teamId,
    socketId,
    playerName,
    teamName,
    teamShortName,
    teamColor,
    teamLogo,
    purse: room.settings.initialPurse,
    initialPurse: room.settings.initialPurse,
    squad: [],
    skippedPlayers: [],
    isReady: false,
    isConnected: true,
    isHost: false,
    maxSquadSize: room.settings.maxSquadSize,
  };

  room.teams.set(teamId, team);
  socketToRoom.set(socketId, { roomCode, teamId });

  return { teamId };
}

export function rejoinRoom(
  socketId: string,
  roomCode: string,
  teamId: string
): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  const team = room.teams.get(teamId);
  if (!team) {
    return { success: false, error: 'Team not found in room' };
  }

  // Remove old socket mapping
  const oldSocketId = team.socketId;
  socketToRoom.delete(oldSocketId);

  team.socketId = socketId;
  team.isConnected = true;

  socketToRoom.set(socketId, { roomCode, teamId });

  return { success: true };
}

export function handleDisconnect(socketId: string): { roomCode: string; teamId: string; newHostId?: string; newHostName?: string } | null {
  const mapping = socketToRoom.get(socketId);
  if (!mapping) return null;

  const { roomCode, teamId } = mapping;
  const room = rooms.get(roomCode);
  if (!room) {
    socketToRoom.delete(socketId);
    return null;
  }

  const team = room.teams.get(teamId);
  if (!team) {
    socketToRoom.delete(socketId);
    return null;
  }

  team.isConnected = false;
  socketToRoom.delete(socketId);

  let newHostId: string | undefined;
  let newHostName: string | undefined;

  // Transfer host if needed
  if (room.hostId === teamId) {
    for (const [id, t] of room.teams) {
      if (t.isConnected && id !== teamId) {
        room.hostId = id;
        t.isHost = true;
        team.isHost = false;
        newHostId = id;
        newHostName = t.teamName;
        break;
      }
    }
  }

  // Check if room is empty
  let anyConnected = false;
  for (const [, t] of room.teams) {
    if (t.isConnected) {
      anyConnected = true;
      break;
    }
  }

  if (!anyConnected) {
    // Clean up room after 5 minutes
    setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r) {
        let stillEmpty = true;
        for (const [, t] of r.teams) {
          if (t.isConnected) {
            stillEmpty = false;
            break;
          }
        }
        if (stillEmpty) {
          rooms.delete(roomCode);
        }
      }
    }, 5 * 60 * 1000);
  }

  return { roomCode, teamId, newHostId, newHostName };
}

export function toggleReady(socketId: string): { roomCode: string } | null {
  const mapping = socketToRoom.get(socketId);
  if (!mapping) return null;

  const room = rooms.get(mapping.roomCode);
  if (!room) return null;

  const team = room.teams.get(mapping.teamId);
  if (!team) return null;

  team.isReady = !team.isReady;
  return { roomCode: mapping.roomCode };
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function getRoomBySocket(socketId: string): { room: Room; teamId: string } | null {
  const mapping = socketToRoom.get(socketId);
  if (!mapping) return null;

  const room = rooms.get(mapping.roomCode);
  if (!room) return null;

  return { room, teamId: mapping.teamId };
}

export function getSocketMapping(socketId: string): { roomCode: string; teamId: string } | undefined {
  return socketToRoom.get(socketId);
}

export function getRoomPublicData(room: Room): RoomPublicData {
  const teams: TeamPublicData[] = [];

  for (const [, team] of room.teams) {
    teams.push({
      id: team.id,
      playerName: team.playerName,
      teamName: team.teamName,
      teamShortName: team.teamShortName,
      teamColor: team.teamColor,
      teamLogo: team.teamLogo,
      purse: team.purse,
      initialPurse: team.initialPurse,
      squad: team.squad,
      skippedPlayerCount: team.skippedPlayers.length,
      isReady: team.isReady,
      isConnected: team.isConnected,
      isHost: team.isHost,
      squadSize: team.squad.length,
      maxSquadSize: team.maxSquadSize,
    });
  }

  return {
    code: room.code,
    teams,
    gameState: room.gameState,
    auction: room.auction,
    hostId: room.hostId,
    settings: room.settings,
  };
}

export function getTeamSkippedPlayers(roomCode: string, teamId: string): string[] {
  const room = rooms.get(roomCode);
  if (!room) return [];
  const team = room.teams.get(teamId);
  if (!team) return [];
  return team.skippedPlayers;
}

export { rooms, socketToRoom };
