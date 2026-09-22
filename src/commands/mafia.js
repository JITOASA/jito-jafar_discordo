/**
 * Slash Command: /mafia
 * Prefix Command: !mafia
 * Starts a multiplayer Mafia game with interactive Discord buttons.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runMafiaGame } from '../games/mafiaGame.js';

export const mafiaCommand = {
  data: new SlashCommandBuilder()
    .setName('mafia')
    .setDescription('بدء لعبة مافيا جماعية تفاعلية بالأزرار (4 لاعبين على الأقل)')
    .setDescriptionLocalizations({
      'en-US': 'Start an interactive multiplayer Mafia game with buttons (min 4 players)',
      'en-GB': 'Start an interactive multiplayer Mafia game with buttons (min 4 players)',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!مافيا',
  aliases: ['mafia', 'مافيا'],

  /**
   * Unified executor for both Slash command (/mafia) and Prefix command (!mafia)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runMafiaGame(context);
  },
};

export default mafiaCommand;
