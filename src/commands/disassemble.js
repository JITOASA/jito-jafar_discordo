/**
 * Command: /فكك or !فكك
 * Runs the Disassemble Word Game
 */

import { SlashCommandBuilder } from 'discord.js';
import { runDisassembleGame } from '../games/disassembleGame.js';

export const disassembleCommand = {
  data: new SlashCommandBuilder()
    .setName('فكك')
    .setDescription('لعبة فكك — تفكيك الكلمة إلى حروف متباعدة')
    .setDescriptionLocalizations({
      'en-US': 'Disassemble word into space-separated characters',
      'en-GB': 'Disassemble word into space-separated characters',
    }),

  primaryPrefix: '!فكك',
  aliases: ['فكك', 'فك', '!فك', 'disassemble'],

  /**
   * Executed on /فكك or !فكك
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runDisassembleGame(context);
  },
};

export default disassembleCommand;
