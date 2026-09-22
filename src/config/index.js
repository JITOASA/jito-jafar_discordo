/**
 * Central Configuration for "جعفر" (Ja'far) Discord Mini-Games Bot
 * All game timers, score settings, and embed colors are configured here.
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Bot metadata
  bot: {
    name: 'جعفر',
    tagline: 'بوت ألعاب وسوالف ديسكورد العربية',
    version: '1.0.0',
    prefix: '!', // Fallback prefix if text commands are used
    defaultLocale: 'ar',
  },

  // Discord Credentials from Environment Variables
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '', // Optional guild ID for instant testing
  },

  // Embed Color Theme (Hex numeric format for discord.js)
  colors: {
    primary: 0x5865F2,   // Blurple / Discord Blue
    success: 0x57F287,   // Green
    warning: 0xFEE75C,   // Yellow
    error: 0xED4245,     // Red
    gold: 0xF1C40F,      // Trophy Gold
    gameReverse: 0x9B59B6, // Purple for Reverse game
    gameFlags: 0x3498DB,   // Sky Blue for Flags game
    gameXO: 0xE67E22,      // Warm Orange for XO game
    gameHarf: 0x2ECC71,    // Emerald Green for Harf game
    gameGuessNumber: 0xE74C3C, // Crimson Red for Guess Number game
    gameFastest: 0xF39C12,     // Amber Gold for Fastest game
    gameDisassemble: 0x16A085, // Teal / Cyan for Disassemble game
    gameCorrect: 0xD35400,     // Dark Orange for Correct game
  },

  // Game Settings (Centralized for future dashboard control)
  games: {
    // لعبة أسرع (Fastest text typing game)
    fastest: {
      name: 'أسرع',
      id: 'fastest',
      description: 'أسرع كتابة للنص المطلوب!',
      timerSeconds: 15,
      pointsPerWin: 10,
    },
    // لعبة اعكس (Reverse text game)
    reverse: {
      name: 'اعكس',
      id: 'reverse',
      description: 'أسرع لاعب يكتب الكلمة المعطاة بالعكس!',
      timerSeconds: 15, // Default countdown: 15 seconds
      pointsPerWin: 10,
      minWordLength: 3,
      maxWordLength: 12,
    },

    // لعبة أعلام (Country flag guessing game)
    flags: {
      name: 'أعلام',
      id: 'flags',
      description: 'خمن اسم الدولة من علم الإيموجي المعروض!',
      timerSeconds: 15, // Default countdown: 15 seconds
      pointsPerWin: 10,
    },

    // لعبة XO (Tic-Tac-Toe game)
    xo: {
      name: 'XO',
      id: 'xo',
      description: 'لعبة إكس أو الشهيرة بين لاعبين (X و O)!',
      moveTimeoutSeconds: 60, // 60 seconds per move or turn
      pointsPerWin: 10,
    },

    // لعبة حرف (Letter & Category guessing game)
    harf: {
      name: 'حرف',
      id: 'harf',
      description: 'أسرع لاعب يكتب كلمة تبدأ بالحرف المطلوب وضمن التصنيف المحدد!',
      timerSeconds: 15, // Default countdown: 15 seconds
      pointsPerWin: 10,
    },

    // لعبة خمن الرقم (Guess the secret number game)
    guessNumber: {
      name: 'خمن الرقم',
      id: 'guess_number',
      description: 'تخمين الرقم السري بين 1 و 100 في غضون 60 ثانية!',
      timerSeconds: 60,
      cooldownSeconds: 2,
      pointsPerWin: 10,
    },

    // لعبة زر (Button speed click game)
    button: {
      name: 'زر',
      id: 'button',
      description: 'الضغط السريع على الزر الصحيح بأسرع وقت!',
      timerSeconds: 10,
      pointsPerWin: 10,
    },
    // لعبة فكك (Disassemble word game)
    disassemble: {
      name: 'فكك',
      id: 'disassemble',
      description: 'فكك الكلمة المعطاة إلى حروف مفصولة بمسافات!',
      timerSeconds: 15,
      pointsPerWin: 10,
    },
    // لعبة صحح (Correct spelling error game)
    correct: {
      name: 'صحح',
      id: 'correct',
      description: 'تصحيح الخطأ الإملائي في الجملة المعطاة!',
      timerSeconds: 15,
      pointsPerWin: 10,
    },
  },

  // Database / Storage Settings
  storage: {
    databaseUrl: process.env.DATABASE_URL || '',
    dataPath: './data',
    scoresFile: './data/scores.json',
    settingsFile: './data/settings.json',
  },
};

export default config;
