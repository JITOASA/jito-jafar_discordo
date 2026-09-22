/**
 * Command: /button or !زر
 * Runs the Button Speed Click Game
 */

import { SlashCommandBuilder } from 'discord.js';
import { runButtonGame } from '../games/buttonGame.js';

export const buttonCommand = {
  data: new SlashCommandBuilder()
    .setName('button')
    .setDescription('لعبة زر — الضغط السريع على الزر الصحيح')
    .setDescriptionLocalizations({
      'en-US': 'Fast button click reaction game',
      'en-GB': 'Fast button click reaction game',
    }),

  primaryPrefix: '!زر',
  aliases: ['زر', 'الزر', 'button'],

  /**
   * Executed on /button or !زر
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runButtonGame(context);
  },
};

export default buttonCommand;
