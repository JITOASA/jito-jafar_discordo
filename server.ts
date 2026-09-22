/**
 * Full-Stack Server for جعفر (Ja'far) Discord Bot & Dashboard
 * Runs Express API + Vite Middleware and initializes Discord Bot process if credentials exist.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { config } from './src/config/index.js';
import { startBot, getBotStatus } from './src/index.js';
import db from './src/database/index.js';
import { getRandomReverseWord, ARABIC_WORDS } from './src/games/datasets/words.js';
import { getRandomCountry, COUNTRIES } from './src/games/datasets/countries.js';
import { getRandomHarfRound, CATEGORIES } from './src/games/datasets/categories.js';
import { getRandomFastestPhrase } from './src/games/datasets/fastestPhrases.js';
import { getRandomDisassembleWord, getDisassembledAnswer, normalizeDisassembleText } from './src/games/datasets/disassembleWords.js';
import { getRandomCorrectSentence, normalizeCorrectSentence } from './src/games/datasets/correctSentences.js';
import { reverseArabicText, checkReverseMatch, matchesArabicAnswer, checkHarfAnswer, normalizeArabic } from './src/utils/arabicNormalizer.js';
import { checkXOWinner, isXOBoardFull } from './src/games/xoGame.js';
import { GAME_REGISTRY, getAllGames, getAvailableGames } from './src/games/registry.js';
import { deploySlashCommands } from './src/deploy-commands.js';
import logger from './src/utils/logger.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. Initialize Discord Bot in background if token is configured
  try {
    startBot();
  } catch (err) {
    logger.error('تعذر بدء تشغيل بوت ديسكورد عند إقلاع الخادم', err);
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Bot Status & Info
  app.get('/api/bot/status', (req, res) => {
    const status = getBotStatus();
    res.json({
      ...status,
      database: db.getStatus(),
      hasToken: Boolean(process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'YOUR_DISCORD_BOT_TOKEN'),
      hasClientId: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'YOUR_DISCORD_APPLICATION_CLIENT_ID'),
      botName: config.bot.name,
      version: config.bot.version,
    });
  });

  // Restart / Connect Bot
  app.post('/api/bot/connect', (req, res) => {
    try {
      const client = startBot();
      res.json({ success: true, message: 'تم إرسال طلب الاتصال ببوابة ديسكورد', status: getBotStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'فشل الاتصال' });
    }
  });

  // Deploy Slash Commands Trigger
  app.post('/api/bot/deploy-commands', async (req, res) => {
    try {
      const { customGuildId } = req.body || {};
      const result = await deploySlashCommands(undefined, undefined, customGuildId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'فشل نشر الأوامر' });
    }
  });

  // Get Central Config
  app.get('/api/config', (req, res) => {
    res.json(config);
  });

  // Update Game Settings in Central Config
  app.post('/api/config', (req, res) => {
    try {
      const { reverseTimer, flagsTimer, pointsPerWin, prefix } = req.body || {};

      if (reverseTimer && typeof reverseTimer === 'number' && reverseTimer >= 5) {
        config.games.reverse.timerSeconds = reverseTimer;
      }
      if (flagsTimer && typeof flagsTimer === 'number' && flagsTimer >= 5) {
        config.games.flags.timerSeconds = flagsTimer;
      }
      if (pointsPerWin && typeof pointsPerWin === 'number' && pointsPerWin > 0) {
        config.games.reverse.pointsPerWin = pointsPerWin;
        config.games.flags.pointsPerWin = pointsPerWin;
      }
      if (prefix && typeof prefix === 'string') {
        config.bot.prefix = prefix.trim();
      }

      res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', config });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Database Leaderboards & Stats
  app.get('/api/scores', (req, res) => {
    const guildId = (req.query.guildId as string) || 'dm';
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const leaderboard = db.getGuildLeaderboard(guildId, limit);
    const globalStats = db.getGlobalStats();
    const allData = db.getAllData();

    res.json({
      guildId,
      leaderboard,
      globalStats,
      guildsList: Object.keys(allData.guilds || {}),
    });
  });

  // --- Tournament API Endpoints ---
  app.get('/api/tournaments', (req, res) => {
    const tournaments = db.getAllTournaments();
    const active = db.getActiveTournament();
    res.json({ tournaments, active });
  });

  app.post('/api/tournaments/create', (req, res) => {
    try {
      const { name, startDate, durationMinutes = 60, selectedGames = [], createdBy = 'مالك البوت', rewards = {} } = req.body || {};
      if (!name) {
        return res.status(400).json({ success: false, error: 'اسم البطولة مطلوب' });
      }

      const id = 'tourn_' + Date.now();
      const newTourn = {
        id,
        name,
        status: 'scheduled',
        startDate: startDate || new Date().toISOString(),
        durationMinutes,
        selectedGames,
        createdBy,
        createdAt: new Date().toISOString(),
        rewards: {
          firstPlace: rewards.firstPlace || '🥇 رتبة بطل السيرفر + 1000 نقطة',
          secondPlace: rewards.secondPlace || '🥈 رتبة وصيف البطولة + 500 نقطة',
          thirdPlace: rewards.thirdPlace || '🥉 رتبة المركز الثالث + 250 نقطة',
        },
        participants: [],
        tournamentPoints: {},
      };

      const saved = db.saveTournament(newTourn);
      res.json({ success: true, tournament: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tournaments/points', (req, res) => {
    try {
      const { tournamentId, username, amount, action = 'add', isOwner = false } = req.body || {};

      if (!isOwner) {
        return res.status(403).json({ 
          success: false, 
          error: '⛔ ليس لديك صلاحية لاستخدام هذا الأمر. هذا الأمر مخصص لمالك البوت فقط.' 
        });
      }

      if (!tournamentId || !username || typeof amount !== 'number') {
        return res.status(400).json({ success: false, error: 'معاملات غير اكتمالية' });
      }

      const updated = db.updateTournamentPoints(tournamentId, username, amount, action);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'البطولة غير موجودة' });
      }

      res.json({ success: true, tournament: updated.tournament, currentBalance: updated.newBalance, adjustment: updated.adjustment });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/tournaments/status', (req, res) => {
    try {
      const { tournamentId, status, isOwner = false } = req.body || {};

      if (!isOwner) {
        return res.status(403).json({ 
          success: false, 
          error: '⛔ ليس لديك صلاحية لاستخدام هذا الأمر. هذا الأمر مخصص لمالك البوت فقط.' 
        });
      }

      const tourn = db.getTournament(tournamentId);
      if (!tourn) {
        return res.status(404).json({ success: false, error: 'البطولة غير موجودة' });
      }

      tourn.status = status;
      if (status === 'ended') {
        tourn.endDate = new Date().toISOString();
      }

      const saved = db.saveTournament(tourn);
      res.json({ success: true, tournament: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Simulator Endpoints: Test "اعكس"
  app.get('/api/simulate/reverse/random', (req, res) => {
    const item = getRandomReverseWord();
    res.json({
      word: item.word,
      category: item.category,
      difficulty: item.difficulty,
      reversed: reverseArabicText(item.word),
      timerSeconds: config.games.reverse.timerSeconds,
      points: config.games.reverse.pointsPerWin,
    });
  });

  app.post('/api/simulate/reverse/check', (req, res) => {
    const { input, originalWord, playerName, guildId = 'demo-server' } = req.body || {};
    if (!input || !originalWord) {
      return res.status(400).json({ error: 'Missing input or originalWord' });
    }

    const isCorrect = checkReverseMatch(input, originalWord);
    const expected = reverseArabicText(originalWord);

    if (isCorrect) {
      const points = config.games.reverse.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'reverse', points);
      return res.json({
        correct: true,
        expected,
        points,
        user,
      });
    }

    res.json({
      correct: false,
      expected,
      normalizedInput: normalizeArabic(input),
    });
  });

  // Simulator Endpoints: Test "أعلام"
  app.get('/api/simulate/flags/random', (req, res) => {
    const item = getRandomCountry();
    res.json({
      flag: item.flag,
      flagImageUrl: item.flagImageUrl || `https://flagcdn.com/w640/${item.code.toLowerCase()}.png`,
      name: item.name,
      code: item.code,
      region: item.region,
      aliases: item.aliases,
      timerSeconds: config.games.flags.timerSeconds,
      points: config.games.flags.pointsPerWin,
    });
  });

  app.post('/api/simulate/flags/check', (req, res) => {
    const { input, countryName, aliases = [], playerName, guildId = 'demo-server' } = req.body || {};
    if (!input || !countryName) {
      return res.status(400).json({ error: 'Missing input or countryName' });
    }

    const isCorrect = matchesArabicAnswer(input, countryName, aliases);

    if (isCorrect) {
      const points = config.games.flags.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'flags', points);
      return res.json({
        correct: true,
        countryName,
        points,
        user,
      });
    }

    res.json({
      correct: false,
      countryName,
      normalizedInput: normalizeArabic(input),
    });
  });

  // Simulator Endpoints: Test "حرف"
  app.get('/api/simulate/harf/random', (req, res) => {
    const round = getRandomHarfRound();
    res.json({
      letter: round.letter,
      category: round.category,
      timerSeconds: config.games.harf?.timerSeconds || 15,
      points: config.games.harf?.pointsPerWin || 10,
      validAnswersCount: round.validAnswers.length,
      sampleValidAnswers: round.validAnswers.slice(0, 3),
    });
  });

  app.post('/api/simulate/harf/check', (req, res) => {
    const { input, letter, categoryId, playerName, guildId = 'demo-server' } = req.body || {};
    if (!input || !letter) {
      return res.status(400).json({ error: 'Missing input or letter' });
    }

    const round = getRandomHarfRound();
    // Use category-specific answers or round answers
    const validAnswers = round.validAnswers;
    const isCorrect = checkHarfAnswer(input, letter, validAnswers);

    if (isCorrect) {
      const points = config.games.harf?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'harf', points);
      return res.json({
        correct: true,
        letter,
        points,
        user,
      });
    }

    res.json({
      correct: false,
      letter,
      normalizedInput: normalizeArabic(input),
    });
  });

  // Simulator Endpoints: Test "خمن الرقم"
  app.get('/api/simulate/guess-number/random', (req, res) => {
    const secretNumber = Math.floor(Math.random() * 100) + 1;
    res.json({
      secretNumber,
      min: 1,
      max: 100,
      timerSeconds: config.games.guessNumber?.timerSeconds || 60,
      points: config.games.guessNumber?.pointsPerWin || 10,
    });
  });

  app.post('/api/simulate/guess-number/check', (req, res) => {
    const { input, secretNumber, playerName, guildId = 'demo-server' } = req.body || {};
    if (!input || secretNumber === undefined) {
      return res.status(400).json({ error: 'Missing input or secretNumber' });
    }

    const guess = parseInt(String(input).trim(), 10);
    if (isNaN(guess) || guess < 1 || guess > 100) {
      return res.status(400).json({ error: 'Invalid range' });
    }

    const target = Number(secretNumber);
    if (guess === target) {
      const points = config.games.guessNumber?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'guess_number', points);
      return res.json({
        result: 'equal',
        correct: true,
        secretNumber: target,
        points,
        user,
      });
    } else if (guess < target) {
      return res.json({
        result: 'larger',
        correct: false,
        hint: '> 🔼 الرقم أكبر!',
      });
    } else {
      return res.json({
        result: 'smaller',
        correct: false,
        hint: '> 🔽 الرقم أصغر!',
      });
    }
  });

  // Simulator Endpoints: Test "زر"
  app.get('/api/simulate/button/start', (req, res) => {
    const targetIndex = Math.floor(Math.random() * 4);
    res.json({
      targetIndex,
      timerSeconds: config.games.button?.timerSeconds || 10,
      points: config.games.button?.pointsPerWin || 10,
    });
  });

  app.post('/api/simulate/button/check', (req, res) => {
    const { clickedIndex, targetIndex, startTime, playerName, guildId = 'demo-server' } = req.body || {};
    if (clickedIndex === undefined || targetIndex === undefined) {
      return res.status(400).json({ error: 'Missing clickedIndex or targetIndex' });
    }

    const isCorrect = Number(clickedIndex) === Number(targetIndex);
    const timeTakenSec = startTime ? (Date.now() - Number(startTime)) / 1000 : 0.82;

    if (isCorrect) {
      const points = config.games.button?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'button', points);
      return res.json({
        correct: true,
        timeTakenSec: Number(timeTakenSec.toFixed(2)),
        points,
        user,
      });
    }

    res.json({
      correct: false,
      clickedIndex,
      targetIndex,
    });
  });

  // Simulator Endpoints: Test "Fastest"
  app.post('/api/simulate/fastest/start', (req, res) => {
    const phrase = getRandomFastestPhrase();
    res.json({
      phrase,
      timerSeconds: config.games.fastest?.timerSeconds || 15,
      points: config.games.fastest?.pointsPerWin || 10,
    });
  });

  app.post('/api/simulate/fastest/check', (req, res) => {
    const { answer, targetPhrase, startTime, playerName, guildId = 'demo-server' } = req.body || {};
    if (!answer || !targetPhrase) {
      return res.status(400).json({ error: 'Missing answer or targetPhrase' });
    }

    const trimmedUserAnswer = String(answer).trim();
    const isCorrect = trimmedUserAnswer === targetPhrase;
    const timeTakenSec = startTime ? (Date.now() - Number(startTime)) / 1000 : 2.14;

    if (isCorrect) {
      const points = config.games.fastest?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'fastest', points);
      return res.json({
        correct: true,
        timeTakenSec: Number(timeTakenSec.toFixed(2)),
        points,
        user,
      });
    }

    res.json({
      correct: false,
    });
  });

  // Simulator Endpoints: Test "Disassemble"
  app.post('/api/simulate/disassemble/start', (req, res) => {
    const word = getRandomDisassembleWord();
    const expectedAnswer = getDisassembledAnswer(word);
    res.json({
      word,
      expectedAnswer,
      timerSeconds: config.games.disassemble?.timerSeconds || 15,
      points: config.games.disassemble?.pointsPerWin || 10,
    });
  });

  app.post('/api/simulate/disassemble/check', (req, res) => {
    const { answer, targetWord, expectedAnswer, startTime, playerName, guildId = 'demo-server' } = req.body || {};
    if (!answer || !targetWord) {
      return res.status(400).json({ error: 'Missing answer or targetWord' });
    }

    const expected = expectedAnswer || getDisassembledAnswer(targetWord);
    const userNorm = normalizeDisassembleText(String(answer));
    const expectedNorm = normalizeDisassembleText(expected);

    const isCorrect = userNorm === expectedNorm;
    const timeTakenSec = startTime ? (Date.now() - Number(startTime)) / 1000 : 1.85;

    if (isCorrect) {
      const points = config.games.disassemble?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'disassemble', points);
      return res.json({
        correct: true,
        expectedAnswer: expected,
        timeTakenSec: Number(timeTakenSec.toFixed(2)),
        points,
        user,
      });
    }

    res.json({
      correct: false,
      expectedAnswer: expected,
    });
  });

  // Simulator Endpoints: Test "Correct"
  app.post('/api/simulate/correct/start', (req, res) => {
    const item = getRandomCorrectSentence();
    res.json({
      incorrectSentence: item.incorrect,
      expectedAnswer: item.correct,
      explanation: item.explanation,
      timerSeconds: config.games.correct?.timerSeconds || 15,
      points: config.games.correct?.pointsPerWin || 10,
    });
  });

  app.post('/api/simulate/correct/check', (req, res) => {
    const { answer, expectedAnswer, startTime, playerName, guildId = 'demo-server' } = req.body || {};
    if (!answer || !expectedAnswer) {
      return res.status(400).json({ error: 'Missing answer or expectedAnswer' });
    }

    const userNorm = normalizeCorrectSentence(String(answer));
    const expectedNorm = normalizeCorrectSentence(String(expectedAnswer));

    const isCorrect = userNorm === expectedNorm;
    const timeTakenSec = startTime ? (Date.now() - Number(startTime)) / 1000 : 1.92;

    if (isCorrect) {
      const points = config.games.correct?.pointsPerWin || 10;
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'correct', points);
      return res.json({
        correct: true,
        expectedAnswer,
        timeTakenSec: Number(timeTakenSec.toFixed(2)),
        points,
        user,
      });
    }

    res.json({
      correct: false,
      expectedAnswer,
    });
  });

  // Simulator Endpoints: Test "XO"
  app.post('/api/simulate/xo/move', (req, res) => {
    try {
      const { board, cellIndex, playerSymbol, playerName, guildId = 'demo-server' } = req.body || {};
      
      if (!Array.isArray(board) || board.length !== 9 || cellIndex < 0 || cellIndex > 8) {
        return res.status(400).json({ success: false, error: 'بيانات اللوحة غير صالحة' });
      }

      if (board[cellIndex] !== null) {
        return res.status(400).json({ success: false, error: 'الخانة مأخوذة بالفعل!' });
      }

      const nextBoard = [...board];
      nextBoard[cellIndex] = playerSymbol === 'O' ? 'O' : 'X';

      const winResult = checkXOWinner(nextBoard);
      const isDraw = !winResult && isXOBoardFull(nextBoard);

      let user = null;
      const points = config.games.xo?.pointsPerWin || 10;

      if (winResult && playerName) {
        user = db.addWin(guildId, playerName, playerName, 'xo', points);
      }

      return res.json({
        success: true,
        board: nextBoard,
        winner: winResult?.winner || null,
        winningCombo: winResult?.combo || null,
        isDraw,
        points: winResult ? points : 0,
        user,
      });
    } catch (err: any) {
      logger.error('Error in /api/simulate/xo/move', err);
      return res.status(500).json({ success: false, error: err?.message || 'خطأ في معالجة الحركة' });
    }
  });

  // Central Game Registry Explorer
  app.get('/api/registry/games', (req, res) => {
    res.json({
      totalCount: GAME_REGISTRY.length,
      availableCount: getAvailableGames().length,
      games: GAME_REGISTRY,
      availableGames: getAvailableGames(),
    });
  });

  // Datasets Explorer
  app.get('/api/datasets', (req, res) => {
    res.json({
      wordsCount: ARABIC_WORDS.length,
      sampleWords: ARABIC_WORDS.slice(0, 15),
      countriesCount: COUNTRIES.length,
      sampleCountries: COUNTRIES.slice(0, 15),
      categoriesCount: CATEGORIES.length,
      categories: CATEGORIES,
    });
  });

  // Simulator Endpoints: Test "Hide and Seek"
  app.post('/api/simulate/hide-and-seek/record', (req, res) => {
    try {
      const { playerName, guildId = 'demo-server', points = 10 } = req.body || {};
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'hide_and_seek', points);
      return res.json({
        success: true,
        points,
        user,
      });
    } catch (err: any) {
      logger.error('Error in /api/simulate/hide-and-seek/record', err);
      return res.status(500).json({ success: false, error: err?.message || 'خطأ في تسجيل الفوز' });
    }
  });

  // Simulator Endpoints: Test "Musical Chairs" (كراسي)
  app.post('/api/simulate/chairs/record', (req, res) => {
    try {
      const { playerName, guildId = 'demo-server', points = 10 } = req.body || {};
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'chairs', points);
      return res.json({
        success: true,
        points,
        user,
      });
    } catch (err: any) {
      logger.error('Error in /api/simulate/chairs/record', err);
      return res.status(500).json({ success: false, error: err?.message || 'خطأ في تسجيل الفوز' });
    }
  });

  // Simulator Endpoints: Test "Roulette" (روليت)
  app.post('/api/simulate/roulette/record', (req, res) => {
    try {
      const { playerName, guildId = 'demo-server', points = 10 } = req.body || {};
      const user = db.addWin(guildId, playerName || 'مستخدم تجريبي', playerName || 'مستخدم تجريبي', 'roulette', points);
      return res.json({
        success: true,
        points,
        user,
      });
    } catch (err: any) {
      logger.error('Error in /api/simulate/roulette/record', err);
      return res.status(500).json({ success: false, error: err?.message || 'خطأ في تسجيل الفوز' });
    }
  });

  // --- Vite / Static Files Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.success(`🚀 خادم الويب ولوحة تحكم جعفر تعمل على http://localhost:${PORT}`);
  });
}

startServer();
