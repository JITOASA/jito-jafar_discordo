/**
 * Frontend TypeScript Interfaces for جعفر Bot Dashboard
 */

export interface BotStatus {
  connected: boolean;
  readyAt: string | null;
  user: {
    id: string;
    tag: string;
    username: string;
    avatar: string;
  } | null;
  guildsCount: number;
  lastError: string | null;
  hasToken: boolean;
  hasClientId: boolean;
  botName: string;
  version: string;
  database?: {
    type: string;
    isPostgresConnected: boolean;
    hasDatabaseUrl: boolean;
  };
}

export interface PlayerScore {
  userId: string;
  username: string;
  points: number;
  totalWins: number;
  games: {
    reverse: number;
    flags: number;
    harf?: number;
    xo?: number;
    hide_and_seek?: number;
    chairs?: number;
    roulette?: number;
  };
  firstSeen: string;
  lastWon: string | null;
}

export interface BotConfig {
  bot: {
    name: string;
    tagline: string;
    version: string;
    prefix: string;
    defaultLocale: string;
  };
  discord: {
    token: string;
    clientId: string;
    guildId: string;
  };
  colors: {
    primary: number;
    success: number;
    warning: number;
    error: number;
    gold: number;
    gameReverse: number;
    gameFlags: number;
    gameHarf?: number;
    gameXO?: number;
  };
  games: {
    reverse: {
      name: string;
      id: string;
      description: string;
      timerSeconds: number;
      pointsPerWin: number;
      minWordLength: number;
      maxWordLength: number;
    };
    flags: {
      name: string;
      id: string;
      description: string;
      timerSeconds: number;
      pointsPerWin: number;
    };
    harf?: {
      name: string;
      id: string;
      description: string;
      timerSeconds: number;
      pointsPerWin: number;
    };
    xo?: {
      name: string;
      id: string;
      description: string;
      moveTimeoutSeconds: number;
      pointsPerWin: number;
    };
  };
}

export interface ReverseQuestion {
  word: string;
  category: string;
  difficulty: string;
  reversed: string;
  timerSeconds: number;
  points: number;
}

export interface FlagQuestion {
  flag: string;
  flagImageUrl: string;
  name: string;
  code: string;
  region: string;
  aliases: string[];
  timerSeconds: number;
  points: number;
}

export interface GameRegistryEntry {
  id: string;
  name: string;
  emoji: string;
  command: string;
  slashCommand?: string;
  type: 'solo' | 'multiplayer';
  status: 'available' | 'upcoming';
  description?: string;
}

export interface TournamentRewards {
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string;
}

export interface TournamentParticipant {
  userId: string;
  username: string;
  points: number;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled';
  startDate: string; // ISO string
  endDate?: string;
  durationMinutes?: number;
  selectedGames: string[];
  createdBy: string;
  createdAt: string;
  rewards: TournamentRewards;
  participants: string[]; // List of usernames or user IDs
  tournamentPoints: Record<string, number>; // username/id -> points
}

export interface XOState {
  board: Array<string | null>;
  currentTurn: 'X' | 'O';
  player1Name: string;
  player2Name: string;
  winner: 'X' | 'O' | null;
  winningCombo: number[] | null;
  isDraw: boolean;
}
