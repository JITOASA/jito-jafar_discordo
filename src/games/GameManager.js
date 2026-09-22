/**
 * Active Games Manager for جعفر Bot
 * Handles channel-level locks, prevents duplicate games, and manages lifecycles.
 */

import logger from '../utils/logger.js';

class GameManager {
  constructor() {
    // Map<channelId, { gameType, startTime, state, collector, metadata }>
    this.activeGames = new Map();
  }

  /**
   * Checks if a channel already has an ongoing game
   * @param {string} channelId 
   * @returns {boolean}
   */
  isGameActive(channelId) {
    return this.activeGames.has(channelId);
  }

  /**
   * Registers a newly started game in a channel
   * @param {string} channelId 
   * @param {string} gameType 
   * @param {object} metadata 
   */
  startGame(channelId, gameType, metadata = {}) {
    this.activeGames.set(channelId, {
      gameType,
      startTime: Date.now(),
      metadata,
      answeredUserIds: new Set(),
      collector: null,
    });
    logger.game(gameType, `تم بدء لعبة في الروم ${channelId}`);
  }

  /**
   * Sets the active Discord MessageCollector for the game
   * @param {string} channelId 
   * @param {object} collector 
   */
  setCollector(channelId, collector) {
    const game = this.activeGames.get(channelId);
    if (game) {
      game.collector = collector;
    }
  }

  /**
   * Checks if a user has already attempted an answer in this game round
   * @param {string} channelId 
   * @param {string} userId 
   * @returns {boolean}
   */
  hasUserAnswered(channelId, userId) {
    const game = this.activeGames.get(channelId);
    if (!game) return false;
    return game.answeredUserIds.has(userId);
  }

  /**
   * Records that a user has submitted their attempt for this round
   * @param {string} channelId 
   * @param {string} userId 
   */
  recordUserAnswer(channelId, userId) {
    const game = this.activeGames.get(channelId);
    if (game) {
      game.answeredUserIds.add(userId);
    }
  }

  /**
   * Ends and clears an active game session from the channel
   * @param {string} channelId 
   */
  endGame(channelId) {
    const game = this.activeGames.get(channelId);
    if (game) {
      if (game.collector && !game.collector.ended) {
        try {
          game.collector.stop('game_ended');
        } catch {
          // ignore
        }
      }
      this.activeGames.delete(channelId);
      logger.game(game.gameType || 'لعبة', `تم إنهاء اللعبة في الروم ${channelId}`);
    }
  }

  /**
   * Get active games count
   */
  getActiveCount() {
    return this.activeGames.size;
  }
}

export const gameManager = new GameManager();
export default gameManager;
