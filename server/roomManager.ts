// server/roomManager.ts
import { v4 as uuidv4 } from 'uuid';
import {
  Room,
  TeamInfo,
  RoomPublicData,
  TeamPublicData,
  RoomSettings,
  Player,
  TeamLineup,
  TeamRanking,
} from './types';
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
    lineupSubmitted: false,
    lineup: undefined,
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
    rankings: [],
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
    lineupSubmitted: false,
    lineup: undefined,
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

  const oldSocketId = team.socketId;
  socketToRoom.delete(oldSocketId);

  team.socketId = socketId;
  team.isConnected = true;

  socketToRoom.set(socketId, { roomCode, teamId });

  return { success: true };
}

export function handleDisconnect(
  socketId: string
): { roomCode: string; teamId: string; newHostId?: string; newHostName?: string } | null {
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

  let anyConnected = false;
  for (const [, t] of room.teams) {
    if (t.isConnected) {
      anyConnected = true;
      break;
    }
  }

  if (!anyConnected) {
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
      lineupSubmitted: team.lineupSubmitted || false,
    });
  }

  return {
    code: room.code,
    teams,
    gameState: room.gameState,
    auction: room.auction,
    hostId: room.hostId,
    settings: room.settings,
    rankings: room.rankings || [],
  };
}

export function getTeamSkippedPlayers(roomCode: string, teamId: string): string[] {
  const room = rooms.get(roomCode);
  if (!room) return [];
  const team = room.teams.get(teamId);
  if (!team) return [];
  return team.skippedPlayers;
}

export function saveTeamLineup(
  roomCode: string,
  teamId: string,
  playingXI: string[],
  impactPlayerId: string | null
): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  const team = room.teams.get(teamId);
  if (!team) {
    return { success: false, error: 'Team not found' };
  }

  if (team.lineupSubmitted) {
    return { success: false, error: 'Lineup already submitted' };
  }

  const squadIds = new Set(team.squad.map((p) => p.player.id));

  for (const playerId of playingXI) {
    if (!squadIds.has(playerId)) {
      return { success: false, error: 'Invalid player in Playing XI' };
    }
  }

  if (impactPlayerId && !squadIds.has(impactPlayerId)) {
    return { success: false, error: 'Impact Player is not in your squad' };
  }

  if (impactPlayerId && playingXI.includes(impactPlayerId)) {
    return { success: false, error: 'Impact Player cannot also be in Playing XI' };
  }

  if (new Set(playingXI).size !== playingXI.length) {
    return { success: false, error: 'Duplicate players in Playing XI' };
  }

  const lineup: TeamLineup = {
    teamId,
    playingXI,
    impactPlayerId,
    submitted: true,
  };

  team.lineup = lineup;
  team.lineupSubmitted = true;

  return { success: true };
}

export function calculateRankings(roomCode: string): TeamRanking[] {
  const room = rooms.get(roomCode);
  if (!room) return [];

  const rankings: TeamRanking[] = [];

  for (const [, team] of room.teams) {
    if (!team.squad || team.squad.length === 0) {
      continue;
    }

    const lineup = team.lineup;

    if (!lineup || !lineup.submitted) {
      rankings.push({
        teamId: team.id,
        teamName: team.teamName,
        teamShortName: team.teamShortName,
        teamColor: team.teamColor,
        score: 0,
        rank: 0,
        playingXI: [],
        impactPlayer: null,
        isValidLineup: false,
        errorMessage: 'Lineup not submitted',
      });
      continue;
    }

    const squadPlayers = team.squad.map((s) => s.player);
    const playingXI = squadPlayers.filter((p) => lineup.playingXI.includes(p.id));
    const impactPlayer = squadPlayers.find((p) => p.id === lineup.impactPlayerId) || null;

    const requiredXI = Math.min(11, squadPlayers.length);

    if (playingXI.length !== requiredXI && !(squadPlayers.length >= 11 && playingXI.length === 11)) {
      rankings.push({
        teamId: team.id,
        teamName: team.teamName,
        teamShortName: team.teamShortName,
        teamColor: team.teamColor,
        score: 0,
        rank: 0,
        playingXI,
        impactPlayer,
        isValidLineup: false,
        errorMessage: `Playing XI must have ${Math.min(11, squadPlayers.length)} players`,
      });
      continue;
    }

    const overseasCount = playingXI.filter((p) => p.country !== 'India').length;
    if (overseasCount > 4) {
      rankings.push({
        teamId: team.id,
        teamName: team.teamName,
        teamShortName: team.teamShortName,
        teamColor: team.teamColor,
        score: 0,
        rank: 0,
        playingXI,
        impactPlayer,
        isValidLineup: false,
        errorMessage: `Too many overseas players (${overseasCount}/4)`,
      });
      continue;
    }

    const hasWKInSquad = squadPlayers.some((p) => p.role === 'Wicket-Keeper');
    const hasWKInXI = playingXI.some((p) => p.role === 'Wicket-Keeper');
    if (hasWKInSquad && !hasWKInXI) {
      rankings.push({
        teamId: team.id,
        teamName: team.teamName,
        teamShortName: team.teamShortName,
        teamColor: team.teamColor,
        score: 0,
        rank: 0,
        playingXI,
        impactPlayer,
        isValidLineup: false,
        errorMessage: 'Playing XI must include at least 1 Wicket-Keeper',
      });
      continue;
    }

    const xiAverage =
      playingXI.reduce((sum, p) => sum + (p.rating || 0), 0) / Math.max(playingXI.length, 1);

    const impactBonus = impactPlayer ? (impactPlayer.rating || 0) * 0.2 : 0;

    const roles = new Set(playingXI.map((p) => p.role));
    const balanceBonus = roles.size >= 3 ? 10 : 0;

    const battingDepth =
      playingXI.reduce((sum, p) => sum + (p.battingRating || 0), 0) / Math.max(playingXI.length, 1);
    const bowlingDepth =
      playingXI.reduce((sum, p) => sum + (p.bowlingRating || 0), 0) / Math.max(playingXI.length, 1);
    const depthBonus = (battingDepth + bowlingDepth) / 20;

    const totalScore = Math.round(xiAverage + impactBonus + balanceBonus + depthBonus);

    rankings.push({
      teamId: team.id,
      teamName: team.teamName,
      teamShortName: team.teamShortName,
      teamColor: team.teamColor,
      score: totalScore,
      rank: 0,
      playingXI,
      impactPlayer,
      isValidLineup: true,
    });
  }

  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((team, index) => {
    team.rank = index + 1;
  });

  room.rankings = rankings;
  return rankings;
}

export function resetAllLineups(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  for (const [, team] of room.teams) {
    team.lineupSubmitted = false;
    team.lineup = undefined;
  }
  room.rankings = [];
}

export { rooms, socketToRoom };
