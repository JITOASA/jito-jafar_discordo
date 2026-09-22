/**
 * لعبة "خمن الرقم" (Guess the Secret Number Game Module)
 * Players guess a secret random number between 1 and 100 within 60 seconds.
 */

import { embeds } from '../utils/embeds.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Runs a round of Guess the Number game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runGuessNumberGame(context) {
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
    // 2. Generate secret number between 1 and 100
    const secretNumber = Math.floor(Math.random() * 100) + 1;
    const timerSeconds = config.games.guessNumber?.timerSeconds || 60;
    const points = config.games.guessNumber?.pointsPerWin || 10;
    const cooldownMs = (config.games.guessNumber?.cooldownSeconds || 2) * 1000;

    // 3. Register game lock
    gameManager.startGame(channelId, 'خمن الرقم', { secretNumber });

    // 4. Send Game Start Embed
    const startEmbed = embeds.guessNumberGame(timerSeconds);
    if (context.isCommand && context.isCommand()) {
      await context.reply({ embeds: [startEmbed] });
    } else {
      await channel.send({ embeds: [startEmbed] });
    }

    // 5. Setup Message Collector
    const filter = (m) => !m.author.bot;
    const collector = channel.createMessageCollector({
      filter,
      time: timerSeconds * 1000,
    });

    gameManager.setCollector(channelId, collector);

    // Track player cooldowns & attempt counts
    const playerCooldowns = new Map(); // userId -> lastAttemptTimestamp
    const playerAttempts = new Map();  // userId -> attemptCount
    let isRoundFinished = false;

    collector.on('collect', async (msg) => {
      if (isRoundFinished) return;

      const input = msg.content.trim();
      // Ignore non-digit messages
      if (!/^\d+$/.test(input)) return;

      const guess = parseInt(input, 10);
      // Validate range 1 to 100
      if (isNaN(guess) || guess < 1 || guess > 100) return;

      const userId = msg.author.id;
      const now = Date.now();

      // Cooldown check (2 seconds per player)
      const lastGuessTime = playerCooldowns.get(userId) || 0;
      if (now - lastGuessTime < cooldownMs) {
        return; // Ignore rapid guesses
      }
      playerCooldowns.set(userId, now);

      // Increment player attempt count
      const attempts = (playerAttempts.get(userId) || 0) + 1;
      playerAttempts.set(userId, attempts);

      if (guess === secretNumber) {
        if (isRoundFinished) return;
        isRoundFinished = true;

        try {
          collector.stop('winner');
        } catch {
          // ignore
        }

        const authorName = msg.member?.displayName || msg.author.username;

        // Record win in database
        try {
          db.addWin(guildId, userId, authorName, 'guess_number', points);
        } catch (dbErr) {
          logger.warn('خطأ أثناء حفظ فوز لعبة خمن الرقم في قاعدة البيانات', dbErr);
        }

        // React with target emoji
        try {
          await msg.react('🎯');
        } catch {
          // ignore
        }

        // Send Win Message
        const winMessage = 
          `🏆 **فاز <@${userId}>!**\n\n` +
          `لقد خمنت الرقم الصحيح بعد **${attempts} محاولة**.\n\n` +
          `الرقم كان: **${secretNumber}**`;

        await channel.send(winMessage).catch(() => {});
      } else if (guess < secretNumber) {
        // Secret number is larger
        await channel.send('> 🔼 الرقم أكبر!').catch(() => {});
      } else {
        // Secret number is smaller
        await channel.send('> 🔽 الرقم أصغر!').catch(() => {});
      }
    });

    collector.on('end', async (_collected, reason) => {
      // Clear game lock
      gameManager.endGame(channelId);

      // Timeout message if no winner
      if (!isRoundFinished && reason === 'time') {
        isRoundFinished = true;
        const timeoutMessage =
          `⏰ **انتهى الوقت!**\n\n` +
          `لم يتمكن أحد من تخمين الرقم.\n\n` +
          `الرقم الصحيح كان: **${secretNumber}**`;

        await channel.send(timeoutMessage).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة خمن الرقم', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل اللعبة. حاول مرة أخرى.').catch(() => {});
  }
}

export default runGuessNumberGame;
