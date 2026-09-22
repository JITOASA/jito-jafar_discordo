/**
 * لعبة "زر" (Button Speed Click Game Module)
 * Solo speed-reaction game using Discord ActionRow Buttons.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import config from '../config/index.js';
import db from '../database/index.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

// Remember last target index in memory to avoid repetitive target placements
let lastTargetIndex = null;

/**
 * Runs a round of the Button Game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runButtonGame(context) {
  const channel = context.channel;
  const channelId = channel.id;
  const guildId = context.guildId || 'dm';

  // Extract host user
  const hostUser = context.user || context.author;
  const hostUserId = hostUser.id;
  const hostName = context.member?.displayName || hostUser.username;

  // 1. Guard against simultaneous games in same channel
  if (gameManager.isGameActive(channelId)) {
    const errorMsg = '⚠️ توجد لعبة جارية حالياً في هذه القناة! انتظر حتى تنتهي قبل بدء جولة جديدة.';
    if (context.isCommand && context.isCommand()) {
      return context.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
    return channel.send(errorMsg).catch(() => {});
  }

  try {
    const timerSeconds = config.games.button?.timerSeconds || 10;
    const points = config.games.button?.pointsPerWin || 10;

    // 2. Select target button (0 to 3), avoiding immediate repetition
    let targetIndex = Math.floor(Math.random() * 4);
    if (lastTargetIndex !== null && targetIndex === lastTargetIndex) {
      targetIndex = (targetIndex + 1) % 4;
    }
    lastTargetIndex = targetIndex;

    // 3. Register game lock in GameManager
    gameManager.startGame(channelId, 'زر', { targetIndex, hostUserId });

    // 4. Build Initial Game Embed & Buttons
    const gameEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🔘 اضغط الزر الصحيح!')
      .setDescription(
        `اضغط على الزر الصحيح بأسرع وقت.\n\n` +
        `[ 🔵 ] [ 🟢 ] [ 🟡 ] [ 🔴 ]\n\n` +
        `زر واحد فقط هو الصحيح.\n` +
        `⏱️ لديك **${timerSeconds}** ثوانٍ.\n` +
        `👤 المسموح له باللعب: <@${hostUserId}>`
      )
      .setFooter({ text: 'بوت جعفر • لعبة زر • السرعة والدقة تفوز!' })
      .setTimestamp();

    const buttons = [
      new ButtonBuilder().setCustomId('button_game_0').setLabel('أزرق').setEmoji('🔵').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('button_game_1').setLabel('أخضر').setEmoji('🟢').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('button_game_2').setLabel('أصفر').setEmoji('🟡').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('button_game_3').setLabel('أحمر').setEmoji('🔴').setStyle(ButtonStyle.Danger),
    ];

    const actionRow = new ActionRowBuilder().addComponents(buttons);

    let gameMessage;
    if (context.isCommand && context.isCommand()) {
      const reply = await context.reply({ embeds: [gameEmbed], components: [actionRow], fetchReply: true });
      gameMessage = reply;
    } else {
      gameMessage = await channel.send({ embeds: [gameEmbed], components: [actionRow] });
    }

    const startTime = Date.now();

    // 5. Setup Component Collector
    const collector = gameMessage.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('button_game_'),
      time: timerSeconds * 1000,
    });

    gameManager.setCollector(channelId, collector);

    let isRoundFinished = false;

    collector.on('collect', async (interaction) => {
      // Ignore clicks from non-host players
      if (interaction.user.id !== hostUserId) {
        return interaction.reply({
          content: `⚠️ هذه الجولة خاصة بـ <@${hostUserId}> فقط! اكتب \`!زر\` لبدء لعبتك الخاصة.`,
          ephemeral: true,
        }).catch(() => {});
      }

      if (isRoundFinished) return;
      isRoundFinished = true;

      const clickTime = Date.now();
      const timeTakenSec = (clickTime - startTime) / 1000;

      const clickedIndex = parseInt(interaction.customId.replace('button_game_', ''), 10);

      // Disable all buttons
      const disabledButtons = buttons.map((b) => ButtonBuilder.from(b).setDisabled(true));
      const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

      collector.stop('clicked');

      if (clickedIndex === targetIndex) {
        // --- WINNER ---
        db.addWin(guildId, hostUserId, hostName, 'button', points);

        const winEmbed = new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('🔘 أحسنت!')
          .setDescription(
            `🏆 <@${hostUserId}>\n\n` +
            `ضغطت الزر الصحيح!\n\n` +
            `⚡ الوقت: **${timeTakenSec.toFixed(2)} ثانية**\n` +
            `⭐ **+${points} نقاط**`
          )
          .setFooter({ text: 'بوت جعفر • مبروك الفوز السريع!' })
          .setTimestamp();

        await interaction.update({ embeds: [winEmbed], components: [disabledRow] }).catch(() => {});
      } else {
        // --- WRONG ---
        const lossEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('❌ خطأ!')
          .setDescription(
            `ضغطت الزر الخاطئ.\n\n` +
            `تنتهي الجولة مباشرة.`
          )
          .setFooter({ text: 'بوت جعفر • حظاً أوفر في الجولة القادمة!' })
          .setTimestamp();

        await interaction.update({ embeds: [lossEmbed], components: [disabledRow] }).catch(() => {});
      }
    });

    collector.on('end', async (_collected, reason) => {
      // Clear game lock
      gameManager.endGame(channelId);

      if (!isRoundFinished && reason === 'time') {
        isRoundFinished = true;

        // Disable all buttons on timeout
        const disabledButtons = buttons.map((b) => ButtonBuilder.from(b).setDisabled(true));
        const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

        const timeoutEmbed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('⏰ انتهى الوقت!')
          .setDescription(`لم تقم بالضغط على أي زر خلال 10 ثوانٍ.\n\nانتهت الجولة بدون فائز.`)
          .setFooter({ text: 'بوت جعفر • حاول مرة أخرى بإرسال !زر' })
          .setTimestamp();

        if (gameMessage && gameMessage.editable) {
          await gameMessage.edit({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        } else {
          await channel.send({ embeds: [timeoutEmbed], components: [disabledRow] }).catch(() => {});
        }
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة زر', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل لعبة زر. حاول مرة أخرى.').catch(() => {});
  }
}

export default runButtonGame;
