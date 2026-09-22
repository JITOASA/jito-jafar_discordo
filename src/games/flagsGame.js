/**
 * لعبة "أعلام" (Flags Guessing Game Module)
 * Flag emoji recognition, Arabic alias matching, unlimited attempts per round until win/timeout.
 */

import { getRandomCountry } from './datasets/countries.js';
import { matchesArabicAnswer } from '../utils/arabicNormalizer.js';
import { embeds } from '../utils/embeds.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Runs a round of the Flags Game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runFlagsGame(context) {
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
    // 2. Prepare random country
    const countryObj = getRandomCountry();
    const timerSeconds = config.games.flags.timerSeconds || 15;
    const points = config.games.flags.pointsPerWin || 10;
    const startTime = Date.now();

    // 3. Register game lock
    gameManager.startGame(channelId, 'أعلام', { country: countryObj.name, flag: countryObj.flag });

    // 4. Send Game Embed
    const gameEmbed = embeds.flagsGame(countryObj, timerSeconds);
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

      // Check if user answer matches the country or any of its aliases
      if (matchesArabicAnswer(userText, countryObj.name, countryObj.aliases)) {
        if (isRoundFinished) return;
        isRoundFinished = true; // Mark as finished immediately

        // Stop the collector with 'winner' reason
        try {
          collector.stop('winner');
        } catch {
          // ignore
        }

        const timeTaken = (Date.now() - startTime) / 1000;
        const authorName = msg.member?.displayName || msg.author.username;

        // Record win in database
        db.addWin(guildId, userId, authorName, 'flags', points);

        // React with trophy on the winning message
        try {
          await msg.react('🏆');
        } catch {
          // ignore
        }

        // Send winner message: exact requested format with Discord mention
        await channel.send(`🏆 **فاز باللعبة! 👑** <@${userId}>`).catch(() => {});
      } else {
        // Wrong answer: DO NOT end round, DO NOT block player from guessing again.
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
        const timeoutEmbed = embeds.timeout('لعبة خمن العلم 🚩', countryObj.name);
        await channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة أعلام', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل اللعبة. حاول مرة أخرى.').catch(() => {});
  }
}

export default runFlagsGame;
