/**
 * لعبة "حرف" (Letter & Category Guessing Game Module)
 * Fast-paced Arabic mini-game: given a letter and category, fastest player to type a valid word wins.
 */

import { getRandomHarfRound } from './datasets/categories.js';
import { checkHarfAnswer } from '../utils/arabicNormalizer.js';
import { embeds } from '../utils/embeds.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Runs a round of the Harf Game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runHarfGame(context) {
  const channel = context.channel;
  if (!channel) return;
  const channelId = channel.id;
  const guildId = context.guildId || 'dm';

  // 1. Guard against simultaneous games in the same channel
  if (gameManager.isGameActive(channelId)) {
    const errorMsg = '⚠️ توجد لعبة جارية حالياً في هذه القناة! انتظر حتى تنتهي قبل بدء جولة جديدة.';
    if (context.isCommand && context.isCommand()) {
      return context.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
    return channel.send(errorMsg).catch(() => {});
  }

  try {
    // 2. Prepare random round (Letter + Category + Valid Answers)
    const roundObj = getRandomHarfRound();
    const timerSeconds = config.games.harf?.timerSeconds || 15;
    const points = config.games.harf?.pointsPerWin || 10;
    const { letter, category, validAnswers } = roundObj;

    // 3. Register game lock
    gameManager.startGame(channelId, 'حرف', { letter, category: category.name });

    // 4. Send Game Embed (without revealing answers)
    const gameEmbed = embeds.harfGame(letter, category, timerSeconds);
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
      // If round already ended, ignore any remaining messages
      if (isRoundFinished) return;

      const userId = msg.author.id;
      const userText = msg.content.trim();

      // Check if user answer starts with the target letter and matches the category
      if (checkHarfAnswer(userText, letter, validAnswers)) {
        if (isRoundFinished) return;
        isRoundFinished = true; // Mark as finished immediately

        // Stop the collector with 'winner' reason
        try {
          collector.stop('winner');
        } catch {
          // ignore
        }

        const authorName = msg.member?.displayName || msg.author.username;

        // Record win in database (works in memory / local JSON and PostgreSQL if connected)
        try {
          db.addWin(guildId, userId, authorName, 'harf', points);
        } catch (dbErr) {
          logger.warn('خطأ أثناء حفظ فوز لعبة حرف في قاعدة البيانات', dbErr);
        }

        // React with trophy on the winning message
        try {
          await msg.react('🏆');
        } catch {
          // ignore
        }

        // Send winner message: exact requested format with Discord mention
        await channel.send(`🏆 **فاز باللعبة! 👑** <@${userId}>`).catch(() => {});
      } else {
        // Wrong answer: DO NOT disqualify player, DO NOT end the round.
        // Provide soft visual reaction so the player knows to try again.
        try {
          await msg.react('❌');
        } catch {
          // ignore
        }
      }
    });

    collector.on('end', async (_collected, reason) => {
      // Clear game lock from manager
      gameManager.endGame(channelId);

      // Send timeout message ONLY if round hasn't finished with a winner
      if (!isRoundFinished && reason === 'time') {
        isRoundFinished = true;
        const examples = validAnswers && validAnswers.length > 0
          ? validAnswers.slice(0, 3).join('، ')
          : 'لا توجد أمثلة متاحة';
        const timeoutEmbed = embeds.timeout('لعبة حرف 🔤', examples);
        await channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة حرف', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل اللعبة. حاول مرة أخرى.').catch(() => {});
  }
}

export default runHarfGame;
