/**
 * Slash Command: /reverse
 * Prefix Command: !اعكس
 * Starts a new round of the Arabic reverse text mini-game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runReverseGame } from '../games/reverseGame.js';

export const reverseCommand = {
  data: new SlashCommandBuilder()
    .setName('reverse')
    .setDescription('بدء جولة جديدة من لعبة اعكس الكلمات العربية')
    .setDescriptionLocalizations({
      'en-US': 'Start a round of Arabic reverse word mini-game',
      'en-GB': 'Start a round of Arabic reverse word mini-game',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!اعكس',
  aliases: ['اعكس', 'عكس', 'reverse', 'revers'],

  /**
   * Unified executor for both Slash command (/reverse) and Prefix command (!اعكس)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runReverseGame(context);
  },
};

export default reverseCommand;
