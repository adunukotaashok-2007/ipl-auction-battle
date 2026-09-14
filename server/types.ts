// server/types.ts
export interface Player {
  id: string;
  name: string;
  photo: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
  country: string;
  basePrice: number;
  rating: number;
  battingRating: number;
  bowlingRating: number;
}

export interface TeamInfo {
  id: string;
  socketId: string;
  playerName: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  teamLogo: string;
  purse: number;
  initialPurse: number;
  squad: PurchasedPlayer[];
  skippedPlayers: string[];
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  maxSquadSize: number;
}

export interface PurchasedPlayer {
  player: Player;
  purchasePrice: number;
}

export type GameState =
  | 'LOBBY'
  | 'PLAYER_REVEAL'
  | 'AUCTION'
  | 'SOLD'
  | 'UNSOLD'
  | 'NEXT_PLAYER'
  | 'PAUSED'
  | 'FINISHED';

export interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  auctionTimer: number;
  maxTimer: number;
  bidIncrement: number;
  auctionedPlayerIds: string[];
  soldPlayers: { player: Player; teamId: string; price: number }[];
  unsoldPlayers: string[];
  currentPlayerIndex: number;
  totalPlayers: number;
  auctionRound: number;
  isPaused: boolean;
}

export interface Room {
  code: string;
  teams: Map<string, TeamInfo>;
  gameState: GameState;
  auction: AuctionState;
  playerPool: Player[];
  auctionOrder: string[];
  hostId: string;
  createdAt: number;
  settings: RoomSettings;
}

export interface RoomSettings {
  initialPurse: number;
  maxSquadSize: number;
  bidIncrement: number;
  auctionTimerSeconds: number;
  maxPlayers: number;
}

export interface RoomPublicData {
  code: string;
  teams: TeamPublicData[];
  gameState: GameState;
  auction: AuctionState;
  hostId: string;
  settings: RoomSettings;
}

export interface TeamPublicData {
  id: string;
  playerName: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  teamLogo: string;
  purse: number;
  initialPurse: number;
  squad: PurchasedPlayer[];
  skippedPlayerCount: number;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  squadSize: number;
  maxSquadSize: number;
}

export interface ClientEvents {
  'create-room': (data: { playerName: string; teamName: string; teamShortName: string; teamColor: string; teamLogo: string }) => void;
  'join-room': (data: { roomCode: string; playerName: string; teamName: string; teamShortName: string; teamColor: string; teamLogo: string }) => void;
  'rejoin-room': (data: { roomCode: string; teamId: string }) => void;
  'toggle-ready': () => void;
  'start-auction': () => void;
  'place-bid': () => void;
  'skip-player': () => void;
  'pause-auction': () => void;
  'resume-auction': () => void;
  'next-player': () => void;
  'end-auction': () => void;
  'restart-auction': () => void;
  'disconnect': () => void;
}

export interface ServerEvents {
  'room-created': (data: { roomCode: string; teamId: string }) => void;
  'room-joined': (data: { teamId: string }) => void;
  'room-updated': (data: RoomPublicData) => void;
  'auction-updated': (data: AuctionState) => void;
  'player-sold': (data: { player: Player; teamId: string; teamName: string; price: number }) => void;
  'player-unsold': (data: { player: Player }) => void;
  'auction-finished': () => void;
  'bid-placed': (data: { teamId: string; teamName: string; amount: number }) => void;
  'player-skipped': (data: { teamId: string; playerId: string }) => void;
  'timer-update': (data: { timer: number }) => void;
  'error': (data: { message: string }) => void;
  'reconnected': (data: { teamId: string }) => void;
  'host-changed': (data: { newHostId: string; newHostName: string }) => void;
  'your-skip-list': (data: { skippedPlayers: string[] }) => void;
}
