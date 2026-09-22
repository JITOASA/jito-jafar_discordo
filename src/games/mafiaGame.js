/**
 * لعبة مافيا (Mafia Game Module) لديسكورد والـ Simulator
 * تدعم الأدوار: مافيا 🔪، محقق 🕵️، مدني 👨‍🌾
 * نظام لعب جماعي متكامل يدير الفترات (الليل والنهار) والتصويت بأزرار تفاعلية.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import config from '../config/index.js';
import db from '../database/index.js';
import embeds from '../utils/embeds.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

/**
 * Mafia Game Session Class
 */
export class MafiaGameSession {
  constructor(channel, creator, guildId) {
    this.channel = channel;
    this.creator = creator;
    this.guildId = guildId || 'dm';
    this.players = []; // Array of { user, role: 'mafia'|'detective'|'doctor'|'civilian', isAlive: boolean }
    this.phase = 'lobby'; // 'lobby' | 'night' | 'day_announcement' | 'day_discussion' | 'day_vote' | 'ended'
    this.cycle = 1;
    
    this.mafiaVote = new Map(); // mafiaUserId -> targetUserId
    this.detectiveChoice = null; // targetUserId inspected by detective
    this.doctorChoice = null; // targetUserId protected by doctor
    this.votes = new Map(); // votingUserId -> votedUserId (null for skip)
    
    this.lobbyMessage = null;
    this.gameMessage = null;
    this.collector = null;
    this.ended = false;
  }

