/**
 * Slash Command: /flags
 * Prefix Command: !اعلام
 * Starts a new round of the country flag guessing mini-game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runFlagsGame } from '../games/flagsGame.js';

export const flagsCommand = {
  data: new SlashCommandBuilder()
    .setName('flags')
    .setDescription('بدء جولة جديدة من لعبة تخمين أعلام الدول')
    .setDescriptionLocalizations({
      'en-US': 'Start a round of country flag guessing mini-game',
      'en-GB': 'Start a round of country flag guessing mini-game',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!اعلام',
  aliases: ['اعلام', 'أعلام', 'علم', 'flags', 'flag'],

  /**
   * Unified executor for both Slash command (/flags) and Prefix command (!اعلام)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runFlagsGame(context);
  },
};

export default flagsCommand;
