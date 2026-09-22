/**
 * Slash Command: /leaderboard
 * Prefix Command: !نقاط
 * Displays top players and their wins for the current Discord server.
 */

import { SlashCommandBuilder } from 'discord.js';
import db from '../database/index.js';
import { embeds } from '../utils/embeds.js';
import logger from '../utils/logger.js';

export const leaderboardCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('عرض لوحة المتصدرين ونقاط اللاعبين في هذا السيرفر')
    .setDescriptionLocalizations({
      'en-US': 'Show the server mini-games leaderboard',
      'en-GB': 'Show the server mini-games leaderboard',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!نقاط',
  aliases: ['نقاط', 'النقاط', 'leaderboard', 'top', 'score', 'scores'],

  /**
   * Unified executor for both Slash command (interaction) and Prefix command (message)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    try {
      const guildId = context.guildId || 'dm';
      const guildName = context.guild?.name || 'السيرفر';
      
      const topPlayers = db.getGuildLeaderboard(guildId, 10);
      const lbEmbed = embeds.leaderboard(guildName, topPlayers);

      if (context.isCommand && context.isCommand()) {
        await context.reply({ embeds: [lbEmbed] });
      } else if (context.channel) {
        await context.channel.send({ embeds: [lbEmbed] });
      }
    } catch (err) {
      logger.error('حدث خطأ أثناء عرض لوحة المتصدرين', err);
      const errorMsg = '⚠️ تعذر تحميل لوحة المتصدرين حالياً. حاول مرة أخرى.';
      if (context.isCommand && context.isCommand()) {
        if (context.replied || context.deferred) {
          await context.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
        } else {
          await context.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
        }
      } else if (context.channel) {
        await context.channel.send(errorMsg).catch(() => {});
      }
    }
  },
};

export default leaderboardCommand;
