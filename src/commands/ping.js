/**
 * Slash Command: /ping
 * Prefix Command: !ping / !بنق
 * Checks bot responsiveness, Discord WebSocket ping, and uptime.
 */

import { SlashCommandBuilder } from 'discord.js';
import { embeds } from '../utils/embeds.js';
import logger from '../utils/logger.js';

function formatUptime(uptimeMs) {
  if (!uptimeMs) return 'أقل من دقيقة';
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} يوم`);
  if (hours > 0) parts.push(`${hours} ساعة`);
  if (minutes > 0) parts.push(`${minutes} دقيقة`);
  parts.push(`${seconds} ثانية`);

  return parts.join(' و ');
}

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('فحص سرعة استجابة البوت وحالة الاتصال (Ping)')
    .setDescriptionLocalizations({
      'en-US': 'Check bot latency and Discord connection status',
      'en-GB': 'Check bot latency and Discord connection status',
    }),

  primaryPrefix: '!ping',
  aliases: ['ping', 'بنق', 'بينغ'],

  /**
   * Unified executor for both Slash command (/ping) and Prefix command (!ping)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    try {
      if (context.isCommand && context.isCommand()) {
        const sent = await context.reply({
          content: '⏳ جاري قياس سرعة الاستجابة...',
          fetchReply: true,
        });

        const botLatency = sent.createdTimestamp - context.createdTimestamp;
        const wsPing = Math.round(context.client.ws.ping);
        const uptimeStr = formatUptime(context.client.uptime);

        const pingEmbed = embeds.ping(wsPing, botLatency, uptimeStr);

        await context.editReply({
          content: null,
          embeds: [pingEmbed],
        });
      } else if (context.channel) {
        const sent = await context.channel.send('⏳ جاري فحص الاتصال...');
        const botLatency = sent.createdTimestamp - context.createdTimestamp;
        const wsPing = Math.round(context.client.ws.ping);
        const uptimeStr = formatUptime(context.client.uptime);

        const pingEmbed = embeds.ping(wsPing, botLatency, uptimeStr);

        await sent.edit({
          content: null,
          embeds: [pingEmbed],
        });
      }
    } catch (err) {
      logger.error('حدث خطأ أثناء فحص البنق', err);
    }
  },
};

export default pingCommand;
