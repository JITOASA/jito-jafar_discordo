/**
 * Slash Command: /help
 * Prefix Command: !مساعدة
 * Guides and information about available mini-games.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../config/index.js';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('دليل استخدام بوت جعفر وقائمة الألعاب المتاحة')
    .setDescriptionLocalizations({
      'en-US': 'Show Ja\'far bot guide and available mini-games',
      'en-GB': 'Show Ja\'far bot guide and available mini-games',
    }),

  primaryPrefix: '!مساعدة',
  aliases: ['مساعدة', 'اوامر', 'أوامر', 'help', 'دليل'],

  /**
   * Unified executor for both Slash command (/help) and Prefix command (!مساعدة)
   * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
   */
  async execute(context) {
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎮 مرحباً بك في بوت جعفر — بوت ألعاب ديسكورد العربية')
      .setDescription(
        `بوت خفيف وسريع مخصص للمنافسة والفعاليات في سيرفرك!\n\n` +
        `**الأوامر والألعاب المتاحة:**\n\n` +
        `🔄 **\`/reverse\`** أو **\`!اعكس\`**\n` +
        `← لعبة عكس الكلمات: يعطيك البوت كلمة عربية والمطلوب كتابتها معكوسة بأسرع وقت (المؤقت: ${config.games.reverse.timerSeconds} ثانية).\n\n` +
        `🚩 **\`/flags\`** أو **\`!اعلام\`**\n` +
        `← لعبة الأعلام: يعطيك البوت صورة علم دولة والمطلوب تخمين اسم الدولة (المؤقت: ${config.games.flags.timerSeconds} ثانية).\n\n` +
        `🔤 **\`/harf\`** أو **\`!حرف\`** أو **\`حرف\`**\n` +
        `← لعبة حرف: يعطيك البوت حرفاً وتصنيفاً والمطلوب كتابة كلمة صحيحة تبدأ بالحرف وضمن التصنيف (المؤقت: ${config.games.harf.timerSeconds} ثانية).\n\n` +
        `🎯 **\`/guess\`** أو **\`!خمن\`** أو **\`خمن\`**\n` +
        `← لعبة خمن الرقم: البوت يختار رقماً سرياً بين 1 و 100، والمطلوب تخمينه بالاستعانة بتوجيهات (أكبر / أصغر) (المؤقت: ${config.games.guessNumber.timerSeconds} ثانية).\n\n` +
        `🔘 **\`/button\`** أو **\`!زر\`** أو **\`زر\`**\n` +
        `← لعبة زر: الضغط السريع على الزر الصحيح (المؤقت: ${config.games.button?.timerSeconds || 10} ثوانٍ).\n\n` +
        `⚡ **\`/اسرع\`** أو **\`!اسرع\`** أو **\`اسرع\`**\n` +
        `← لعبة أسرع: أسرع كتابة للنص المطلوب كما هو تماماً (المؤقت: ${config.games.fastest?.timerSeconds || 15} ثانية).\n\n` +
        `🔄 **\`/فكك\`** أو **\`!فكك\`** أو **\`فكك\`**\n` +
        `← لعبة فكك: تفكيك الكلمة العربية إلى حروف متباعدة ومفصولة بمسافات (المؤقت: ${config.games.disassemble?.timerSeconds || 15} ثانية).\n\n` +
        `✏️ **\`/صحح\`** أو **\`!صحح\`** أو **\`صحح\`**\n` +
        `← لعبة صحح: تصحيح الخطأ الإملائي الوحيد في الجملة العربية (المؤقت: ${config.games.correct?.timerSeconds || 15} ثانية).\n\n` +
        `❌⭕ **\`/xo\`** أو **\`!xo\`**\n` +
        `← لعبة XO (تيك تاك تو): مباراة تفاعلية بين لاعبين (X و O) بالأزرار.\n\n` +
        `🪑 **\`/كراسي\`** أو **\`!كراسي\`** أو **\`كراسي\`**\n` +
        `← لعبة الكراسي الموسيقية: تنافس جماعي بالأزرار والسرعة لاستبعاد اللاعب الأخير في كل جولة (4 إلى 12 لاعباً).\n\n` +
        `🎰 **\`/روليت\`** أو **\`!روليت\`** أو **\`روليت\`**\n` +
        `← لعبة روليت: لعبة حظ جماعية تفاعلية بعجلة حظ دوّارة بالأزرار (4 إلى 12 لاعباً).\n\n` +
        `📊 **\`/leaderboard\`** أو **\`!نقاط\`**\n` +
        `← عرض لوحة المتصدرين ونقاط اللاعبين في هذا السيرفر.\n\n` +
        `🎮 **\`/games\`** أو **\`!العاب\`**\n` +
        `← استعراض قائمة الألعاب المتاحة وأوامر تشغيلها.\n\n` +
        `🏓 **\`/ping\`** أو **\`!ping\`**\n` +
        `← فحص سرعة استجابة البوت وحالة الاتصال بالسيرفر.\n\n` +
        `*ملاحظة: يمكنك استخدام الأوامر المائلة (Slash Commands) أو كتابة البادئة \`!\` مع اسم الأمر العربي.*`
      )
      .setFooter({ text: `بوت جعفر • الإصدار ${config.bot.version}` })
      .setTimestamp();

    if (context.isCommand && context.isCommand()) {
      await context.reply({ embeds: [helpEmbed] });
    } else if (context.channel) {
      await context.channel.send({ embeds: [helpEmbed] });
    }
  },
};

export default helpCommand;
