/**
 * Slash Command: /xo
 * Prefix Command: !xo
 * Starts a 2-player Tic-Tac-Toe (XO) match with interactive Discord buttons.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runXOGame } from '../games/xoGame.js';

export const xoCommand = {
  data: new SlashCommandBuilder()
    .setName('xo')
    .setDescription('بدء مباراة XO (تيك تاك تو) تفاعلية بين لاعبين بالأزرار')
    .setDescriptionLocalizations({
      'en-US': 'Start an interactive 2-player Tic-Tac-Toe (XO) game with buttons',
      'en-GB': 'Start an interactive 2-player Tic-Tac-Toe (XO) game with buttons',
    })
    .addUserOption((option) =>
      option
        .setName('opponent')
        .setDescription('العضو الذي تريد تحديه (اختياري: إن لم تحدد سيفتح لوبي مفتوح)')
        .setDescriptionLocalizations({
          'en-US': 'The member you want to challenge (optional)',
          'en-GB': 'The member you want to challenge (optional)',
        })
        .setRequired(false)
    ),

  // Primary prefix and supported text aliases
  primaryPrefix: '!xo',
  aliases: ['xo', 'اكس_او', 'تيك_تاك_تو', 'اكس'],

  /**
   * Unified executor for both Slash command (/xo) and Prefix command (!xo)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    let challengedUser = null;

    if (context.isCommand && context.isCommand()) {
      challengedUser = context.options.getUser('opponent') || context.options.getUser('user');
    } else if (context.mentions && context.mentions.users) {
      // For message prefix: check if an opponent was mentioned (!xo @user)
      const mentions = context.mentions.users.filter((u) => !u.bot && u.id !== context.author.id);
      challengedUser = mentions.first() || null;
    }

    await runXOGame(context, challengedUser);
  },
};

export default xoCommand;