  /**
   * Generates role distribution based on player count
   */
  distributeRoles() {
    const count = this.players.length;
    let mafiaCount = 1;
    let detectiveCount = 0;
    let doctorCount = 0;

    if (count <= 5) {
      // 4-5 players: 1 mafia, rest civilians, exactly 1 special role (either detective or doctor)
      mafiaCount = 1;
      if (Math.random() > 0.5) {
        detectiveCount = 1;
      } else {
        doctorCount = 1;
      }
    } else if (count >= 6 && count <= 8) {
      // 6-8 players: 2 mafia, 1 detective, 1 doctor, rest civilians
      mafiaCount = 2;
      detectiveCount = 1;
      doctorCount = 1;
    } else if (count >= 9 && count <= 12) {
      // 9-12 players: 2-3 mafia, 1 detective, 1 doctor, rest civilians
      mafiaCount = count >= 11 ? 3 : 2;
      detectiveCount = 1;
      doctorCount = 1;
    } else {
      // 13-15 players: 3 mafia, 1 detective, 1 doctor, rest civilians
      mafiaCount = 3;
      detectiveCount = 1;
      doctorCount = 1;
    }

    // Shuffle players array
    const shuffled = [...this.players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assign roles
    for (let i = 0; i < shuffled.length; i++) {
      let role = 'civilian';
      if (i < mafiaCount) {
        role = 'mafia';
      } else if (i < mafiaCount + detectiveCount) {
        role = 'detective';
      } else if (i < mafiaCount + detectiveCount + doctorCount) {
        role = 'doctor';
      }
      
      const player = this.players.find(p => p.user.id === shuffled[i].user.id);
      if (player) {
        player.role = role;
      }
    }
  }

  /**
   * Helper to check win conditions
   * @returns {'mafia' | 'civilians' | null}
   */
  checkWinConditions() {
    const aliveMafia = this.players.filter(p => p.isAlive && p.role === 'mafia').length;
    const aliveOthers = this.players.filter(p => p.isAlive && p.role !== 'mafia').length;

    if (aliveMafia === 0) {
      return 'civilians';
    }
    if (aliveMafia >= aliveOthers) {
      return 'mafia';
    }
    return null;
  }

  /**
   * Send private roles to players
   */
  async notifyRoles() {
    const mafiaNames = this.players
      .filter(p => p.role === 'mafia')
      .map(p => `@${p.user.displayName || p.user.username}`)
      .join(', ');

    for (const player of this.players) {
      try {
        let roleName = '';
        let roleEmoji = '';
        let roleDesc = '';

        if (player.role === 'mafia') {
          roleName = 'مافيا';
          roleEmoji = '🔪';
          roleDesc = `هدفك التخلص من جميع المدنيين والمحققين بالاتفاق مع المافيا الآخرين في الليل.\nأعضاء المافيا الآخرين في هذه اللعبة: ${mafiaNames}`;
        } else if (player.role === 'detective') {
          roleName = 'محقق';
          roleEmoji = '🕵️';
          roleDesc = 'هدفك كشف المافيا! في كل ليلة يمكنك التحقيق في هوية لاعب واحد لتعرف إن كان مافيا أم بريء.';
        } else if (player.role === 'doctor') {
          roleName = 'طبيب';
          roleEmoji = '🩺';
          roleDesc = 'أنت الطبيب الصالح! هدفك حماية سكان المدينة. في كل ليلة يمكنك اختيار لاعب واحد لحمايته؛ وإذا هجمت عليه المافيا فلن يموت! (حمايتك تتم سراً بالكامل ولن يعرف أحد هويتك).';
        } else {
          roleName = 'مدني';
          roleEmoji = '👨‍🌾';
          roleDesc = 'هدفك اكتشاف المافيا والتصويت ضدهم ونفيهم في النهار لحماية المدينة!';
        }

        const roleEmbed = new EmbedBuilder()
          .setColor(player.role === 'mafia' ? 0xE74C3C : player.role === 'detective' ? 0x3498DB : player.role === 'doctor' ? 0xE84393 : 0x2ECC71)
          .setTitle(`${roleEmoji} دورك السري: ${roleName}`)
          .setDescription(roleDesc)
          .setFooter({ text: 'لعبة مافيا • ديسكورد' })
          .setTimestamp();

        await player.user.send({ embeds: [roleEmbed] }).catch(() => {
          // Fallback if DMs are closed
          this.channel.send(`⚠️ <@${player.user.id}> لم أتمكن من مراسلتك في الخاص! يرجى تفعيل استقبال الرسائل الخاصة لتلعب بشكل مريح.`).catch(() => {});
        });
      } catch (err) {
        logger.error(`Error sending DM to player ${player.user.id}`, err);
      }
    }
  }
}

/**
 * Main Runner for Mafia Game
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runMafiaGame(context) {
  const channel = context.channel;
  if (!channel) return;
  const channelId = channel.id;
  const guildId = context.guild?.id || 'dm';
  const author = context.author || context.user;

  // 1. Guard against simultaneous games in the same channel
  if (gameManager.isGameActive(channelId)) {
    const warnEmbed = embeds.error('⚠️ هناك لعبة جارية بالفعل في هذه الروم! انتظر حتى تنتهي.');
    if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
      return context.reply({ embeds: [warnEmbed], ephemeral: true }).catch(() => {});
    }
    return channel.send({ embeds: [warnEmbed] }).catch(() => {});
  }

  // Register game session
  const session = new MafiaGameSession(channel, author, guildId);
  gameManager.startGame(channelId, 'mafia', { creator: author });

  try {
    // Add creator initially
    session.players.push({ user: author, role: 'civilian', isAlive: true });

    // Build Lobby Row Components
    const lobbyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mafia_join_btn')
        .setLabel('انضمام 👥')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('mafia_start_btn')
        .setLabel('بدء اللعبة 🎮')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('mafia_cancel_btn')
        .setLabel('إلغاء ❌')
        .setStyle(ButtonStyle.Danger)
    );

    const lobbyEmbed = new EmbedBuilder()
      .setColor(0x2C3E50)
      .setTitle('🪓 لعبة مافيا — Mafia')
      .setDescription(
        `انضموا للعبة قبل أن تبدأ!\n\n` +
        `👥 **اللاعبون المنضمون (1):**\n` +
        `1. <@${author.id}> (منشئ اللعبة)\n\n` +
        `💡 الحد الأدنى للبدء هو **4 لاعبين**.`
      )
      .setFooter({ text: 'لعبة مافيا جماعية • جعفر' })
      .setTimestamp();

    let lobbyMsg = null;
    if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
      lobbyMsg = await context.reply({ embeds: [lobbyEmbed], components: [lobbyRow], fetchReply: true });
    } else {
      lobbyMsg = await channel.send({ embeds: [lobbyEmbed], components: [lobbyRow] });
    }
    session.lobbyMessage = lobbyMsg;

    const lobbyCollector = lobbyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, // 2 minutes lobby timeout
    });

    gameManager.setCollector(channelId, lobbyCollector);

    lobbyCollector.on('collect', async (interaction) => {
      if (session.phase !== 'lobby') {
        return interaction.reply({ content: '⚠️ اللعبة بدأت بالفعل أو غير متاحة حالياً.', ephemeral: true }).catch(() => {});
      }
      const clicker = interaction.user;

      if (interaction.customId === 'mafia_cancel_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '⚠️ منشئ اللعبة فقط يمكنه إلغاء الغرفة.', ephemeral: true });
        }
        session.phase = 'ended';
        session.ended = true;
        lobbyCollector.stop('cancelled');
        await interaction.update({
          content: '❌ تم إلغاء غرفة لعبة مافيا.',
          embeds: [],
          components: [],
        }).catch(() => {});
        gameManager.endGame(channelId);
        return;
      }

      if (interaction.customId === 'mafia_join_btn') {
        if (clicker.bot) {
          return interaction.reply({ content: '⚠️ لا يسمح للبوتات بالانضمام!', ephemeral: true });
        }
        
        const isJoined = session.players.some(p => p.user.id === clicker.id);
        if (isJoined) {
          return interaction.reply({ content: '⚠️ أنت منضم إلى اللعبة بالفعل!', ephemeral: true });
        }

        if (session.players.length >= 15) {
          return interaction.reply({ content: '⚠️ الغرفة ممتلئة بالكامل (الحد الأقصى 15 لاعباً)!', ephemeral: true });
        }

        session.players.push({ user: clicker, role: 'civilian', isAlive: true });
        
        // Update lobby embed
        const listText = session.players.map((p, idx) => `${idx + 1}. <@${p.user.id}>${p.user.id === author.id ? ' (منشئ اللعبة)' : ''}`).join('\n');
        const updatedEmbed = new EmbedBuilder()
          .setColor(0x2C3E50)
          .setTitle('🪓 لعبة مافيا — Mafia')
          .setDescription(
            `انضموا للعبة قبل أن تبدأ!\n\n` +
            `👥 **اللاعبون المنضمون (${session.players.length}):**\n` +
            `${listText}\n\n` +
            `💡 الحد الأدنى للبدء هو **4 لاعبين**.`
          )
          .setFooter({ text: 'لعبة مافيا جماعية • جعفر' })
          .setTimestamp();

        await interaction.update({ embeds: [updatedEmbed] }).catch(() => {});
        return;
      }

      if (interaction.customId === 'mafia_start_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '⚠️ منشئ اللعبة فقط هو من يستطيع بدء المباراة.', ephemeral: true });
        }

        if (session.players.length < 4) {
          return interaction.reply({ content: '⚠️ لا يمكن بدء اللعبة! تحتاج اللعبة إلى **4 لاعبين على الأقل**.', ephemeral: true });
        }

        // Transition phase immediately to prevent double-starts from duplicate clicks
        session.phase = 'night';

        lobbyCollector.stop('started');
        await interaction.deferUpdate().catch(() => {});
        
        // Distribute roles and notify
        session.distributeRoles();
        await session.notifyRoles();

        // Start core game loop
        await runCoreMafiaGameLoop(session);
      }
    });

    lobbyCollector.on('end', (_collected, reason) => {
      if (reason === 'started') {
        if (lobbyMsg) {
          lobbyMsg.edit({ components: [] }).catch(() => {});
        }
      } else if (reason !== 'cancelled') {
        gameManager.endGame(channelId);
        if (lobbyMsg) {
          lobbyMsg.edit({
            content: '⌛ انتهى وقت انتظار الانضمام للعبة مافيا.',
            embeds: [],
            components: [],
          }).catch(() => {});
        }
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة مافيا', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل لعبة مافيا.').catch(() => {});
  }
}

/**
 * Handles core day and night phases for the Mafia Game
 * @param {MafiaGameSession} session 
 */
async function runCoreMafiaGameLoop(session) {
  const channel = session.channel;
  const channelId = channel.id;

  // Game Start Embed in main channel
  const startAnnounce = new EmbedBuilder()
    .setColor(0x34495E)
    .setTitle('🎮 بدأت لعبة مافيا!')
    .setDescription(
      `تم إرسال الأدوار السرية لجميع اللاعبين في الرسائل الخاصة (DMs) 🤫\n\n` +
      `👥 **اللاعبون المشاركون (${session.players.length}):**\n` +
      session.players.map(p => `• <@${p.user.id}>`).join('\n') + `\n\n` +
      `🌃 سيهبط الليل على المدينة بعد قليل لتنفيذ الأدوار الخاصة...`
    )
    .setFooter({ text: 'لعبة مافيا • يرجى التحقق من الخاص' })
    .setTimestamp();

  await channel.send({ embeds: [startAnnounce] }).catch(() => {});

  let isGameOver = false;

  while (!isGameOver && !session.ended) {
    // ==========================================
    // 🌃 PHASE 1: NIGHT PHASE
    // ==========================================
    session.phase = 'night';
    if (session.ended) { isGameOver = true; break; }
    session.mafiaVote.clear();
    session.detectiveChoice = null;
    session.doctorChoice = null;

    const nightEmbed = new EmbedBuilder()
      .setColor(0x11141A)
      .setTitle(`🌃 الليل يهبط على المدينة (الجولة ${session.cycle})`)
      .setDescription(
        `خيم الصمت المطبق على أرجاء السيرفر... 🤫\n` +
        `نام المدنيون بسلام، بينما استيقظت المافيا لتنسيق عملية القتل، والمحقق للتحقيق، والطبيب لحماية الضحايا.\n\n` +
        `⏳ الوقت المحدد لليل: **30 ثانية**.`
      )
      .setFooter({ text: 'المافيا والمحقق والطبيب: يرجى تنفيذ أدواركم في الخاص الآن!' })
      .setTimestamp();

    await channel.send({ embeds: [nightEmbed] }).catch(() => {});

    // Send Night Interaction actions to Mafia, Detective, and Doctor in DMs
    const aliveMafias = session.players.filter(p => p.isAlive && p.role === 'mafia');
    const aliveDetective = session.players.find(p => p.isAlive && p.role === 'detective');
    const aliveDoctor = session.players.find(p => p.isAlive && p.role === 'doctor');
    const potentialTargets = session.players.filter(p => p.isAlive && p.role !== 'mafia'); // Candidates for mafia kill
    const potentialInspections = session.players.filter(p => p.isAlive); // Detective can inspect any living player
    const potentialDoctorTargets = session.players.filter(p => p.isAlive); // Doctor can protect any living player

    // Create selection buttons for Mafia in DMs
    const mafiaRows = [];
    if (potentialTargets.length > 0) {
      let currentRow = new ActionRowBuilder();
      potentialTargets.forEach((p, idx) => {
        if (idx > 0 && idx % 5 === 0) {
          mafiaRows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`mafia_kill_${p.user.id}`)
            .setLabel(`${p.user.displayName || p.user.username}`)
            .setStyle(ButtonStyle.Danger)
        );
      });
      mafiaRows.push(currentRow);
    }

    // Create selection buttons for Detective in DM
    const detRows = [];
    if (potentialInspections.length > 0) {
      let currentRow = new ActionRowBuilder();
      potentialInspections.forEach((p, idx) => {
        if (p.user.id === aliveDetective?.user.id) return; // Cannot inspect self
        if (idx > 0 && idx % 5 === 0) {
          detRows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`det_inspect_${p.user.id}`)
            .setLabel(`${p.user.displayName || p.user.username}`)
            .setStyle(ButtonStyle.Primary)
        );
      });
      if (currentRow.components.length > 0) {
        detRows.push(currentRow);
      }
    }

