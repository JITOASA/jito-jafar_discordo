/**
 * لعبة "اعكس" (Reverse Game Module)
 * Logic, message collectors, single attempt per round, winner handling.
 */

import { getRandomReverseWord } from './datasets/words.js';
import { reverseArabicText, checkReverseMatch } from '../utils/arabicNormalizer.js';
import { embeds } from '../utils/embeds.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Runs a round of the Reverse Game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runReverseGame(context) {
  const channel = context.channel;
  const channelId = channel.id;
  const guildId = context.guildId || 'dm';

  // 1. Guard against simultaneous games in same channel
  if (gameManager.isGameActive(channelId)) {
    const errorMsg = '⚠️ توجد لعبة جارية حالياً في هذه القناة! انتظر حتى تنتهي قبل بدء جولة جديدة.';
    if (context.isCommand && context.isCommand()) {
      return context.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
    return channel.send(errorMsg).catch(() => {});
  }

  try {
    // 2. Prepare random word & reversed target
    const wordObj = getRandomReverseWord();
    const originalWord = wordObj.word;
    const targetReversed = reverseArabicText(originalWord);
    const timerSeconds = config.games.reverse.timerSeconds || 15;
    const points = config.games.reverse.pointsPerWin || 10;
    const startTime = Date.now();

    // 3. Register game lock
    gameManager.startGame(channelId, 'اعكس', { word: originalWord, targetReversed });

    // 4. Send Game Embed
    const gameEmbed = embeds.reverseGame(wordObj, timerSeconds);
    if (context.isCommand && context.isCommand()) {
      await context.reply({ embeds: [gameEmbed] });
    } else {
      await channel.send({ embeds: [gameEmbed] });
    }

    // 5. Setup Message Collector
    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({
      filter,
      time: timerSeconds * 1000,
    });

    gameManager.setCollector(channelId, collector);
    
    // Lifecycle Guard: Ensure winner or timeout result is sent strictly ONCE
    let isRoundFinished = false;

    collector.on('collect', async (msg) => {
      if (isRoundFinished) return;

      const userId = msg.author.id;
      const userText = msg.content.trim();

      // In reverse game, single attempt is recorded
      if (gameManager.hasUserAnswered(channelId, userId)) {
        return;
      }
      gameManager.recordUserAnswer(channelId, userId);

      // Check if answer is correct reversed form
      if (checkReverseMatch(userText, originalWord)) {
        if (isRoundFinished) return;
        isRoundFinished = true;

        try {
          collector.stop('winner');
        } catch {
          // ignore
        }

        const timeTaken = (Date.now() - startTime) / 1000;
        const authorName = msg.member?.displayName || msg.author.username;

        // Record win in database
        db.addWin(guildId, userId, authorName, 'reverse', points);

        // React with trophy on the winning message
        try {
          await msg.react('🏆');
        } catch {
          // ignore
        }

        // Send winner message: exact requested format with Discord mention
        await channel.send(`🏆 **فاز باللعبة! 👑** <@${userId}>`).catch(() => {});
      } else {
        // Wrong answer feedback
        try {
          await msg.react('❌');
        } catch {
          // ignore
        }
      }
    });

    collector.on('end', async (_collected, reason) => {
      // Clear game lock
      gameManager.endGame(channelId);

      if (!isRoundFinished && reason === 'time') {
        isRoundFinished = true;
        const timeoutEmbed = embeds.timeout('لعبة اعكس 🔄', targetReversed);
        await channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة اعكس', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل اللعبة. حاول مرة أخرى.').catch(() => {});
  }
}

export default runReverseGame;
