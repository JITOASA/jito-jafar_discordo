/**
 * Slash Command: /harf
 * Prefix Command: !حرف
 * Text Command: حرف
 * Starts a new round of the Arabic letter & category guessing mini-game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runHarfGame } from '../games/harfGame.js';

export const harfCommand = {
  data: new SlashCommandBuilder()
    .setName('harf')
    .setDescription('بدء جولة جديدة من لعبة حرف وتصنيف')
    .setDescriptionLocalizations({
      'en-US': 'Start a round of Arabic letter & category guessing mini-game',
      'en-GB': 'Start a round of Arabic letter & category guessing mini-game',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!حرف',
  aliases: ['حرف', 'الحرف', 'harf', 'letter', 'ح'],

  /**
   * Unified executor for Slash command (/harf), Prefix command (!حرف), and Text command (حرف)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runHarfGame(context);
  },
};

export default harfCommand;
