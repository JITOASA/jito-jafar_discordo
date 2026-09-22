/**
 * Slash Command: /غميضة
 * Prefix Command: !غميضة / !غميضه
 * Starts an interactive multiplayer Hide & Seek (غميضة) game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runHideAndSeekGame } from '../games/hideAndSeekGame.js';

export const hideAndSeekCommand = {
  data: new SlashCommandBuilder()
    .setName('غميضة')
    .setDescription('بدء لعبة غميضة جماعية تفاعلية بالأزرار (4 لاعبين على الأقل)')
    .setDescriptionLocalizations({
      'en-US': 'Start an interactive multiplayer Hide & Seek game with buttons (min 4 players)',
      'en-GB': 'Start an interactive multiplayer Hide & Seek game with buttons (min 4 players)',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!غميضة',
  aliases: ['غميضة', 'غميضه', 'hide_and_seek', 'hideandseek'],

  /**
   * Unified executor for both Slash command (/غميضة) and Prefix command (!غميضة)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runHideAndSeekGame(context);
  },
};

export default hideAndSeekCommand;
