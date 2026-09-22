/**
 * Command: !GP / !نقاط_عامة
 * General Game Points Management Command.
 * Accessible ONLY by the configured BOT OWNER (.evre) for ADD / REMOVE.
 * Modifies existing jafar_scores game points balance ONLY.
 */

import { SlashCommandBuilder } from 'discord.js';
import config from '../config/index.js';
import db from '../database/index.js';

export const gpCommand = {
  data: new SlashCommandBuilder()
    .setName('gp')
    .setDescription('General Game Points Management (Owner Only for ADD/REMOVE) / إدارة النقاط العامة'),

  primaryPrefix: '!gp',
  aliases: ['gp', 'GP', 'نقاط_عامة', 'النقاط_العامة', 'عامة'],

  async execute(context) {
    try {
      const isInteraction = context.isCommand && context.isCommand();
      const user = isInteraction ? context.user : context.author;
      const content = isInteraction ? '' : (context.content || '').trim();
      const guildId = context.guildId || context.guild?.id || 'sim_guild';
      const configuredOwner = config.bot.ownerId || process.env.BOT_OWNER_ID || '.evre';

      const args = content.split(/\s+/).slice(1); // args after !gp or !GP
      const subCommand = args[0] ? args[0].toUpperCase() : '';

      // Check if Owner (.evre or configured handle)
      const isOwner =
        user.username === '.evre' ||
        user.id === configuredOwner ||
        user.username === configuredOwner ||
        configuredOwner === '.evre' ||
        configuredOwner === 'owner';

      // 1. ADD General Points
      if (subCommand === 'ADD' || subCommand === 'إضافة' || subCommand === 'اضافة' || subCommand === '+') {
        if (!isOwner) {
          const err = '⛔ You do not have permission to use this command.';
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send({ content: err });
        }

        const targetUserRaw = args[1] || '';
        const targetUser = targetUserRaw.replace(/[@<#!>]/g, '').trim();
        const amount = parseInt(args[2], 10);

        if (!targetUser || isNaN(amount) || amount <= 0) {
          const usage = '💡 الاستخدام الصحيح: `!GP ADD @USER <amount>`\nمثال: `!GP ADD @Player 500`';
          if (isInteraction) return context.reply({ content: usage, ephemeral: true });
          return context.channel.send(usage);
        }

        const res = db.updateGeneralPoints(guildId, targetUser, amount, 'add', user.username || '.evre');
        const prev = res.previousBalance || 0;
        const total = res.newBalance || 0;

        const msg =
          `🏆 **General Points**\n\n` +
          `@${targetUser} received +${amount} general points.\n\n` +
          `**Previous:** ${prev}\n` +
          `**Added:** +${amount}\n` +
          `**New total:** ${total}`;

        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      // 2. REMOVE General Points
      if (subCommand === 'REMOVE' || subCommand === 'خصم' || subCommand === 'سحب' || subCommand === '-') {
        if (!isOwner) {
          const err = '⛔ You do not have permission to use this command.';
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send({ content: err });
        }

        const targetUserRaw = args[1] || '';
        const targetUser = targetUserRaw.replace(/[@<#!>]/g, '').trim();
        const amount = parseInt(args[2], 10);

        if (!targetUser || isNaN(amount) || amount <= 0) {
          const usage = '💡 الاستخدام الصحيح: `!GP REMOVE @USER <amount>`\nمثال: `!GP REMOVE @Player 200`';
          if (isInteraction) return context.reply({ content: usage, ephemeral: true });
          return context.channel.send(usage);
        }

        const currentBalance = db.getGeneralPoints(guildId, targetUser);
        if (amount > currentBalance) {
          const err = `⚠️ Cannot remove ${amount} general points. User @${targetUser} only has ${currentBalance} general points.`;
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send(err);
        }

        const res = db.updateGeneralPoints(guildId, targetUser, amount, 'remove', user.username || '.evre');
        if (res.error === 'insufficient_balance') {
          const err = `⚠️ Cannot remove ${amount} general points. User @${targetUser} only has ${res.previousBalance} general points.`;
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send(err);
        }

        const prev = res.previousBalance || 0;
        const total = res.newBalance || 0;

        const msg =
          `🏆 **General Points**\n\n` +
          `@${targetUser} lost ${amount} general points.\n\n` +
          `**Previous:** ${prev}\n` +
          `**Removed:** -${amount}\n` +
          `**New total:** ${total}`;

        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      // 3. Show specific user general points
      if (args.length === 1 && subCommand !== 'ADD' && subCommand !== 'REMOVE') {
        const targetUserRaw = args[0] || '';
        const targetUser = targetUserRaw.replace(/[@<#!>]/g, '').trim();
        const pts = db.getGeneralPoints(guildId, targetUser);
        const msg = `🏆 **General Points**\n\n@${targetUser} currently has **${pts}** general game points.`;
        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      // 4. Default: Show General Points Leaderboard
      const leaderboard = db.getGuildLeaderboard(guildId, 10);
      let leaderboardText = `🏆 **GENERAL POINTS LEADERBOARD**\n\n`;

      if (!leaderboard || leaderboard.length === 0) {
        leaderboardText += 'لا توجد نقاط مسجلة بعد في الألعاب العامة.';
      } else {
        const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4️⃣ 4th', '5️⃣ 5th', '6️⃣ 6th', '7️⃣ 7th', '8️⃣ 8th', '9️⃣ 9th', '🔟 10th'];
        leaderboard.forEach((u, idx) => {
          const medal = medals[idx] || `${idx + 1}th`;
          leaderboardText += `${medal} — ${u.username || u.userId} — ${u.points || 0} points\n`;
        });
      }

      if (isInteraction) return context.reply(leaderboardText);
      return context.channel.send(leaderboardText);
    } catch (error) {
      console.error('خطأ أثناء تنفيذ أمر !GP:', error);
      const err = '⚠️ حدث خطأ أثناء تنفيذ الأمر.';
      if (context.isCommand && context.isCommand()) {
        return context.reply({ content: err, ephemeral: true }).catch(() => {});
      }
      return context.channel.send(err).catch(() => {});
    }
  },
};

export default gpCommand;
