/**
 * Slash Command: /games
 * Prefix Command: !العاب
 * Text Command: العاب
 * Displays the dynamic list of all available games from the central Game Registry.
 */

import { SlashCommandBuilder } from 'discord.js';
import embeds from '../utils/embeds.js';

export const gamesCommand = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('عرض قائمة ألعاب جعفر المتوفرة حالياً في البوت')
    .setDescriptionLocalizations({
      'en-US': 'Display the list of currently available games in Ja\'far bot',
      'en-GB': 'Display the list of currently available games in Ja\'far bot',
    }),

  primaryPrefix: '!العاب',
  aliases: [
    'العاب',
    'ألعاب',
    'الالعاب',
    'الألعاب',
    'games',
    'game',
    'قائمة_الالعاب',
    'قائمة_الألعاب',
  ],

  /**
   * Unified executor for Slash command (/games), Prefix command (!العاب), and Text command (العاب)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    const embed = embeds.gamesList();

    if (context.isCommand && context.isCommand()) {
      await context.reply({ embeds: [embed] });
    } else if (context.channel) {
      await context.channel.send({ embeds: [embed] });
    }
  },
};

export default gamesCommand;
