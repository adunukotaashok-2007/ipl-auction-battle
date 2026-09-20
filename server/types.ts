// server/types.ts

export type PlayerRole =
  | 'Batsman'
  | 'Bowler'
  | 'All-Rounder'
  | 'Wicket-Keeper';

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
  soldPlayers: {
    player: Player;
    teamId: string;
    price: number;
  }[];
  unsoldPlayers: string[];
  currentPlayerIndex: number;
  totalPlayers: number;
  auctionRound: number;
  isPaused: boolean;
}

export interface TeamLineup {
  teamId: string;
  playingXI: string[];
  impactPlayerId: string | null;
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
// REALISTIC MATCH ENGINE TYPES
// ----------------------------------------------------

export type PitchZone =
  | 'YORKER'
  | 'GOOD_LENGTH'
  | 'SHORT'
  | 'FULL_TOSS';

export type PitchLine =
  | 'OUTSIDE_OFF'
  | 'MIDDLE'
  | 'LEG';

export type ShotDirection =
  | 'OFF'
  | 'STRAIGHT'
  | 'LEG';

export type ShotType =
  | 'GROUND'
  | 'LOFTED';

export interface DeliveryInput {
  zone: PitchZone;
  line: PitchLine;
  speed: number;
}

export interface ShotInput {
  direction: ShotDirection;
  shotType: ShotType;
  timing: number;
}

export interface BallOutcome {
  runs: number;
  isWicket: boolean;
  wicketType?:
    | 'BOWLED'
    | 'CAUGHT'
    | 'LBW'
    | 'STUMPED'
    | 'RUN OUT';
  isExtra: boolean;
  extraType?: 'WIDE' | 'NO_BALL';
  commentary: string;
  shotQuality:
    | 'PERFECT'
    | 'GOOD'
    | 'EARLY'
    | 'LATE'
    | 'MISSED';
}

// ----------------------------------------------------
// BALL RECORD
// ----------------------------------------------------

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

// ----------------------------------------------------
// OVER SUMMARY
//
// This is separate from BallRecord because an over
// summary does NOT contain complete ball information.
// ----------------------------------------------------

export interface OverSummary {
  bowlerId: string;
  overs: number;
}

// ----------------------------------------------------
// INNINGS STATE
// ----------------------------------------------------

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

  // Each item represents a completed over.
  oversHistory: OverSummary[];

  isCompleted: boolean;
}

// ----------------------------------------------------
// LIVE MATCH STATE
// ----------------------------------------------------

export interface LiveMatchState {
  roomCode: string;

  totalOvers: number;

  currentInnings: 1 | 2;

  innings1: InningsState;

  innings2?: InningsState;

  phase:
    | 'AWAITING_DELIVERY'
    | 'BALL_IN_FLIGHT'
    | 'RESULT_SHOWCASE'
    | 'MATCH_OVER';

  pendingDelivery?: DeliveryInput;

  lastOutcome?: BallOutcome;

  winnerTeamId?: string;

  winningMargin?: string;
}

// ----------------------------------------------------
// INTERNAL SERVER TYPES
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

  skippedPlayers: string[];

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
// PUBLIC TYPES
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
