/**
 * Slash Command: /روليت
 * Prefix Command: !روليت / روليت
 * Starts an interactive multiplayer Roulette (روليت) game.
 */

import { SlashCommandBuilder } from 'discord.js';
import { runRouletteGame } from '../games/rouletteGame.js';

export const rouletteCommand = {
  data: new SlashCommandBuilder()
    .setName('روليت')
    .setDescription('بدء لعبة روليت جماعية تفاعلية بالأزرار (4 لاعبين على الأقل)')
    .setDescriptionLocalizations({
      'en-US': 'Start an interactive multiplayer Roulette game (min 4 players)',
      'en-GB': 'Start an interactive multiplayer Roulette game (min 4 players)',
    }),

  // Primary prefix and supported text aliases
  primaryPrefix: '!روليت',
  aliases: ['روليت', 'roulette'],

  /**
   * Unified executor for both Slash command (/روليت) and Prefix command (!روليت)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    await runRouletteGame(context);
  },
};

export default rouletteCommand;
