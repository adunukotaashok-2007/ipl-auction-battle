export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export interface Player {
  id: string;
  name: string;
  photo: string;
  role: PlayerRole;
  country: string;
  basePrice: number;
  rating: number;
  battingRating: number;
  bowlingRating: number;
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
  | 'LINEUP_SELECTION'
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

export interface TeamLineup {
  teamId: string;
  playingXI: string[]; // Array of 11 Player IDs
  impactPlayerId: string | null; // 1 Player ID
  submitted: boolean;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamColor: string;
  score: number;
  rank: number;
  playingXI: Player[];
  impactPlayer: Player | null;
  isValidLineup: boolean;
  errorMessage?: string;
}

export interface RoomSettings {
  initialPurse: number;
  maxSquadSize: number;
  bidIncrement: number;
  auctionTimerSeconds: number;
  maxPlayers: number;
}

// ----------------------------------------------------
// INTERNAL SERVER TYPES (Used in mapping & game logic)
// ----------------------------------------------------
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
  skippedPlayers: string[]; // Array of IDs
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  maxSquadSize: number;
  lineupSubmitted?: boolean;
  lineup?: TeamLineup;
}

export interface Room {
  code: string;
  hostId: string;
  teams: Map<string, TeamInfo>;
  gameState: GameState;
  auction: AuctionState;
  playerPool: Player[];
  auctionOrder: string[];
  createdAt: number;
  settings: RoomSettings;
  rankings?: TeamRanking[];
}

// ----------------------------------------------------
// PUBLIC TYPES (Data safely sent to the clients)
// ----------------------------------------------------
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
  lineupSubmitted?: boolean;
}

export interface RoomPublicData {
  code: string;
  hostId: string;
  teams: TeamPublicData[];
  gameState: GameState;
  auction: AuctionState;
  rankings?: TeamRanking[];
  settings: RoomSettings;
}
