/**
 * Central Commands Registry and Shared Dispatcher for جعفر Bot
 * Handles both Slash Commands and Prefix/Arabic Text Commands without duplicating game logic.
 */

import pingCommand from './ping.js';
import reverseCommand from './reverse.js';
import flagsCommand from './flags.js';
import harfCommand from './harf.js';
import xoCommand from './xo.js';
import leaderboardCommand from './leaderboard.js';
import helpCommand from './help.js';
import gamesCommand from './games.js';
import guessNumberCommand from './guessNumber.js';
import buttonCommand from './button.js';
import fastestCommand from './fastest.js';
import disassembleCommand from './disassemble.js';
import correctCommand from './correct.js';
import mafiaCommand from './mafia.js';
import hideAndSeekCommand from './hideAndSeek.js';
import chairsCommand from './chairs.js';
import rouletteCommand from './roulette.js';
import pointsCommand from './points.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

export const commandsList = [
  reverseCommand,
  flagsCommand,
  harfCommand,
  guessNumberCommand,
  buttonCommand,
  fastestCommand,
  disassembleCommand,
  correctCommand,
  xoCommand,
  mafiaCommand,
  hideAndSeekCommand,
  chairsCommand,
  rouletteCommand,
  pointsCommand,
  leaderboardCommand,
  gamesCommand,
  pingCommand,
  helpCommand,
];

// Map of slash command name -> command object
export const commandsMap = new Map();

// Map of alias / text command -> command object
export const aliasesMap = new Map();

for (const cmd of commandsList) {
  if (cmd.data && cmd.data.name) {
    commandsMap.set(cmd.data.name.toLowerCase(), cmd);
  }

  if (cmd.aliases && Array.isArray(cmd.aliases)) {
    for (const alias of cmd.aliases) {
      aliasesMap.set(alias.toLowerCase(), cmd);
    }
  }

  if (cmd.primaryPrefix) {
    // e.g., '!اعكس' -> remove prefix and register, and keep full trigger
    const cleanPrefix = cmd.primaryPrefix.startsWith('!') ? cmd.primaryPrefix.slice(1) : cmd.primaryPrefix;
    aliasesMap.set(cleanPrefix.toLowerCase(), cmd);
  }
}

/**
 * Shared Handler for Discord Slash Command Interactions
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 */
export async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsMap.get(interaction.commandName.toLowerCase());
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`خطأ أثناء تنفيذ أمر السلاش /${interaction.commandName}`, error);
    const errorPayload = {
      content: '⚠️ حدث خطأ أثناء تنفيذ هذا الأمر. يرجى المحاولة مرة أخرى.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorPayload).catch(() => {});
    } else {
      await interaction.reply(errorPayload).catch(() => {});
    }
  }
}

/**
 * Shared Handler for Discord Prefix / Text Messages (e.g. !اعكس, !اعلام, !نقاط)
 * Works directly with MessageContent intent.
 * @param {import('discord.js').Message} message 
 */
export async function handleMessage(message) {
  if (message.author.bot || !message.content) return;

  const content = message.content.trim();
  const configuredPrefix = config.bot.prefix || '!';

  let commandKey = '';

  // 1. Check if message starts with configured prefix (e.g., !اعكس, !اعلام, !نقاط, !ping)
  if (content.startsWith(configuredPrefix)) {
    const withoutPrefix = content.slice(configuredPrefix.length).trim();
    commandKey = withoutPrefix.split(/\s+/)[0].toLowerCase();
  } else {
    // 2. Also support direct Arabic commands without exclamation mark if enabled
    const firstWord = content.split(/\s+/)[0].toLowerCase();
    if (['اعكس', 'اعلام', 'أعلام', 'حرف', 'الحرف', 'خمن', 'خمن_الرقم', 'رقم', 'الرقم', 'زر', 'الزر', 'button', 'اسرع', 'أسرع', 'fastest', 'فكك', 'فك', 'disassemble', 'صحح', 'الصحح', 'correct', 'مافيا', 'mafia', 'غميضة', 'غميضه', 'كراسي', 'كراسيه', 'chairs', 'نقاط', 'النقاط', 'مساعدة', 'العاب', 'ألعاب', 'الالعاب', 'الألعاب', 'games', 'guess'].includes(firstWord)) {
      commandKey = firstWord;
    }
  }

  if (!commandKey) return;

  // Find command in aliases or commands map
  const command = aliasesMap.get(commandKey) || commandsMap.get(commandKey);
  if (!command) return;

  try {
    await command.execute(message);
  } catch (error) {
    logger.error(`خطأ أثناء تنفيذ الأمر النصي ${commandKey}`, error);
    message.channel.send('⚠️ حدث خطأ أثناء تنفيذ هذا الأمر. يرجى المحاولة مرة أخرى.').catch(() => {});
  }
}

export default {
  list: commandsList,
  map: commandsMap,
  aliases: aliasesMap,
  handleInteraction,
  handleMessage,
};
