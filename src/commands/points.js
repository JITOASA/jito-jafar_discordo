/**
 * Command: !POINTS / !نقاط
 * Tournament Points Management Command.
 * Accessible ONLY by the configured BOT OWNER (.evre) for ADD / REMOVE.
 */

import { SlashCommandBuilder } from 'discord.js';
import db from '../database/index.js';
import config from '../config/index.js';

export const pointsCommand = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('عرض وإدارة نقاط البطولة (خصيصاً لمالك البوت)'),

  primaryPrefix: '!points',
  aliases: ['points', 'نقاط', 'النقاط', '!نقاط'],

  async execute(context) {
    try {
      const isInteraction = context.isCommand && context.isCommand();
      const user = isInteraction ? context.user : context.author;
      const content = isInteraction ? '' : (context.content || '').trim();
      const configuredOwner = config.bot.ownerId || process.env.BOT_OWNER_ID || '.evre';

      const args = content.split(/\s+/).slice(1); // after !points or !نقاط
      const subCommand = args[0] ? args[0].toUpperCase() : '';

      // Check if Owner (.evre or configured handle/ID)
      const isOwner = user.username === '.evre' || user.id === configuredOwner || user.username === configuredOwner || configuredOwner === '.evre' || configuredOwner === 'owner';

      if (subCommand === 'ADD' || subCommand === 'إضافة' || subCommand === 'اضافة' || subCommand === '+') {
        if (!isOwner) {
          const err = '⛔ You do not have permission to use this command.\nThis command is restricted to the tournament owner.';
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send({ content: err });
        }

        const targetUserRaw = args[1] || '';
        const targetUser = targetUserRaw.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '');
        const amount = parseInt(args[2], 10);

        if (!targetUser || isNaN(amount) || amount <= 0) {
          const usage = '💡 الاستخدام الصحيح: `!POINTS ADD @USER <الكمية>`';
          if (isInteraction) return context.reply({ content: usage, ephemeral: true });
          return context.channel.send(usage);
        }

        const res = db.updateTournamentPoints(null, targetUser, amount, 'add', user.username || '.evre');
        const prev = res ? res.previousBalance : 0;
        const total = res ? res.newBalance : amount;

        const msg = `🏆 **Tournament Points**\n\n` +
          `@${targetUser} received +${amount} tournament points.\n\n` +
          `**Previous:** ${prev}\n` +
          `**Added:** +${amount}\n` +
          `**New total:** ${total}`;

        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      if (subCommand === 'REMOVE' || subCommand === 'خصم' || subCommand === 'سحب' || subCommand === '-') {
        if (!isOwner) {
          const err = '⛔ You do not have permission to use this command.\nThis command is restricted to the tournament owner.';
          if (isInteraction) return context.reply({ content: err, ephemeral: true });
          return context.channel.send({ content: err });
        }

        const targetUserRaw = args[1] || '';
        const targetUser = targetUserRaw.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '');
        const amount = parseInt(args[2], 10);

        if (!targetUser || isNaN(amount) || amount <= 0) {
          const usage = '💡 الاستخدام الصحيح: `!POINTS REMOVE @USER <الكمية>`';
          if (isInteraction) return context.reply({ content: usage, ephemeral: true });
          return context.channel.send(usage);
        }

        const res = db.updateTournamentPoints(null, targetUser, amount, 'remove', user.username || '.evre');
        const prev = res ? res.previousBalance : 0;
        const total = res ? res.newBalance : 0;

        const msg = `🏆 **Tournament Points**\n\n` +
          `@${targetUser} lost ${amount} tournament points.\n\n` +
          `**Previous:** ${prev}\n` +
          `**Removed:** -${amount}\n` +
          `**New total:** ${total}`;

        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      const activeTourn = db.getActiveTournament();

      // Check specific user points
      if (args.length === 1 && subCommand !== 'ADD' && subCommand !== 'REMOVE') {
        const targetUser = args[0].replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '');
        const pts = activeTourn?.tournamentPoints?.[targetUser] || 0;
        const msg = `🏆 نقاط البطولة للاعب **@${targetUser}**: **${pts}** نقطة.`;
        if (isInteraction) return context.reply(msg);
        return context.channel.send(msg);
      }

      // Default: Show Tournament Leaderboard
      const pointsMap = activeTourn?.tournamentPoints || {};
      const sorted = Object.entries(pointsMap).sort((a, b) => b[1] - a[1]);

      let leaderboardText = `🏆 **TOURNAMENT RESULTS**\n\n`;

      if (sorted.length === 0) {
        leaderboardText += 'لا توجد نقاط مسجلة بعد في هذه البطولة.';
      } else {
        const medals = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4️⃣ 4th', '5️⃣ 5th'];
        sorted.forEach(([name, pts], idx) => {
          const medal = medals[idx] || `${idx + 1}th`;
          leaderboardText += `${medal} — ${name} — ${pts} points\n`;
        });
      }

      if (isInteraction) return context.reply(leaderboardText);
      return context.channel.send(leaderboardText);

    } catch (err) {
      console.error('Error executing points command:', err);
    }
  }
};

export default pointsCommand;
