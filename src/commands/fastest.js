/**
 * Command: /اسرع or !اسرع
 * Runs the Fastest Typing Game
 */

import { SlashCommandBuilder } from 'discord.js';
import { runFastestGame } from '../games/fastestGame.js';

export const fastestCommand = {
  data: new SlashCommandBuilder()
    .setName('اسرع')
    .setDescription('لعبة أسرع — أسرع كتابة للنص المطلوب')
    .setDescriptionLocalizations({
      'en-US': 'Fastest typing speed game',
      'en-GB': 'Fastest typing speed game',
    }),

  primaryPrefix: '!اسرع',
  aliases: ['اسرع', 'أسرع', '!أسرع', 'fastest'],

  /**
   * Executed on /اسرع or !اسرع
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runFastestGame(context);
  },
};

export default fastestCommand;
