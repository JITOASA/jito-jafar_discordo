/**
 * Slash Commands Deploy Script for جعفر Bot
 * Deploys slash commands to Discord Global or specific Guild for instant testing.
 * 
 * Usage:
 *   node src/deploy-commands.js
 */

import { REST, Routes } from 'discord.js';
import config from './config/index.js';
import { commandsList } from './commands/index.js';
import logger from './utils/logger.js';

export async function deploySlashCommands(customToken, customClientId, customGuildId) {
  const token = customToken || config.discord.token;
  const clientId = customClientId || config.discord.clientId;
  const guildId = customGuildId || config.discord.guildId;

  if (!token) {
    logger.warn('لم يتم العثور على DISCORD_TOKEN في متغيرات البيئة. لا يمكن تسجيل الأوامر.');
    return { success: false, error: 'DISCORD_TOKEN is missing' };
  }

  if (!clientId) {
    logger.warn('لم يتم العثور على DISCORD_CLIENT_ID في متغيرات البيئة.');
    return { success: false, error: 'DISCORD_CLIENT_ID is missing' };
  }

  const commandsData = commandsList.map(cmd => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info(`بدء تحديث ${commandsData.length} من أوامر السلاش (/) في ديسكورد...`);

    let data;
    if (guildId) {
      // Guild-specific registration (instant updates during development)
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commandsData }
      );
      logger.success(`تم تسجيل ${data.length} أمر سلاش بنجاح في السيرفر المحدد (${guildId})!`);
    } else {
      // Global registration (available across all servers where bot is added)
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commandsData }
      );
      logger.success(`تم تسجيل ${data.length} أمر سلاش بنجاح عالمياً (Global)!`);
    }

    return { success: true, count: data.length, data };
  } catch (error) {
    logger.error('حدث خطأ أثناء تسجيل أوامر السلاش في ديسكورد', error);
    return { success: false, error: error.message || error };
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('deploy-commands.js')) {
  deploySlashCommands();
}

export default deploySlashCommands;
