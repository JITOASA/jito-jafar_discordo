/**
 * Slash Command: /كراسي
 * Prefix Command: !كراسي / !كراسيه / كراسي
 * Starts an interactive multiplayer Musical Chairs (كراسي) game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runChairsGame } from '../games/chairsGame.js';

export const chairsCommand = {
  data: new SlashCommandBuilder()
    .setName('كراسي')
    .setDescription('بدء لعبة الكراسي الموسيقية الجماعية بالأزرار (4 لاعبين على الأقل)')
    .setDescriptionLocalizations({
      'en-US': 'Start an interactive multiplayer Musical Chairs game (min 4 players)',
      'en-GB': 'Start an interactive multiplayer Musical Chairs game (min 4 players)',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!كراسي',
  aliases: ['كراسي', 'كراسيه', 'chairs', 'musical_chairs', 'musicalchairs'],

  /**
   * Unified executor for both Slash command (/كراسي) and Prefix command (!كراسي)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runChairsGame(context);
  },
};

export default chairsCommand;
