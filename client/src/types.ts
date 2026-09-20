// client/src/types.ts

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

// Updated GameState to include LINEUP_SELECTION and MATCH_PLAYING phases
export type GameState =
  | 'LOBBY'
  | 'PLAYER_REVEAL'
  | 'AUCTION'
  | 'SOLD'
  | 'UNSOLD'
  | 'NEXT_PLAYER'
  | 'PAUSED'
  | 'LINEUP_SELECTION'
  | 'MATCH_PLAYING'
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

// ----------------------------------------------------
// REALISTIC MATCH ENGINE TYPES
// ----------------------------------------------------

export type PitchZone = 'YORKER' | 'GOOD_LENGTH' | 'SHORT' | 'FULL_TOSS';
export type PitchLine = 'OUTSIDE_OFF' | 'MIDDLE' | 'LEG';
export type ShotDirection = 'OFF' | 'STRAIGHT' | 'LEG';
export type ShotType = 'GROUND' | 'LOFTED';

export interface DeliveryInput {
  zone: PitchZone;
  line: PitchLine;
  speed: number;
}

export interface ShotInput {
  direction: ShotDirection;
  shotType: ShotType;
  timing: number; // 0.0 to 1.0 (1.0 = perfect)
}

export interface BallOutcome {
  runs: number;
  isWicket: boolean;
  wicketType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'STUMPED' | 'RUN OUT';
  isExtra: boolean;
  extraType?: 'WIDE' | 'NO_BALL';
  commentary: string;
  shotQuality: 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISSED';
}

export interface BallRecord {
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  bowlerName: string;
  strikerId: string;
  strikerName: string;
  runs: number;
  isWicket: boolean;
  commentary: string;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  overs: number;
  legalBalls: number;
  maxOvers: number;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string;
  battingLineup: Player[];
  bowlingLineup: Player[];
  nextBatterIndex: number;
  oversHistory: BallRecord[];
  isCompleted: boolean;
}

export interface LiveMatchState {
  roomCode: string;
  totalOvers: number;
  currentInnings: 1 | 2;
  innings1: InningsState;
  innings2?: InningsState;
  phase: 'AWAITING_DELIVERY' | 'BALL_IN_FLIGHT' | 'RESULT_SHOWCASE' | 'MATCH_OVER';
  pendingDelivery?: DeliveryInput;
  lastOutcome?: BallOutcome;
  winnerTeamId?: string;
  winningMargin?: string;
}

// ----------------------------------------------------
// TEAM & ROOM TYPES
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