    // Create selection buttons for Doctor in DM
    const docRows = [];
    if (aliveDoctor && potentialDoctorTargets.length > 0) {
      let currentRow = new ActionRowBuilder();
      potentialDoctorTargets.forEach((p, idx) => {
        if (idx > 0 && idx % 5 === 0) {
          docRows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`doc_protect_${p.user.id}`)
            .setLabel(`${p.user.displayName || p.user.username}`)
            .setStyle(ButtonStyle.Success)
        );
      });
      if (currentRow.components.length > 0) {
        docRows.push(currentRow);
      }
    }

    // Send DM messages with buttons and set up DM collectors
    const dmCollectors = [];

    // Send to Mafias
    for (const mafia of aliveMafias) {
      try {
        const mMsg = await mafia.user.send({
          content: '🔪 **الليل ساتر العيوب... اختر من تود التخلص منه هذه الليلة مع فريقك:**',
          components: mafiaRows,
        });

        const mCol = mMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
        });

        mCol.on('collect', async (interaction) => {
          const targetId = interaction.customId.replace('mafia_kill_', '');
          session.mafiaVote.set(mafia.user.id, targetId);
          await interaction.update({
            content: `✅ تم تسجيل تصويتك للتخلص من <@${targetId}>! بانتظار البقية أو انتهاء الوقت.`,
            components: [],
          }).catch(() => {});
        });
        dmCollectors.push(mCol);
      } catch {
        // ignore if blocked DMs
      }
    }

    // Send to Detective
    if (aliveDetective) {
      try {
        const dMsg = await aliveDetective.user.send({
          content: '🕵️ **وقت التحقيق! اختر لاعباً واحداً للكشف عن هويته السرية:**',
          components: detRows,
        });

        const dCol = dMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
        });

        dCol.on('collect', async (interaction) => {
          const targetId = interaction.customId.replace('det_inspect_', '');
          session.detectiveChoice = targetId;

          const inspectedPlayer = session.players.find(p => p.user.id === targetId);
          const isMafia = inspectedPlayer?.role === 'mafia';
          
          await interaction.update({
            content: `🕵️ نتيجة التحقيق:\nاللاعب <@${targetId}> هو **[ ${isMafia ? 'مافيا 🔪' : 'بريء 👨‍🌾'} ]**!`,
            components: [],
          }).catch(() => {});
        });
        dmCollectors.push(dCol);
      } catch {
        // ignore if blocked DMs
      }
    }

    // Send to Doctor
    if (aliveDoctor) {
      try {
        const docMsg = await aliveDoctor.user.send({
          content: '🩺 **وقت الطبيب! اختر لاعباً واحداً لحمايته من المافيا الليلة:**',
          components: docRows,
        });

        const docCol = docMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
        });

        docCol.on('collect', async (interaction) => {
          const targetId = interaction.customId.replace('doc_protect_', '');
          session.doctorChoice = targetId;

          await interaction.update({
            content: `✅ تم تسجيل اختيارك لحماية اللاعب: <@${targetId}>! ستبقى هذه الحماية سرية لإنقاذ الأرواح.`,
            components: [],
          }).catch(() => {});
        });
        dmCollectors.push(docCol);
      } catch {
        // ignore if blocked DMs
      }
    }

    // Wait 30 seconds for Night Phase to end
    await new Promise(resolve => setTimeout(resolve, 30000));
    if (session.ended) {
      isGameOver = true;
      break;
    }

    // Force stop any active night collectors
    dmCollectors.forEach(col => { if (!col.ended) col.stop(); });
    if (session.ended) {
      isGameOver = true;
      break;
    }

    // Calculate Night outcome
    let killedPlayer = null;
    let isProtected = false;

    if (session.mafiaVote.size > 0) {
      // Find the target with the highest votes
      const voteCounts = {};
      let maxVotes = 0;
      let targetId = null;

      session.mafiaVote.forEach((tid) => {
        voteCounts[tid] = (voteCounts[tid] || 0) + 1;
        if (voteCounts[tid] > maxVotes) {
          maxVotes = voteCounts[tid];
          targetId = tid;
        }
      });

      if (targetId) {
        // Apply protection check
        if (session.doctorChoice && session.doctorChoice === targetId) {
          isProtected = true;
          // Target survives!
        } else {
          killedPlayer = session.players.find(p => p.user.id === targetId);
          if (killedPlayer) {
            killedPlayer.isAlive = false;
          }
        }
      }
    }

    // Check Win conditions after night deaths
    let winResult = session.checkWinConditions();
    if (winResult) {
      await announceWinners(session, winResult);
      isGameOver = true;
      break;
    }

    if (session.ended) {
      isGameOver = true;
      break;
    }

    // ==========================================
    // ☀️ PHASE 2: DAY TRANSITION
    // ==========================================
    session.phase = 'day_announcement';

    const dayText = killedPlayer
      ? `🚨 **أشرقت الشمس ☀️... واستيقظت المدينة على خبر مفجع!**\n\nلقد تسللت المافيا ليلاً واغتالت اللاعب: <@${killedPlayer.user.id}> 💀\n(كان دوره السري: **${killedPlayer.role === 'mafia' ? 'مافيا 🔪' : killedPlayer.role === 'detective' ? 'محقق 🕵️' : killedPlayer.role === 'doctor' ? 'طبيب 🩺' : 'مدني 👨‍🌾'}**)`
      : `🎉 **أشرقت الشمس ☀️... واستيقظت المدينة بسلام!**\n\nلم يمت أحد هذه الليلة، وعاشت المدينة يوماً هادئاً.`;

    const dayEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`☀️ أشرقت شمس النهار (الجولة ${session.cycle})`)
      .setDescription(
        `${dayText}\n\n` +
        `👥 **اللاعبون الأحياء الباقون (${session.players.filter(p => p.isAlive).length}):**\n` +
        session.players.map(p => `${p.isAlive ? '🟢' : '🔴 💀'} <@${p.user.id}>`).join('\n')
      )
      .setFooter({ text: 'ابدأوا النقاش والمحاورة لكشف المافيا!' })
      .setTimestamp();

    await channel.send({ embeds: [dayEmbed] }).catch(() => {});

    // Discussion time (45 seconds)
    session.phase = 'day_discussion';
    await channel.send('🗳️ **بدأت فترة النقاش والمحاورة (45 ثانية)!** تفضلوا بنقاش الأدلة والتهم قبل بدء التصويت.').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 45000));
    if (session.ended) {
      isGameOver = true;
      break;
    }

    // ==========================================
    // 🗳️ PHASE 3: DAY VOTING
    // ==========================================
    session.phase = 'day_vote';
    session.votes.clear();

    const livingPlayers = session.players.filter(p => p.isAlive);
    
    // Create voting buttons
    const voteRows = [];
    let currentVoteRow = new ActionRowBuilder();
    
    livingPlayers.forEach((p, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        voteRows.push(currentVoteRow);
        currentVoteRow = new ActionRowBuilder();
      }
      currentVoteRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_exec_${p.user.id}`)
          .setLabel(`نفي ${p.user.displayName || p.user.username}`)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    // Add Skip Button
    if (currentVoteRow.components.length >= 5) {
      voteRows.push(currentVoteRow);
      currentVoteRow = new ActionRowBuilder();
    }
    currentVoteRow.addComponents(
      new ButtonBuilder()
        .setCustomId('vote_exec_skip')
        .setLabel('تخطي التصويت 🏳️')
        .setStyle(ButtonStyle.Success)
    );
    voteRows.push(currentVoteRow);

    const voteEmbed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('🗳️ بدء مرحلة التصويت والمحاكمة!')
      .setDescription(
        `أدلي بصوتك الآن ضد اللاعب المشتبه به، أو اختر تخطي التصويت.\n\n` +
        `⏳ الوقت المتاح للتصويت: **30 ثانية**.`
      )
      .setFooter({ text: 'اضغط على الزر بالأسفل لتصويتك!' })
      .setTimestamp();

    const voteMsg = await channel.send({ embeds: [voteEmbed], components: voteRows }).catch(() => {});
    session.gameMessage = voteMsg;

    const voteCollector = voteMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
    });

    gameManager.setCollector(channelId, voteCollector);

    voteCollector.on('collect', async (interaction) => {
      const voterId = interaction.user.id;
      const voterObj = session.players.find(p => p.user.id === voterId);

      // Check if clicker is part of the game and alive
      if (!voterObj || !voterObj.isAlive) {
        return interaction.reply({ content: '⚠️ لا يمكنك التصويت لأنك لست طرفاً حياً في هذه المباراة!', ephemeral: true });
      }

      // Check if already voted
      if (session.votes.has(voterId)) {
        return interaction.reply({ content: '⚠️ لقد قمت بالإدلاء بصوتك بالفعل في هذه الجولة!', ephemeral: true });
      }

      const voteChoice = interaction.customId === 'vote_exec_skip' ? 'skip' : interaction.customId.replace('vote_exec_', '');
      session.votes.set(voterId, voteChoice);

      // Acknowledge vote
      const choiceName = voteChoice === 'skip' ? 'تخطي التصويت' : `<@${voteChoice}>`;
      await interaction.reply({ content: `✅ تم تسجيل صوتك بنجاح لـ: ${choiceName}!`, ephemeral: true }).catch(() => {});

      // If all living players have voted, end collector early
      if (session.votes.size === livingPlayers.length) {
        voteCollector.stop('all_voted');
      }
    });

    await new Promise(resolve => {
      voteCollector.on('end', () => resolve(true));
    });
    if (session.ended) {
      isGameOver = true;
      break;
    }

    // Disable buttons on voting message
    const disabledRows = voteRows.map(row => {
      const newRow = new ActionRowBuilder();
      row.components.forEach(btn => {
        newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true));
      });
      return newRow;
    });
    await voteMsg.edit({ components: disabledRows }).catch(() => {});

    // Tally votes
    const voteTallies = {};
    let skipsCount = 0;
    
    session.votes.forEach((targetId) => {
      if (targetId === 'skip') {
        skipsCount++;
      } else {
        voteTallies[targetId] = (voteTallies[targetId] || 0) + 1;
      }
    });

    // Find target with highest votes
    let executedId = null;
    let maxVotes = 0;
    let isTie = false;

    Object.keys(voteTallies).forEach((tid) => {
      if (voteTallies[tid] > maxVotes) {
        maxVotes = voteTallies[tid];
        executedId = tid;
        isTie = false;
      } else if (voteTallies[tid] === maxVotes) {
        isTie = true;
      }
    });

    let executionEmbed = null;

    if (skipsCount >= maxVotes || (isTie && skipsCount === 0 && maxVotes > 0)) {
      // Skips won, or a tie occurred
      executionEmbed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('🏳️ قرار المحكمة: لم يتم نفي أحد!')
        .setDescription(
          `قرر سكان المدينة تخطي المحاكمة وتأجيل النفي هذه الجولة نظراً لتعادل الأصوات أو اختيار التخطي.\n\n` +
          `🔊 الأصوات المسجلة للتخطي: **${skipsCount} أصوات**.\n` +
          `🌃 سيهبط الليل مجدداً على السيرفر...`
        )
        .setTimestamp();
    } else if (executedId) {
      const executedPlayer = session.players.find(p => p.user.id === executedId);
      if (executedPlayer) {
        executedPlayer.isAlive = false;

        executionEmbed = new EmbedBuilder()
          .setColor(executedPlayer.role === 'mafia' ? 0x27AE60 : 0xC0392B)
          .setTitle(`⚖️ حكم المحكمة: تم نفي اللاعب <@${executedId}>!`)
          .setDescription(
            `بأغلبية الأصوات (**${maxVotes} أصوات**)، قرر أهل البلدة إقصاء ونفي اللاعب: <@${executedId}>\n\n` +
            `🎭 دوره السري كان: **[ ${executedPlayer.role === 'mafia' ? 'مافيا 🔪 (إنجاز رائع!)' : executedPlayer.role === 'detective' ? 'محقق 🕵️' : executedPlayer.role === 'doctor' ? 'طبيب 🩺' : 'مدني 👨‍🌾'} ]**!`
          )
          .setTimestamp();
      }
    } else {
      // No votes cast
      executionEmbed = new EmbedBuilder()
        .setColor(0x95A5A6)
        .setTitle('🏳️ قرار المحكمة: لم يصوت أحد!')
        .setDescription('انتهى الوقت ولم يصوت أي أحد، المدينة هادئة والكل في سلام مؤقت.\n\n🌃 سيهبط الليل مجدداً...')
        .setTimestamp();
    }

    await channel.send({ embeds: [executionEmbed] }).catch(() => {});

    // Check Win Conditions after day execution
    winResult = session.checkWinConditions();
    if (winResult) {
      await announceWinners(session, winResult);
      isGameOver = true;
      break;
    }

    if (session.ended) {
      isGameOver = true;
      break;
    }

    session.cycle++;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // End and clean up game
  if (!session.ended) {
    session.ended = true;
    session.phase = 'ended';
    gameManager.endGame(channelId);
  }
}

/**
 * Announces and awards points to the winners
 * @param {MafiaGameSession} session 
 * @param {'mafia' | 'civilians'} winningFaction 
 */
async function announceWinners(session, winningFaction) {
  if (session.ended) return;
  session.ended = true;
  session.phase = 'ended';

  // Release GameManager lock immediately
  gameManager.endGame(session.channel.id);

  const channel = session.channel;
  const guildId = session.guildId;
  const points = 20; // 20 points per winning player for multiplayer games

  const winners = session.players.filter(p => {
    if (winningFaction === 'mafia') {
      return p.role === 'mafia';
    } else {
      return p.role !== 'mafia';
    }
  });

  // Record wins in database
  winners.forEach(p => {
    try {
      db.addWin(guildId, p.user.id, p.user.displayName || p.user.username, 'mafia', points);
    } catch (err) {
      logger.warn(`Error writing win to DB for user ${p.user.id}`, err);
    }
  });

  const winnersListText = winners.map(p => `• <@${p.user.id}> (${p.role === 'mafia' ? 'مافيا 🔪' : p.role === 'detective' ? 'محقق 🕵️' : p.role === 'doctor' ? 'طبيب 🩺' : 'مدني 👨‍🌾'})`).join('\n');

  const winEmbed = new EmbedBuilder()
    .setColor(winningFaction === 'mafia' ? 0xC0392B : 0x2ECC71)
    .setTitle(winningFaction === 'mafia' ? '🏆 فازت المافيا باللعبة! 🔪' : '🏆 فاز المدنيون والمحقق باللعبة! 👨‍🌾')
    .setDescription(
      `🎉 مبروك لجميع الفائزين في هذا الصراع التاريخي الشرس!\n\n` +
      `⭐ حصل كل لاعب فائز على **+${points} نقاط** في السيرفر!\n\n` +
      `👥 **قائمة الأبطال الفائزين:**\n` +
      `${winnersListText}\n\n` +
      `📜 **الأدوار الكاملة لجميع اللاعبين:**\n` +
      session.players.map(p => `• <@${p.user.id}> ← **${p.role === 'mafia' ? 'مافيا 🔪' : p.role === 'detective' ? 'محقق 🕵️' : p.role === 'doctor' ? 'طبيب 🩺' : 'مدني 👨‍🌾'}** (${p.isAlive ? 'حي ✅' : 'ميت 💀'})`).join('\n')
    )
    .setFooter({ text: 'بوت جعفر للألعاب • اكتب !نقاط لمشاهدة التحديث الجديد!' })
    .setTimestamp();

  await channel.send({ embeds: [winEmbed] }).catch(() => {});
}

export default runMafiaGame;
