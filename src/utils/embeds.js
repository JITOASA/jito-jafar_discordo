/**
 * Unified Arabic Embed Builder for جعفر Bot
 */

import { EmbedBuilder } from 'discord.js';
import config from '../config/index.js';
import { getGamesByType } from '../games/registry.js';

export const embeds = {
  /**
   * Embed for لعبة اعكس (Reverse Game)
   */
  reverseGame: (wordObj, timerSeconds) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameReverse)
      .setTitle('🎮 لعبة اعكس — أسرع إجابة تفوز!')
      .setDescription(
        `المطلوب: قم بكتابة الكلمة التالية **بالعكس (حرفاً بحرف)** بأسرع ما يمكن!\n\n` +
        `🔤 الكلمة: **\`${wordObj.word}\`**\n` +
        `📂 التصنيف: **${wordObj.category || 'عام'}** • الصعوبة: **${wordObj.difficulty || 'متوسط'}**\n\n` +
        `⏱️ لديك **${timerSeconds}** ثانية للإجابة!\n` +
        `💡 اكتب إجابتك في الشات مباشرة.`
      )
      .setFooter({ text: `بوت جعفر • لعبة اعكس • اكتب الكلمة المعكوسة في الشات` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة أعلام (Flags Game)
   */
  /**
   * Embed for لعبة أعلام (Flags Game) - Real image, no emojis, no region, no country code
   */
  flagsGame: (countryObj, timerSeconds) => {
    const flagUrl = countryObj.flagImageUrl || `https://flagcdn.com/w640/${countryObj.code.toLowerCase()}.png`;
    return new EmbedBuilder()
      .setColor(config.colors.gameFlags)
      .setTitle('خمن العلم!')
      .setDescription(
        `⏱️ الوقت: **${timerSeconds} ثانية**\n` +
        `💡 اكتب اسم الدولة في الشات مباشرة!`
      )
      .setImage(flagUrl)
      .setFooter({ text: `بوت جعفر • لعبة خمن العلم` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة حرف (Letter & Category Game)
   */
  harfGame: (letter, categoryObj, timerSeconds) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameHarf || 0x2ECC71)
      .setTitle('🔤 **حرف**')
      .setDescription(
        `**الحرف:** ${letter}\n` +
        `**التصنيف:** ${categoryObj.name} ${categoryObj.emoji || ''}\n` +
        `⏱️ **الوقت:** ${timerSeconds} ثانية`
      )
      .setFooter({ text: `بوت جعفر • لعبة حرف • أسرع إجابة صحيحة تفوز!` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة خمن الرقم (Guess the Secret Number Game)
   */
  guessNumberGame: (timerSeconds = 60) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameGuessNumber || config.colors.primary)
      .setTitle('🎯 خمن الرقم')
      .setDescription(
        `حاول تخمين الرقم السري!\n` +
        `النطاق: **1 - 100**\n\n` +
        `⏱️ لديك **${timerSeconds}** ثانية.`
      )
      .setFooter({ text: 'بوت جعفر • خمن الرقم من 1 إلى 100' })
      .setTimestamp();
  },

  /**
   * Embed for لعبة أسرع (Fastest Typing Game)
   */
  fastestGame: (phrase, timerSeconds) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameFastest || 0xF39C12)
      .setTitle('⚡ لعبة أسرع — أسرع كتابة تفوز!')
      .setDescription(
        `المطلوب: قم بكتابة النص التالي **كما هو تماماً** بأسرع ما يمكن!\n\n` +
        `📝 النص المطلوب:\n` +
        `\`\`\`\n${phrase}\n\`\`\`\n` +
        `⏱️ لديك **${timerSeconds}** ثانية للإجابة!\n` +
        `💡 اكتب إجابتك في الشات مباشرة (أول إجابة مطابقة تفوز).`
      )
      .setFooter({ text: `بوت جعفر • لعبة أسرع • اكتب النص المطلوب في الشات` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة فكك (Disassemble Word Game)
   */
  disassembleGame: (word, timerSeconds) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameDisassemble || 0x16A085)
      .setTitle('🔄 لعبة فكك — أسرع إجابة تفوز!')
      .setDescription(
        `المطلوب: قم بتفكيك الكلمة التالية إلى **حروف مفصولة بمسافات**!\n\n` +
        `🔤 الكلمة المطلوب تفكيكها:\n` +
        `\`\`\`\n${word}\n\`\`\`\n` +
        `💡 مثال توضيحي: إذا كانت الكلمة \`مكتبة\` فالإجابة الصحيحة هي: \`م ك ت ب ة\`\n\n` +
        `⏱️ لديك **${timerSeconds}** ثانية للإجابة!\n` +
        `💡 اكتب الحروف مفصولة بمسافات في الشات مباشرة.`
      )
      .setFooter({ text: `بوت جعفر • لعبة فكك • تفكيك الحروف` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة صحح (Correct Spelling Game)
   */
  correctGame: (incorrectSentence, timerSeconds) => {
    return new EmbedBuilder()
      .setColor(config.colors.gameCorrect || 0xD35400)
      .setTitle('✏️ لعبة صحح — أسرع إجابة تفوز!')
      .setDescription(
        `المطلوب: قم بتصحيح الخطأ الإملائي في الجملة التالية وأعد كتابتها بالشكل الصحيح!\n\n` +
        `📝 الجملة الخاطئة:\n` +
        `\`\`\`\n${incorrectSentence}\n\`\`\`\n` +
        `⏱️ لديك **${timerSeconds}** ثانية للإجابة!\n` +
        `💡 اكتب الجملة الصحيحة كاملاً في الشات مباشرة.`
      )
      .setFooter({ text: `بوت جعفر • لعبة صحح • تصحيح الأخطاء الإملائية` })
      .setTimestamp();
  },

  /**
   * Embed for لعبة XO (Tic-Tac-Toe Lobby)
   */
  xoLobby: (hostUser, challengedUser = null) => {
    const embed = new EmbedBuilder()
      .setColor(config.colors.gameXO)
      .setTitle('🎮 تحدي لعبة XO (تيك تاك تو)!')
      .setDescription(
        challengedUser
          ? `⚔️ تحدى <@${hostUser.id}> اللاعب <@${challengedUser.id}> لمباراة XO!\n\n` +
            `❌ **اللاعب الأول (X):** <@${hostUser.id}>\n` +
            `⭕ **اللاعب الثاني (O):** <@${challengedUser.id}>\n\n` +
            `اضغط على الزر بالأسفل لبدء المباراة!`
          : `📢 فتح <@${hostUser.id}> غرفة مباراة XO ويبحث عن منافس!\n\n` +
            `❌ **اللاعب الأول (X):** <@${hostUser.id}>\n` +
            `⭕ **اللاعب الثاني (O):** في انتظار انضمام لاعب...\n\n` +
            `اضغط على زر **انضمام للمباراة 🎮** لتلعب ضده!`
      )
      .setFooter({ text: 'بوت جعفر • لعبة XO ثنائية اللاعبين' })
      .setTimestamp();
    return embed;
  },

  /**
   * Embed for active لعبة XO Board
   */
  xoBoard: (player1, player2, currentTurnUserId, boardState) => {
    const isPlayer1Turn = currentTurnUserId === player1.id;
    const turnEmoji = isPlayer1Turn ? '❌' : '⭕';
    const turnPlayerMention = `<@${currentTurnUserId}>`;

    return new EmbedBuilder()
      .setColor(config.colors.gameXO)
      .setTitle('🎮 مباراة XO (Tic-Tac-Toe)')
      .setDescription(
        `❌ **اللاعب 1 (X):** <@${player1.id}>\n` +
        `⭕ **اللاعب 2 (O):** <@${player2.id}>\n\n` +
        `⏳ **الدور الحالي:** ${turnEmoji} ${turnPlayerMention}\n` +
        `💡 اضغط على الزر المناسب في اللوحة بالأسفل لتضع حركتك.`
      )
      .setFooter({ text: 'بوت جعفر • اختر خانة غير مستخدمة في دورك' })
      .setTimestamp();
  },

  /**
   * Winner Celebration Embed
   */
  winner: (gameTitle, winnerUser, correctAnswer, pointsEarned, timeTakenSec) => {
    return new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle(`🏆 فائز رائع في ${gameTitle}!`)
      .setDescription(
        `🎉 كفو يا بطل <@${winnerUser.id}>!\n\n` +
        `✅ الإجابة الصحيحة: **\`${correctAnswer}\`**\n` +
        `⚡ سرعة الإجابة: **${timeTakenSec.toFixed(1)}** ثانية\n` +
        `⭐ النقاط المكتسبة: **+${pointsEarned}** نقطة\n\n` +
        `اكتب \`/leaderboard\` أو \`!نقاط\` لمشاهدة لوحة الشرف!`
      )
      .setThumbnail(winnerUser.displayAvatarURL ? winnerUser.displayAvatarURL({ dynamic: true }) : null)
      .setFooter({ text: `بوت جعفر للألعاب • مبروك الفوز!` })
      .setTimestamp();
  },

  /**
   * Timeout / No Winner Embed
   */
  timeout: (gameTitle, correctAnswer) => {
    return new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle(`⌛ انتهى الوقت في ${gameTitle}!`)
      .setDescription(
        `للأسف، انتهى الوقت ولم يتمكن أحد من الإجابة الصحيحة.\n\n` +
        `💡 الإجابة الصحيحة كانت: **\`${correctAnswer}\`**\n\n` +
        `جرّب حظك في الجولة القادمة!`
      )
      .setFooter({ text: `بوت جعفر للألعاب` })
      .setTimestamp();
  },

  /**
   * Server Leaderboard Embed
   */
  leaderboard: (guildName, topPlayers) => {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    
    let description = '';
    if (!topPlayers || topPlayers.length === 0) {
      description = 'لا توجد نقاط مسجلة في هذا السيرفر حتى الآن!\nابدأ بلعب `/reverse` أو `/flags` أو `/harf` أو `/xo` لتتصدر القائمة!';
    } else {
      description = topPlayers
        .map((p, idx) => {
          const medal = medals[idx] || `${idx + 1}.`;
          return `${medal} **${p.username}** — **${p.points}** نقطة \`(${p.totalWins} فوز: 🔄 ${p.games?.reverse || 0} | 🚩 ${p.games?.flags || 0} | 🔤 ${p.games?.harf || 0} | 🎮 ${p.games?.xo || 0})\``;
        })
        .join('\n\n');
    }

    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📊 لوحة الشرف ونقاط السيرفر — ${guildName}`)
      .setDescription(description)
      .setFooter({ text: `بوت جعفر • الترتيب يتحدث تلقائياً مع كل فوز` })
      .setTimestamp();
  },

  /**
   * Embed for قائمة الألعاب (Games List)
   * Displays all currently available games dynamically from central Registry.
   */
  gamesList: () => {
    const soloAvailable = getGamesByType('solo', 'available');
    const multiplayerAvailable = getGamesByType('multiplayer', 'available');

    const soloText = soloAvailable.length > 0
      ? soloAvailable.map(g => `* ${g.emoji} **${g.name}** — \`${g.command}\``).join('\n')
      : '_لا توجد ألعاب فردية متاحة حالياً_';

    const multiplayerText = multiplayerAvailable.length > 0
      ? multiplayerAvailable.map(g => `* ${g.emoji} **${g.name}** — \`${g.command}\``).join('\n')
      : '_لا توجد ألعاب جماعية متاحة حالياً_';

    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎮 ألعاب جعفر')
      .setDescription(
        `### 🎯 ألعاب فردية\n\n` +
        `${soloText}\n\n` +
        `### 🎮 ألعاب جماعية\n\n` +
        `${multiplayerText}`
      )
      .setFooter({ text: 'بوت جعفر • اكتب أمر اللعبة لبدء الجولة مباشرة!' })
      .setTimestamp();
  },

  /**
   * Ping / Status Embed
   */
  ping: (wsPing, botLatency, uptimeStr) => {
    return new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('🏓 بونق! بوت جعفر متصل وجاهز للعب')
      .addFields(
        { name: '⚡ استجابة البوت (Latency)', value: `\`${botLatency}ms\``, inline: true },
        { name: '🌐 سرعة اتصال ديسكورد (WebSocket)', value: `\`${wsPing}ms\``, inline: true },
        { name: '⏱️ مدة التشغيل (Uptime)', value: `\`${uptimeStr}\``, inline: false },
        { name: '🎮 الألعاب المتاحة حالياً', value: '• `/reverse` أو `!اعكس` — لعبة عكس الكلمات\n• `/flags` أو `!اعلام` — لعبة تخمين الأعلام\n• `/leaderboard` أو `!نقاط` — لوحة المتصدرين', inline: false }
      )
      .setFooter({ text: `جعفر • الإصدار ${config.bot.version}` })
      .setTimestamp();
  },

  /**
   * General Error Embed
   */
  error: (msg) => {
    return new EmbedBuilder()
      .setColor(config.colors.error)
      .setTitle('⚠️ تنبيه')
      .setDescription(msg)
      .setTimestamp();
  },
};

export default embeds;
