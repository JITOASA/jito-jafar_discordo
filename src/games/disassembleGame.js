/**
 * لعبة "فكك" (Disassemble Word Game Module)
 * Logic, message collectors, normalization, winner handling, cleanup.
 */

import { getRandomDisassembleWord, getDisassembledAnswer, normalizeDisassembleText } from './datasets/disassembleWords.js';
import { embeds } from '../utils/embeds.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Runs a round of the Disassemble Game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runDisassembleGame(context) {
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
    // 2. Prepare random target word & expected disassembled answer
    const targetWord = getRandomDisassembleWord();
    const expectedAnswer = getDisassembledAnswer(targetWord);
    const expectedNormalized = normalizeDisassembleText(expectedAnswer);
    const timerSeconds = config.games.disassemble?.timerSeconds || 15;
    const points = config.games.disassemble?.pointsPerWin || 10;
    const startTime = Date.now();

    // 3. Register game lock
    gameManager.startGame(channelId, 'فكك', { targetWord, expectedAnswer });

    // 4. Send Game Embed
    const gameEmbed = embeds.disassembleGame(targetWord, timerSeconds);
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

    // Lifecycle Guard: Ensure winner or timeout result is processed ONCE
    let isRoundFinished = false;

    collector.on('collect', async (msg) => {
      if (isRoundFinished) return;

      const userId = msg.author.id;
      // Normalize user input (trims extra spaces, normalizes multiple spaces to single spaces)
      const userNormalized = normalizeDisassembleText(msg.content);

      // Check match
      if (userNormalized === expectedNormalized) {
        if (isRoundFinished) return;
        isRoundFinished = true;

        try {
          collector.stop('winner');
        } catch {
          // ignore
        }

        const timeTakenSec = (Date.now() - startTime) / 1000;
        const authorName = msg.member?.displayName || msg.author.username;

        // Record win in database
        db.addWin(guildId, userId, authorName, 'disassemble', points);

        // React with trophy on the winning message
        try {
          await msg.react('🏆');
        } catch {
          // ignore
        }

        // Send winner announcement
        const winnerEmbed = embeds.winner('لعبة فكك 🔄', msg.author, expectedAnswer, points, timeTakenSec);
        await channel.send({
          content: `🏆 **فاز باللعبة! 👑** <@${userId}>`,
          embeds: [winnerEmbed],
        }).catch(() => {});
      }
      // Incorrect responses are ignored according to rules
    });

    collector.on('end', async (_collected, reason) => {
      // Clear game lock
      gameManager.endGame(channelId);

      if (!isRoundFinished && reason === 'time') {
        isRoundFinished = true;
        const timeoutEmbed = embeds.timeout('لعبة فكك 🔄', `${targetWord} ← (${expectedAnswer})`);
        await channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة فكك', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل اللعبة. حاول مرة أخرى.').catch(() => {});
  }
}

export default runDisassembleGame;
