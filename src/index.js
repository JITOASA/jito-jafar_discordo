/**
 * Main Entry Point for "جعفر" (Ja'far) Discord Mini-Games Bot
 * Connects to Discord Gateway, registers event handlers, and manages bot lifecycle.
 */

import { Client, GatewayIntentBits, ActivityType, Events } from 'discord.js';
import config from './config/index.js';
import { handleInteraction, handleMessage } from './commands/index.js';
import logger from './utils/logger.js';

let clientInstance = null;
let botStatus = {
  connected: false,
  readyAt: null,
  user: null,
  guildsCount: 0,
  lastError: null,
};

/**
 * Creates and starts the Discord Bot client
 */
export function startBot() {
  const token = config.discord.token;

  if (!token || token.trim() === '' || token === 'YOUR_DISCORD_BOT_TOKEN') {
    logger.warn('لم يتم تحديد DISCORD_TOKEN صالح. البوت في وضع الاستعداد بانتظار إدخال التوكن في متغيرات البيئة.');
    botStatus.lastError = 'DISCORD_TOKEN is missing or placeholder';
    return null;
  }

  if (clientInstance) {
    logger.info('البوت قيد التشغيل بالفعل.');
    return clientInstance;
  }

  logger.info('جاري تشغيل بوت جعفر والاتصال ببوابة ديسكورد...');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Required for reading game answers
    ],
  });

  // Ready Event
  client.once(Events.ClientReady, (readyClient) => {
    botStatus.connected = true;
    botStatus.readyAt = new Date();
    botStatus.user = {
      id: readyClient.user.id,
      tag: readyClient.user.tag,
      username: readyClient.user.username,
      avatar: readyClient.user.displayAvatarURL(),
    };
    botStatus.guildsCount = readyClient.guilds.cache.size;
    botStatus.lastError = null;

    logger.success(`تم تسجيل الدخول بنجاح كـ ${readyClient.user.tag}!`);
    logger.info(`متصل حالياً في ${readyClient.guilds.cache.size} سيرفر ديسكورد.`);

    // Set custom Arabic activity
    readyClient.user.setPresence({
      activities: [
        {
          name: '🎮 /اعكس و /اعلام | بوت جعفر',
          type: ActivityType.Playing,
        },
      ],
      status: 'online',
    });
  });

  // Slash Commands Interaction Handler
  client.on(Events.InteractionCreate, async (interaction) => {
    await handleInteraction(interaction);
  });

  // Text Prefix & Arabic Command Handler (e.g., !اعكس, !اعلام, !نقاط, !ping)
  client.on(Events.MessageCreate, async (message) => {
    await handleMessage(message);
  });

  // Error handling to prevent bot process from exiting
  client.on(Events.Error, (err) => {
    logger.error('Discord Client Error:', err);
    botStatus.lastError = err.message || 'Discord Client Error';
  });

  client.on(Events.ShardDisconnect, () => {
    logger.warn('انقطع الاتصال مع ديسكورد، جاري محاولة إعادة الاتصال...');
    botStatus.connected = false;
  });

  client.on(Events.ShardReconnecting, () => {
    logger.info('جاري إعادة الاتصال بديسكورد...');
  });

  client.login(token).catch((err) => {
    logger.error('فشل تسجيل الدخول إلى ديسكورد. تأكد من صحة التوكن في .env', err);
    botStatus.connected = false;
    botStatus.lastError = err.message || 'Login failed';
  });

  clientInstance = client;
  return client;
}

export function getBotStatus() {
  if (clientInstance && clientInstance.isReady()) {
    botStatus.connected = true;
    botStatus.guildsCount = clientInstance.guilds.cache.size;
    botStatus.user = {
      id: clientInstance.user.id,
      tag: clientInstance.user.tag,
      username: clientInstance.user.username,
      avatar: clientInstance.user.displayAvatarURL(),
    };
  }
  return botStatus;
}

export function getClient() {
  return clientInstance;
}

// Handle global unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
});

// If executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startBot();
}

export default {
  startBot,
  getBotStatus,
  getClient,
};
