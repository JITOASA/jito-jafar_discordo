/**
 * Slash Command: /صحح
 * Prefix Command: !صحح
 * Start a round of "صحح" (Correct Spelling Game).
 */

import { SlashCommandBuilder } from 'discord.js';
import { runCorrectGame } from '../games/correctGame.js';

export const correctCommand = {
  data: new SlashCommandBuilder()
    .setName('صحح')
    .setDescription('بدء لعبة صحح لتصحيح الخطأ الإملائي في الجملة')
    .setDescriptionLocalizations({
      'en-US': 'Start a round of the Correct Spelling Game',
      'en-GB': 'Start a round of the Correct Spelling Game',
    }),

  primaryPrefix: '!صحح',
  aliases: ['صحح', 'الصحح', 'correct'],

  /**
   * Unified executor for both Slash command (/صحح) and Prefix command (!صحح)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runCorrectGame(context);
  },
};

export default correctCommand;
