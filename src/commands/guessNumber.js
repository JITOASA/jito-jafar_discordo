/**
 * Slash Command: /guess
 * Prefix Command: !خمن
 * Text Command: خمن
 * Starts a new round of Guess the Secret Number (1 - 100) game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runGuessNumberGame } from '../games/guessNumberGame.js';

export const guessNumberCommand = {
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('بدء جولة جديدة من لعبة خمن الرقم بين 1 و 100')
    .setDescriptionLocalizations({
      'en-US': 'Start a round of Guess the Number mini-game (1 - 100)',
      'en-GB': 'Start a round of Guess the Number mini-game (1 - 100)',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!خمن',
  aliases: [
    'خمن',
    'خمن_الرقم',
    'الرقم',
    'رقم',
    'guess',
    'guess_number',
    'number',
  ],

  /**
   * Unified executor for Slash command (/guess) and Prefix command (!خمن)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runGuessNumberGame(context);
  },
};

export default guessNumberCommand;
