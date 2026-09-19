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

export interface PurchasedPlayer {
  player: Player;
  purchasePrice: number;
}

// Updated GameState to include LINEUP_SELECTION phase
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

// Lineup submitted by each player
export interface TeamLineup {
  teamId: string;
  playingXI: string[]; // 11 Player IDs
  impactPlayerId: string | null; // 1 Player ID
  submitted: boolean;
}

// Final calculated rankings after auction
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
  teams: TeamPublicData[];
  gameState: GameState;
  auction: AuctionState;
  hostId: string;
  rankings?: TeamRanking[];
  settings: {
    initialPurse: number;
    maxSquadSize: number;
    bidIncrement: number;
    auctionTimerSeconds: number;
    maxPlayers: number;
  };
}

export interface IPLTeamPreset {
  name: string;
  shortName: string;
  color: string;
  logo: string;
}

export const IPL_TEAMS: IPLTeamPreset[] = [
  { name: 'Chennai Super Kings', shortName: 'CSK', color: '#FFFF00', logo: '🦁' },
  { name: 'Mumbai Indians', shortName: 'MI', color: '#004BA0', logo: '🔵' },
  { name: 'Royal Challengers Bengaluru', shortName: 'RCB', color: '#EC1C24', logo: '🔴' },
  { name: 'Kolkata Knight Riders', shortName: 'KKR', color: '#3A225D', logo: '🟣' },
  { name: 'Sunrisers Hyderabad', shortName: 'SRH', color: '#FF822A', logo: '🟠' },
  { name: 'Rajasthan Royals', shortName: 'RR', color: '#EA1A85', logo: '🩷' },
  { name: 'Delhi Capitals', shortName: 'DC', color: '#17479E', logo: '🔷' },
  { name: 'Punjab Kings', shortName: 'PBKS', color: '#DD1F2D', logo: '❤️' },
  { name: 'Gujarat Titans', shortName: 'GT', color: '#1C1C1C', logo: '⚫' },
  { name: 'Lucknow Super Giants', shortName: 'LSG', color: '#A72056', logo: '🩵' },
];
