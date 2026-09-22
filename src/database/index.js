/**
 * Hybrid Persistent Database / Scoring System for جعفر (Ja'far) Discord Bot
 * Supports PostgreSQL (Supabase / Render / Neon / Cloud PostgreSQL) via DATABASE_URL
 * with high-performance in-memory cache and local JSON safety fallback.
 * 
 * Features:
 * - Persistent across Render / cloud restarts, deploys, and container sleep cycles.
 * - Automatic schema creation (`jafar_scores` table and indexes).
 * - Automatic migration from local JSON database to PostgreSQL on startup.
 * - Zero-downtime resilient error handling (database network drops never crash the Discord bot).
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

class DatabaseManager {
  constructor() {
    this.dataDir = path.resolve(process.cwd(), config.storage.dataPath);
    this.filePath = path.resolve(process.cwd(), config.storage.scoresFile);
    
    // In-memory cache for sub-millisecond query responses
    this.data = {
      guilds: {}, // { [guildId]: { [userId]: { userId, username, points, totalWins, games: { reverse: 0, flags: 0, xo: 0 }, firstSeen, lastWon } } }
      tournaments: {}, // { [tournamentId]: TournamentObject }
      global: {
        totalGamesPlayed: 0,
        totalPointsAwarded: 0,
        createdAt: new Date().toISOString(),
      },
    };

    this.pool = null;
    this.isPostgresConnected = false;
    this.isInitialized = false;

    // 1. Load local fallback data first
    this._loadLocalBackup();

    // 2. Initialize PostgreSQL if DATABASE_URL is configured
    this.init();
  }

  /**
   * Loads cached scores from local disk if available
   */
  _loadLocalBackup() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && typeof parsed === 'object') {
          this.data = {
            guilds: parsed.guilds || {},
            global: parsed.global || {
              totalGamesPlayed: 0,
              totalPointsAwarded: 0,
              createdAt: new Date().toISOString(),
            },
          };
        }
      }
    } catch (err) {
      logger.warn('تعذر قراءة النسخة المحلية لملف النقاط، تم استخدام الذاكرة المؤقتة', err.message);
    }
  }

  /**
   * Saves in-memory cache to local JSON file as backup
   */
  _saveLocalBackup() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      // Non-critical local save failure warning
    }
  }

  /**
   * Initializes PostgreSQL connection, ensures table schema, and migrates data
   */
  async init() {
    const databaseUrl = config.storage.databaseUrl || process.env.DATABASE_URL;

    if (!databaseUrl || databaseUrl.trim() === '') {
      logger.info('📦 لم يتم تحديد DATABASE_URL. يعمل نظام النقاط بوضع الذاكرة والتخزين المحلي.');
      return;
    }

    try {
      const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        allowExitOnIdle: false,
      });

      // Handle background pool client errors without crashing
      this.pool.on('error', (err) => {
        logger.warn(
          `PostgreSQL Pool background client warning ➔ [${err.name || 'Error'}] ${err.message}${err.code ? ` (Code: ${err.code})` : ''}`,
          err
        );
      });

      // Verify connection
      const client = await this.pool.connect();
      try {
        // 1. Create table schema if not exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS jafar_scores (
            guild_id VARCHAR(64) NOT NULL,
            user_id VARCHAR(64) NOT NULL,
            username VARCHAR(255) DEFAULT 'لاعب ديسكورد',
            points INTEGER DEFAULT 0,
            total_wins INTEGER DEFAULT 0,
            reverse_wins INTEGER DEFAULT 0,
            flags_wins INTEGER DEFAULT 0,
            harf_wins INTEGER DEFAULT 0,
            guess_number_wins INTEGER DEFAULT 0,
            button_wins INTEGER DEFAULT 0,
            fastest_wins INTEGER DEFAULT 0,
            disassemble_wins INTEGER DEFAULT 0,
            correct_wins INTEGER DEFAULT 0,
            xo_wins INTEGER DEFAULT 0,
            hide_and_seek_wins INTEGER DEFAULT 0,
            chairs_wins INTEGER DEFAULT 0,
            roulette_wins INTEGER DEFAULT 0,
            first_seen TIMESTAMPTZ DEFAULT NOW(),
            last_won TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (guild_id, user_id)
          );

          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS reverse_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS flags_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS harf_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS guess_number_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS button_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS fastest_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS disassemble_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS correct_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS xo_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS hide_and_seek_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS chairs_wins INTEGER DEFAULT 0;
          ALTER TABLE jafar_scores ADD COLUMN IF NOT EXISTS roulette_wins INTEGER DEFAULT 0;

          CREATE INDEX IF NOT EXISTS idx_jafar_scores_guild_pts 
          ON jafar_scores (guild_id, points DESC, total_wins DESC);

          CREATE TABLE IF NOT EXISTS jafar_tournaments (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            status VARCHAR(32) DEFAULT 'scheduled',
            start_date TIMESTAMPTZ NOT NULL,
            end_date TIMESTAMPTZ,
            duration_minutes INTEGER DEFAULT 60,
            selected_games JSONB DEFAULT '[]'::jsonb,
            created_by VARCHAR(255) DEFAULT 'مالك البوت',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            rewards JSONB DEFAULT '{}'::jsonb,
            participants JSONB DEFAULT '[]'::jsonb,
            tournament_points JSONB DEFAULT '{}'::jsonb
          );

          CREATE TABLE IF NOT EXISTS jafar_tournament_adjustments (
            id VARCHAR(64) PRIMARY KEY,
            owner_id VARCHAR(255) DEFAULT '.evre',
            target_user VARCHAR(255) NOT NULL,
            action_type VARCHAR(32) NOT NULL,
            amount INTEGER NOT NULL,
            previous_balance INTEGER NOT NULL,
            new_balance INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS jafar_gp_adjustments (
            id VARCHAR(64) PRIMARY KEY,
            owner_id VARCHAR(255) DEFAULT '.evre',
            target_user VARCHAR(255) NOT NULL,
            action_type VARCHAR(32) NOT NULL,
            amount INTEGER NOT NULL,
            previous_balance INTEGER NOT NULL,
            new_balance INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);

        this.isPostgresConnected = true;
        logger.success('🐘 تم الاتصال بنجاح بقاعدة بيانات PostgreSQL الدائمة (Supabase / Render / Cloud)!');

        // 2. Auto-migrate local JSON data to PostgreSQL if DB is empty or has missing players
        await this._migrateLocalDataToPostgres(client);

        // 3. Populate in-memory cache with all persistent records from PostgreSQL
        await this._syncCacheFromPostgres(client);

      } finally {
        client.release();
      }

      this.isInitialized = true;
    } catch (err) {
      this.isPostgresConnected = false;
      const errorDetails = [
        err.name ? `Type: ${err.name}` : null,
        err.code ? `Code: ${err.code}` : null,
        err.message ? `Message: ${err.message}` : null,
        err.detail ? `Detail: ${err.detail}` : null,
        err.hint ? `Hint: ${err.hint}` : null,
      ].filter(Boolean).join(' | ');

      logger.error(
        `⚠️ تعذر الاتصال بـ PostgreSQL (سيستمر البوت بالعمل باستخدام التخزين المحلي) ➔ ${errorDetails}`,
        err
      );
    }
  }

  /**
   * Migrates existing local JSON scores to PostgreSQL without overwriting higher database points
   */
  async _migrateLocalDataToPostgres(client) {
    try {
      let migratedCount = 0;
      for (const guildId in this.data.guilds) {
        const guildUsers = this.data.guilds[guildId];
        for (const userId in guildUsers) {
          const user = guildUsers[userId];
          const reverseWins = user.games?.reverse || 0;
          const flagsWins = user.games?.flags || 0;
          const harfWins = user.games?.harf || 0;
          const guessNumberWins = user.games?.guess_number || 0;
          const buttonWins = user.games?.button || 0;
          const fastestWins = user.games?.fastest || 0;
          const xoWins = user.games?.xo || 0;
          const totalWins = user.totalWins || (reverseWins + flagsWins + harfWins + guessNumberWins + buttonWins + fastestWins + xoWins);

          await client.query(`
            INSERT INTO jafar_scores (
              guild_id, user_id, username, points, total_wins,
              reverse_wins, flags_wins, harf_wins, guess_number_wins, button_wins, fastest_wins, xo_wins,
              first_seen, last_won, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), NOW())
            ON CONFLICT (guild_id, user_id) DO UPDATE SET
              username = EXCLUDED.username,
              points = GREATEST(jafar_scores.points, EXCLUDED.points),
              total_wins = GREATEST(jafar_scores.total_wins, EXCLUDED.total_wins),
              reverse_wins = GREATEST(COALESCE(jafar_scores.reverse_wins, 0), EXCLUDED.reverse_wins),
              flags_wins = GREATEST(COALESCE(jafar_scores.flags_wins, 0), EXCLUDED.flags_wins),
              harf_wins = GREATEST(COALESCE(jafar_scores.harf_wins, 0), EXCLUDED.harf_wins),
              guess_number_wins = GREATEST(COALESCE(jafar_scores.guess_number_wins, 0), EXCLUDED.guess_number_wins),
              button_wins = GREATEST(COALESCE(jafar_scores.button_wins, 0), EXCLUDED.button_wins),
              fastest_wins = GREATEST(COALESCE(jafar_scores.fastest_wins, 0), EXCLUDED.fastest_wins),
              xo_wins = GREATEST(COALESCE(jafar_scores.xo_wins, 0), EXCLUDED.xo_wins);
          `, [
            guildId,
            userId,
            user.username || 'لاعب ديسكورد',
            user.points || 0,
            totalWins,
            reverseWins,
            flagsWins,
            harfWins,
            guessNumberWins,
            buttonWins,
            fastestWins,
            xoWins
          ]);
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        logger.info(`✨ تم ترحيل ومزامنة ${migratedCount} لاعب بنجاح إلى PostgreSQL.`);
      }
    } catch (err) {
      logger.warn('تنبيه أثناء ترحيل البيانات المحلية إلى PostgreSQL:', err.message);
    }
  }

  /**
   * Pulls all scores from PostgreSQL into memory cache
   */
  async _syncCacheFromPostgres(client = null) {
    try {
      const runner = client || this.pool;
      if (!runner) return;

      let res;
      try {
        res = await runner.query(`SELECT * FROM jafar_scores;`);
      } catch (queryErr) {
        res = await runner.query(`SELECT guild_id, user_id, username, points, total_wins FROM jafar_scores;`);
      }

      let totalPoints = 0;
      let totalWins = 0;

      // Reset cache guilds
      const newGuilds = {};

      for (const row of res.rows) {
        if (!newGuilds[row.guild_id]) {
          newGuilds[row.guild_id] = {};
        }

        const points = Number(row.points) || 0;
        const total = Number(row.total_wins) || 0;

        newGuilds[row.guild_id][row.user_id] = {
          userId: row.user_id,
          username: row.username || 'لاعب ديسكورد',
          points,
          totalWins: total,
          games: {
            reverse: Number(row.reverse_wins || 0),
            flags: Number(row.flags_wins || 0),
            harf: Number(row.harf_wins || 0),
            guess_number: Number(row.guess_number_wins || 0),
            button: Number(row.button_wins || 0),
            fastest: Number(row.fastest_wins || 0),
            disassemble: Number(row.disassemble_wins || 0),
            correct: Number(row.correct_wins || 0),
            xo: Number(row.xo_wins || 0),
            hide_and_seek: Number(row.hide_and_seek_wins || 0),
            chairs: Number(row.chairs_wins || 0),
            roulette: Number(row.roulette_wins || 0),
          },
          firstSeen: row.first_seen ? new Date(row.first_seen).toISOString() : new Date().toISOString(),
          lastWon: row.last_won ? new Date(row.last_won).toISOString() : null,
        };

        totalPoints += points;
        totalWins += total;
      }

      this.data.guilds = newGuilds;
      this.data.global.totalPointsAwarded = totalPoints;
      this.data.global.totalGamesPlayed = totalWins;

      this._saveLocalBackup();
    } catch (err) {
      logger.warn('خطأ أثناء مزامنة الذاكرة من PostgreSQL:', err.message);
    }
  }

  /**
   * Ensures guild and user structures exist in memory cache
   */
  _ensureUser(guildId, userId, username = 'لاعب ديسكورد') {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {};
    }
    if (!this.data.guilds[guildId][userId]) {
      this.data.guilds[guildId][userId] = {
        userId,
        username: username || 'لاعب ديسكورد',
        points: 0,
        totalWins: 0,
        games: {
          reverse: 0,
          flags: 0,
          harf: 0,
          guess_number: 0,
          button: 0,
          fastest: 0,
          disassemble: 0,
          correct: 0,
          xo: 0,
          hide_and_seek: 0,
          chairs: 0,
          roulette: 0,
        },
        firstSeen: new Date().toISOString(),
        lastWon: null,
      };
    } else if (username && username !== 'لاعب ديسكورد' && this.data.guilds[guildId][userId].username !== username) {
      this.data.guilds[guildId][userId].username = username;
    }
    return this.data.guilds[guildId][userId];
  }

  /**
   * Records a game win for a player in a specific guild
   * @param {string} guildId 
   * @param {string} userId 
   * @param {string} username 
   * @param {'reverse' | 'flags' | 'harf' | 'guess_number' | 'button' | 'fastest' | 'disassemble' | 'correct' | 'xo' | 'hide_and_seek' | 'mafia' | 'chairs' | 'roulette'} gameType 
   * @param {number} points 
   * @returns {object} Updated user stats
   */
  addWin(guildId, userId, username, gameType = 'reverse', points = 10) {
    const user = this._ensureUser(guildId, userId, username);
    
    // 1. Immediate in-memory update
    user.points += points;
    user.totalWins += 1;
    if (!user.games[gameType]) {
      user.games[gameType] = 0;
    }
    user.games[gameType] += 1;
    user.lastWon = new Date().toISOString();

    // Global stats update
    this.data.global.totalGamesPlayed = (this.data.global.totalGamesPlayed || 0) + 1;
    this.data.global.totalPointsAwarded = (this.data.global.totalPointsAwarded || 0) + points;

    // Save local backup file
    this._saveLocalBackup();

    // 2. Asynchronous write-through to PostgreSQL (non-blocking)
    if (this.pool && this.isPostgresConnected) {
      const reverseWin = gameType === 'reverse' ? 1 : 0;
      const flagsWin = gameType === 'flags' ? 1 : 0;
      const harfWin = gameType === 'harf' ? 1 : 0;
      const guessNumberWin = gameType === 'guess_number' ? 1 : 0;
      const buttonWin = gameType === 'button' ? 1 : 0;
      const fastestWin = gameType === 'fastest' ? 1 : 0;
      const disassembleWin = gameType === 'disassemble' ? 1 : 0;
      const correctWin = gameType === 'correct' ? 1 : 0;
      const xoWin = gameType === 'xo' ? 1 : 0;
      const hideAndSeekWin = gameType === 'hide_and_seek' ? 1 : 0;
      const chairsWin = gameType === 'chairs' ? 1 : 0;
      const rouletteWin = gameType === 'roulette' ? 1 : 0;

      this.pool.query(`
        INSERT INTO jafar_scores (
          guild_id, user_id, username, points, total_wins,
          reverse_wins, flags_wins, harf_wins, guess_number_wins, button_wins, fastest_wins, disassemble_wins, correct_wins, xo_wins, hide_and_seek_wins, chairs_wins, roulette_wins,
          first_seen, last_won, updated_at
        )
        VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW())
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          username = EXCLUDED.username,
          points = jafar_scores.points + EXCLUDED.points,
          total_wins = jafar_scores.total_wins + 1,
          reverse_wins = COALESCE(jafar_scores.reverse_wins, 0) + EXCLUDED.reverse_wins,
          flags_wins = COALESCE(jafar_scores.flags_wins, 0) + EXCLUDED.flags_wins,
          harf_wins = COALESCE(jafar_scores.harf_wins, 0) + EXCLUDED.harf_wins,
          guess_number_wins = COALESCE(jafar_scores.guess_number_wins, 0) + EXCLUDED.guess_number_wins,
          button_wins = COALESCE(jafar_scores.button_wins, 0) + EXCLUDED.button_wins,
          fastest_wins = COALESCE(jafar_scores.fastest_wins, 0) + EXCLUDED.fastest_wins,
          disassemble_wins = COALESCE(jafar_scores.disassemble_wins, 0) + EXCLUDED.disassemble_wins,
          correct_wins = COALESCE(jafar_scores.correct_wins, 0) + EXCLUDED.correct_wins,
          xo_wins = COALESCE(jafar_scores.xo_wins, 0) + EXCLUDED.xo_wins,
          hide_and_seek_wins = COALESCE(jafar_scores.hide_and_seek_wins, 0) + EXCLUDED.hide_and_seek_wins,
          chairs_wins = COALESCE(jafar_scores.chairs_wins, 0) + EXCLUDED.chairs_wins,
          roulette_wins = COALESCE(jafar_scores.roulette_wins, 0) + EXCLUDED.roulette_wins,
          last_won = NOW(),
          updated_at = NOW()
        RETURNING *;
      `, [
        guildId,
        userId,
        username || 'لاعب ديسكورد',
        points,
        reverseWin,
        flagsWin,
        harfWin,
        guessNumberWin,
        buttonWin,
        fastestWin,
        disassembleWin,
        correctWin,
        xoWin,
        hideAndSeekWin,
        chairsWin,
        rouletteWin
      ]).catch((err) => {
        logger.warn(
          `خطأ أثناء حفظ النتيجة في PostgreSQL ➔ [${err.name || 'Error'}] ${err.message}${err.code ? ` (Code: ${err.code})` : ''}`,
          err
        );
      });
    }

    return user;
  }

  /**
   * Retrieves player's score and stats for a guild
   * @param {string} guildId 
   * @param {string} userId 
   * @returns {object|null}
   */
  getUserScore(guildId, userId) {
    if (!this.data.guilds[guildId] || !this.data.guilds[guildId][userId]) {
      return null;
    }
    return this.data.guilds[guildId][userId];
  }

  /**
   * Retrieves server leaderboard sorted by points
   * @param {string} guildId 
   * @param {number} limit 
   * @returns {Array<object>}
   */
  getGuildLeaderboard(guildId, limit = 10) {
    const guildUsers = this.data.guilds[guildId];
    if (!guildUsers) return [];

    const list = Object.values(guildUsers);
    list.sort((a, b) => (b.points - a.points) || (b.totalWins - a.totalWins));
    return list.slice(0, limit);
  }

  /**
   * Retrieves all guild scores or global stats
   */
  getAllData() {
    return this.data;
  }

  /**
   * Resets scores for a specific guild
   * @param {string} guildId 
   */
  resetGuildScores(guildId) {
    if (this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {};
      this._saveLocalBackup();

      if (this.pool && this.isPostgresConnected) {
        this.pool.query('DELETE FROM jafar_scores WHERE guild_id = $1;', [guildId])
          .catch((err) =>
            logger.warn(
              `خطأ أثناء تصفير النقاط في PostgreSQL ➔ [${err.name || 'Error'}] ${err.message}${err.code ? ` (Code: ${err.code})` : ''}`,
              err
            )
          );
      }
      return true;
    }
    return false;
  }

  /**
   * Get overall stats across all servers
   */
  getGlobalStats() {
    const totalGuilds = Object.keys(this.data.guilds).length;
    let totalPlayers = 0;
    for (const guildId in this.data.guilds) {
      totalPlayers += Object.keys(this.data.guilds[guildId]).length;
    }
    return {
      totalGuilds,
      totalPlayers,
      totalGamesPlayed: this.data.global.totalGamesPlayed || 0,
      totalPointsAwarded: this.data.global.totalPointsAwarded || 0,
      isPostgres: this.isPostgresConnected,
    };
  }

  /**
   * Retrieves database connection status for dashboard / health check
   */
  getStatus() {
    return {
      type: this.isPostgresConnected ? 'postgresql' : 'local_json',
      isPostgresConnected: this.isPostgresConnected,
      hasDatabaseUrl: Boolean(config.storage.databaseUrl || process.env.DATABASE_URL),
    };
  }

  // --- Tournament Methods ---

  getAllTournaments() {
    return Object.values(this.data.tournaments || {});
  }

  getTournament(id) {
    return this.data.tournaments?.[id] || null;
  }

  getActiveTournament() {
    const list = this.getAllTournaments();
    return list.find(t => t.status === 'active') || list.find(t => t.status === 'scheduled') || list[0] || null;
  }

  saveTournament(tournament) {
    if (!tournament || !tournament.id) return null;
    if (!this.data.tournaments) this.data.tournaments = {};
    
    this.data.tournaments[tournament.id] = { ...tournament };
    this._saveLocalBackup();

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(`
        INSERT INTO jafar_tournaments (
          id, name, status, start_date, end_date, duration_minutes,
          selected_games, created_by, created_at, rewards, participants, tournament_points
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          duration_minutes = EXCLUDED.duration_minutes,
          selected_games = EXCLUDED.selected_games,
          rewards = EXCLUDED.rewards,
          participants = EXCLUDED.participants,
          tournament_points = EXCLUDED.tournament_points;
      `, [
        tournament.id,
        tournament.name,
        tournament.status,
        tournament.startDate,
        tournament.endDate || null,
        tournament.durationMinutes || 60,
        JSON.stringify(tournament.selectedGames || []),
        tournament.createdBy || 'مالك البوت',
        tournament.createdAt || new Date().toISOString(),
        JSON.stringify(tournament.rewards || {}),
        JSON.stringify(tournament.participants || []),
        JSON.stringify(tournament.tournamentPoints || {})
      ]).catch(err => {
        logger.warn('خطأ أثناء حفظ البطولة في PostgreSQL:', err.message);
      });
    }

    return this.data.tournaments[tournament.id];
  }

  updateTournamentPoints(tournamentId, username, amount, action = 'add', ownerHandle = '.evre') {
    let tournament = tournamentId ? this.getTournament(tournamentId) : this.getActiveTournament();
    
    // If no active or requested tournament exists, fallback to latest or create default container
    if (!tournament) {
      const list = this.getAllTournaments();
      tournament = list[0] || null;
    }

    if (!tournament) {
      tournament = {
        id: 'tourn_global_1',
        name: '🏆 بطولة ألعاب ديسكورد الصيفية الكبرى',
        status: 'ended',
        startDate: new Date().toISOString(),
        durationMinutes: 60,
        selectedGames: ['reverse', 'flags', 'harf', 'roulette'],
        createdBy: '.evre',
        createdAt: new Date().toISOString(),
        rewards: {
          firstPlace: '🥇 رتبة بطل السيرفر + 1000 نقطة',
          secondPlace: '🥈 رتبة وصيف البطولة + 500 نقطة',
          thirdPlace: '🥉 رتبة المركز الثالث + 250 نقطة',
        },
        participants: [],
        tournamentPoints: {},
      };
      this.saveTournament(tournament);
    }

    if (!tournament.tournamentPoints) {
      tournament.tournamentPoints = {};
    }

    const cleanUsername = username.replace(/[@]/g, '').trim();
    const currentPoints = Number(tournament.tournamentPoints[cleanUsername] || 0);
    let newPoints = currentPoints;

    const numAmount = Math.max(0, parseInt(amount, 10) || 0);

    if (action === 'add') {
      newPoints = currentPoints + numAmount;
    } else if (action === 'remove') {
      newPoints = Math.max(0, currentPoints - numAmount);
    } else {
      newPoints = Math.max(0, numAmount);
    }

    tournament.tournamentPoints[cleanUsername] = newPoints;

    if (!tournament.participants) tournament.participants = [];
    if (!tournament.participants.includes(cleanUsername)) {
      tournament.participants.push(cleanUsername);
    }

    this.saveTournament(tournament);

    // Record adjustment audit log
    const adjustmentRecord = {
      id: 'adj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      owner: ownerHandle,
      targetUser: cleanUsername,
      type: action.toUpperCase(),
      amount: numAmount,
      previousBalance: currentPoints,
      newBalance: newPoints,
      timestamp: new Date().toISOString(),
    };

    if (!this.data.tournamentAdjustments) {
      this.data.tournamentAdjustments = [];
    }
    this.data.tournamentAdjustments.push(adjustmentRecord);
    this._saveLocalBackup();

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(`
        INSERT INTO jafar_tournament_adjustments (
          id, owner_id, target_user, action_type, amount, previous_balance, new_balance, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [
        adjustmentRecord.id,
        adjustmentRecord.owner,
        adjustmentRecord.targetUser,
        adjustmentRecord.type,
        adjustmentRecord.amount,
        adjustmentRecord.previousBalance,
        adjustmentRecord.newBalance,
        adjustmentRecord.timestamp
      ]).catch(err => {
        logger.warn('خطأ أثناء تسجيل سجل تعديل النقاط في PostgreSQL:', err.message);
      });
    }

    return {
      tournament,
      adjustment: adjustmentRecord,
      previousBalance: currentPoints,
      newBalance: newPoints,
      amount: numAmount,
      targetUser: cleanUsername,
    };
  }

  /**
   * Retrieves player's general points balance
   */
  getGeneralPoints(guildId = 'sim_guild', usernameOrId) {
    const cleanName = (usernameOrId || '').replace(/[@<#!>]/g, '').trim();
    if (!cleanName) return 0;

    const guildUsers = this.data.guilds[guildId] || {};
    if (guildUsers[cleanName]) {
      return guildUsers[cleanName].points || 0;
    }

    const found = Object.values(guildUsers).find(
      (u) => u.username && u.username.toLowerCase() === cleanName.toLowerCase()
    );
    if (found) return found.points || 0;

    for (const gId in this.data.guilds) {
      const users = Object.values(this.data.guilds[gId]);
      const match = users.find(
        (u) => (u.username && u.username.toLowerCase() === cleanName.toLowerCase()) || u.userId === cleanName
      );
      if (match) return match.points || 0;
    }

    return 0;
  }

  /**
   * Manually updates general game points in jafar_scores
   */
  updateGeneralPoints(guildId = 'sim_guild', usernameOrId, amount, action = 'add', ownerHandle = '.evre') {
    const cleanName = (usernameOrId || '').replace(/[@<#!>]/g, '').trim();
    if (!cleanName) return { error: 'invalid_user' };

    const numAmount = Math.max(0, parseInt(amount, 10) || 0);

    let user = null;
    const guildUsers = this.data.guilds[guildId] || {};
    if (guildUsers[cleanName]) {
      user = guildUsers[cleanName];
    } else {
      const found = Object.values(guildUsers).find(
        (u) => u.username && u.username.toLowerCase() === cleanName.toLowerCase()
      );
      if (found) {
        user = found;
      } else {
        user = this._ensureUser(guildId, cleanName, cleanName);
      }
    }

    const currentPoints = user.points || 0;

    if (action === 'remove' && numAmount > currentPoints) {
      return {
        error: 'insufficient_balance',
        previousBalance: currentPoints,
        requestedAmount: numAmount,
        targetUser: cleanName,
      };
    }

    let newPoints = currentPoints;
    if (action === 'add') {
      newPoints = currentPoints + numAmount;
    } else if (action === 'remove') {
      newPoints = Math.max(0, currentPoints - numAmount);
    } else {
      newPoints = Math.max(0, numAmount);
    }

    user.points = newPoints;
    this._saveLocalBackup();

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(`
        INSERT INTO jafar_scores (
          guild_id, user_id, username, points, total_wins, first_seen, last_won, updated_at
        )
        VALUES ($1, $2, $3, $4, 0, NOW(), NOW(), NOW())
        ON CONFLICT (guild_id, user_id) DO UPDATE SET
          username = EXCLUDED.username,
          points = EXCLUDED.points,
          updated_at = NOW();
      `, [guildId, user.userId, user.username, newPoints]).catch((err) => {
        logger.warn('خطأ أثناء تعديل نقاط الألعاب العامة في PostgreSQL:', err.message);
      });
    }

    const adjustmentRecord = {
      id: 'gp_adj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      owner: ownerHandle,
      targetUser: cleanName,
      type: action.toUpperCase(),
      amount: numAmount,
      previousBalance: currentPoints,
      newBalance: newPoints,
      timestamp: new Date().toISOString(),
    };

    if (!this.data.gpAdjustments) {
      this.data.gpAdjustments = [];
    }
    this.data.gpAdjustments.push(adjustmentRecord);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(`
        INSERT INTO jafar_gp_adjustments (
          id, owner_id, target_user, action_type, amount, previous_balance, new_balance, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `, [
        adjustmentRecord.id,
        adjustmentRecord.owner,
        adjustmentRecord.targetUser,
        adjustmentRecord.type,
        adjustmentRecord.amount,
        adjustmentRecord.previousBalance,
        adjustmentRecord.newBalance,
        adjustmentRecord.timestamp
      ]).catch(err => {
        logger.warn('خطأ أثناء تسجيل سجل تعديل النقاط العامة في PostgreSQL:', err.message);
      });
    }

    return {
      success: true,
      previousBalance: currentPoints,
      newBalance: newPoints,
      amount: numAmount,
      targetUser: cleanName,
      adjustment: adjustmentRecord,
    };
  }
}

export const db = new DatabaseManager();
export default db;
