/**
 * لعبة كراسي — Musical Chairs
 * Multiplayer party game for Discord with interactive buttons, random preparation countdown,
 * atomic chair locking, round-by-round elimination, and persistent leaderboard points.
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import gameManager from './GameManager.js';
import db from '../database/index.js';
import logger from '../utils/logger.js';

export class ChairsGameSession {
  /**
   * @param {import('discord.js').TextChannel} channel 
   * @param {import('discord.js').User} creator 
   * @param {string} guildId 
   */
  constructor(channel, creator, guildId) {
    this.channel = channel;
    this.creator = creator;
    this.guildId = guildId;
    this.players = [creator]; // Array of User objects in lobby
    this.activePlayers = []; // Players currently competing in rounds
    this.phase = 'lobby'; // 'lobby' | 'music' | 'sitting' | 'round_end' | 'ended'
    this.round = 0;
    this.chairsCount = 0;
    this.occupiedChairs = new Map(); // chairNumber -> User
    this.userChairMap = new Map(); // userId -> chairNumber
    this.ended = false;
    this.hasAwardedPoints = false;
    this.lobbyMessage = null;
    this.roundMessage = null;
    this.timers = [];
    this.collectors = [];
    this.sittingCollector = null;
  }

  /**
   * Adds a player to the lobby
   * @param {import('discord.js').User} user 
   * @returns {boolean} Success
   */
  addPlayer(user) {
    if (this.phase !== 'lobby' || this.ended) return false;
    if (this.players.some(p => p.id === user.id)) return false;
    if (this.players.length >= 12) return false;
    this.players.push(user);
    return true;
  }

  /**
   * Removes a player from the game session
   * @param {string} userId 
   */
  removePlayer(userId) {
    this.players = this.players.filter(p => p.id !== userId);

    if (this.phase === 'lobby') {
      this.updateLobby();
      return;
    }

    // If game is in progress
    const wasActive = this.activePlayers.some(p => p.id === userId);
    this.activePlayers = this.activePlayers.filter(p => p.id !== userId);

    // Free their chair if seated this round
    if (this.userChairMap.has(userId)) {
      const chairNum = this.userChairMap.get(userId);
      this.userChairMap.delete(userId);
      this.occupiedChairs.delete(chairNum);
    }

    if (wasActive && !this.ended) {
      if (this.activePlayers.length === 1) {
        this.channel.send(`⚠️ خرج أحد اللاعبين. تبقى لاعب واحد فقط!`).catch(() => {});
        this.declareWinner(this.activePlayers[0]);
      } else if (this.activePlayers.length === 0) {
        this.cleanup();
        this.channel.send('❌ انتهت اللعبة لعدم وجود لاعبين متبقين.').catch(() => {});
      }
    }
  }

  /**
   * Cleans up all resources, timers, collectors and releases GameManager lock
   */
  cleanup() {
    if (this.ended && this.phase === 'ended') return;
    this.ended = true;
    this.phase = 'ended';

    // Clear all timeouts
    this.timers.forEach(t => {
      try { clearTimeout(t); } catch {}
    });
    this.timers = [];

    // Stop all collectors
    this.collectors.forEach(c => {
      try { if (!c.ended) c.stop('game_ended'); } catch {}
    });
    this.collectors = [];
    this.sittingCollector = null;

    // Release GameManager channel lock
    gameManager.endGame(this.channel.id);
  }

  /**
   * Updates the lobby embed display
   */
  async updateLobby() {
    if (this.ended || !this.lobbyMessage) return;

    const listText = this.players
      .map((p, idx) => `${idx + 1}. <@${p.id}> ${p.id === this.creator.id ? '(صاحب اللعبة 👑)' : ''}`)
      .join('\n');

    const lobbyEmbed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('🪑 كراسي — Musical Chairs')
      .setDescription(
        `🎵 **"استعد... الموسيقى بتوقف بأي لحظة!"**\n\n` +
        `👥 **اللاعبون المنضمون (${this.players.length}/12):**\n` +
        `${listText}\n\n` +
        `💡 **الحد الأدنى:** 4 لاعبين | **الحد الأقصى:** 12 لاعباً.`
      )
      .setFooter({ text: 'لعبة الكراسي الموسيقية • جعفر' })
      .setTimestamp();

    await this.lobbyMessage.edit({ embeds: [lobbyEmbed] }).catch(() => {});
  }

  /**
   * Starts the first round of the game
   */
  async startGame() {
    if (this.ended) return;
    this.activePlayers = [...this.players];
    this.round = 0;
    await this.startRound();
  }

  /**
   * Begins a new round: sets up chairs, plays music countdown, then reveals chairs
   */
  async startRound() {
    if (this.ended) return;

    if (this.activePlayers.length <= 1) {
      if (this.activePlayers.length === 1) {
        this.declareWinner(this.activePlayers[0]);
      } else {
        this.cleanup();
      }
      return;
    }

    this.round += 1;
    this.phase = 'music';
    this.chairsCount = this.activePlayers.length - 1;
    this.occupiedChairs.clear();
    this.userChairMap.clear();

    const roundTitle = this.activePlayers.length === 2
      ? `🪑 **كراسي — الجولة الأخيرة الحاسمة!**`
      : `🪑 **كراسي — الجولة ${this.round}**`;

    const prepEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(roundTitle)
      .setDescription(
        `🎵 **الموسيقى شغالة...**\n\n` +
        `👥 **اللاعبون:** ${this.activePlayers.length}\n` +
        `🪑 **الكراسي:** ${this.chairsCount}\n\n` +
        `*خلي أصابعك جاهزة... الكراسي بتنزل فجأة!*`
      )
      .setFooter({ text: `الجولة ${this.round} • استعد للجلوس فور توقف الموسيقى!` })
      .setTimestamp();

    this.roundMessage = await this.channel.send({ embeds: [prepEmbed], components: [] });

    // Random duration between 3 and 7 seconds (3000ms - 7000ms)
    const musicDurationMs = Math.floor(Math.random() * 4000) + 3000;

    const timer = setTimeout(async () => {
      if (this.ended || this.phase !== 'music') return;
      await this.revealChairs();
    }, musicDurationMs);

    this.timers.push(timer);
  }

  /**
   * Reveals the chair buttons and begins the sitting race
   */
  async revealChairs() {
    if (this.ended) return;
    this.phase = 'sitting';

    const currentRound = this.round;
    const chairsCount = this.chairsCount;

    // Create chair buttons (max 5 buttons per row in Discord)
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (let i = 1; i <= chairsCount; i++) {
      const btn = new ButtonBuilder()
        .setCustomId(`chairs_seat_${currentRound}_${i}`)
        .setLabel(`🪑 ${i}`)
        .setStyle(ButtonStyle.Primary);

      currentRow.addComponents(btn);

      if (currentRow.components.length === 5 || i === chairsCount) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }

    const sitEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('🚨 اجلس الآن!')
      .setDescription(
        `🪑 **اجلس بسرعة!**\n\n` +
        `👥 **اللاعبون:** ${this.activePlayers.length}\n` +
        `🪑 **الكراسي المتاحة:** ${chairsCount}\n\n` +
        `⏱️ أمامكم **5 ثوانٍ** فقط لحجز كرسي!`
      )
      .setFooter({ text: 'اضغط على زر الكرسي فوراً قبل أن يحجزه غيرك!' })
      .setTimestamp();

    if (this.roundMessage) {
      await this.roundMessage.edit({ embeds: [sitEmbed], components: rows }).catch(() => {});
    } else {
      this.roundMessage = await this.channel.send({ embeds: [sitEmbed], components: rows }).catch(() => null);
    }

    if (!this.roundMessage) return;

    const collector = this.roundMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5000 // 5 seconds sitting window
    });

    this.collectors.push(collector);
    this.sittingCollector = collector;

    collector.on('collect', async (interaction) => {
      await this.handleSeatClick(interaction, currentRound);
    });

    collector.on('end', async (_, reason) => {
      if (this.ended || this.phase !== 'sitting') return;
      await this.endSittingPhase();
    });
  }

  /**
   * Handles chair button click with atomic check and strict validations
   * @param {import('discord.js').ButtonInteraction} interaction 
   * @param {number} roundNum 
   */
  async handleSeatClick(interaction, roundNum) {
    const clicker = interaction.user;

    // 1. Session Ended check
    if (this.ended) {
      return interaction.reply({ content: '❌ اللعبة انتهت.', ephemeral: true }).catch(() => {});
    }

    // 2. Round validity check
    if (this.phase !== 'sitting' || this.round !== roundNum) {
      return interaction.reply({ content: '❌ هذه الجولة انتهت.', ephemeral: true }).catch(() => {});
    }

    // 3. Active player check
    const isPlayerActive = this.activePlayers.some(p => p.id === clicker.id);
    if (!isPlayerActive) {
      return interaction.reply({
        content: '❌ أنت لست من اللاعبين المتنافسين في هذه الجولة.',
        ephemeral: true
      }).catch(() => {});
    }

    // 4. Already seated check (no chair swapping allowed)
    if (this.userChairMap.has(clicker.id)) {
      const mySeat = this.userChairMap.get(clicker.id);
      return interaction.reply({
        content: `❌ أنت جالس بالفعل على الكرسي رقم ${mySeat} ولا يمكنك تغيير كرسيك!`,
        ephemeral: true
      }).catch(() => {});
    }

    // Extract chair number from customId: chairs_seat_<round>_<chairNum>
    const parts = interaction.customId.split('_');
    const chairNum = parseInt(parts[3], 10);

    // 5. Atomic Lock Check:
    // Synchronously check and set to completely eliminate race conditions
    if (this.occupiedChairs.has(chairNum)) {
      return interaction.reply({
        content: '❌ هذا الكرسي انحجز قبلك!',
        ephemeral: true
      }).catch(() => {});
    }

    // Seat the player atomically
    this.occupiedChairs.set(chairNum, clicker);
    this.userChairMap.set(clicker.id, chairNum);

    await interaction.reply({
      content: `🪑 جلست! (كرسي رقم ${chairNum})`,
      ephemeral: true
    }).catch(() => {});

    // Check if all chairs are occupied: end phase early!
    if (this.occupiedChairs.size >= this.chairsCount) {
      if (this.sittingCollector && !this.sittingCollector.ended) {
        this.sittingCollector.stop('all_chairs_filled');
      }
    }
  }

  /**
   * Concludes the sitting phase, identifies non-sitters, eliminates one, and transitions
   */
  async endSittingPhase() {
    if (this.ended || this.phase !== 'sitting') return;
    this.phase = 'round_end';

    // Disable all chair buttons on the round message
    if (this.roundMessage && this.roundMessage.components.length > 0) {
      const disabledRows = this.roundMessage.components.map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(comp => {
          const btn = ButtonBuilder.from(comp).setDisabled(true);
          newRow.addComponents(btn);
        });
        return newRow;
      });
      await this.roundMessage.edit({ components: disabledRows }).catch(() => {});
    }

    // Identify seated players and non-seated players
    const seatedUsers = this.activePlayers.filter(p => this.userChairMap.has(p.id));
    const nonSeatedUsers = this.activePlayers.filter(p => !this.userChairMap.has(p.id));

    let eliminatedPlayer = null;

    if (nonSeatedUsers.length === 1) {
      eliminatedPlayer = nonSeatedUsers[0];
    } else if (nonSeatedUsers.length > 1) {
      // If multiple players didn't sit in time, pick 1 randomly from non-sitters to eliminate
      const randomIndex = Math.floor(Math.random() * nonSeatedUsers.length);
      eliminatedPlayer = nonSeatedUsers[randomIndex];
    } else {
      // Fallback: If somehow all sat (impossible if chairs = players - 1), eliminate random
      const randomIndex = Math.floor(Math.random() * this.activePlayers.length);
      eliminatedPlayer = this.activePlayers[randomIndex];
    }

    // Eliminate player from active list
    this.activePlayers = this.activePlayers.filter(p => p.id !== eliminatedPlayer.id);

    // List of seated players for embed
    const seatedListText = seatedUsers.length > 0
      ? seatedUsers.map(p => `<@${p.id}>`).join('، ')
      : '_لا أحد جلس في الوقت المحدد!_';

    const endRoundEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`⏱️ انتهت الجولة ${this.round}!`)
      .setDescription(
        `❌ **خرج من اللعبة:**\n<@${eliminatedPlayer.id}> ${nonSeatedUsers.length > 1 ? '(لم يجلس في الوقت المحدد)' : '(ما لحق كرسي)'}\n\n` +
        `🪑 **الجالسين:**\n${seatedListText}\n\n` +
        `👥 **المتبقون (${this.activePlayers.length}):**\n` +
        this.activePlayers.map(p => `• <@${p.id}>`).join('\n')
      )
      .setFooter({ text: 'كراسي • جولة الاستبعاد' })
      .setTimestamp();

    await this.channel.send({ embeds: [endRoundEmbed] });

    // Check win condition
    if (this.activePlayers.length === 1) {
      // Exactly one survivor: Winner!
      const timer = setTimeout(() => {
        this.declareWinner(this.activePlayers[0]);
      }, 1500);
      this.timers.push(timer);
    } else if (this.activePlayers.length > 1) {
      // Wait 2 seconds before launching the next round
      const timer = setTimeout(async () => {
        if (this.ended) return;
        await this.startRound();
      }, 2000);
      this.timers.push(timer);
    } else {
      this.cleanup();
    }
  }

  /**
   * Declares the winner, awards points idempotently, and cleans up
   * @param {import('discord.js').User} winner 
   */
  declareWinner(winner) {
    if (this.hasAwardedPoints) return;
    this.hasAwardedPoints = true;
    this.ended = true;
    this.phase = 'ended';

    // Award +10 points to winner in database
    const pointsAwarded = 10;
    try {
      db.addWin(this.guildId, winner.id, winner.displayName || winner.username, 'chairs', pointsAwarded);
    } catch (err) {
      logger.error('Failed to add win in chairsGame:', err);
    }

    const winEmbed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle('🏆 انتهت اللعبة!')
      .setDescription(
        `🎉 **ألف مبروك للفائز بالمركز الأول!**\n\n` +
        `👑 **الفائز:** <@${winner.id}>\n` +
        `⭐ **النقاط المكتسبة:** +${pointsAwarded} نقطة!\n\n` +
        `*أثبت سرعة ردة فعله وحسم آخر كرسي ببراعة!* 🪑✨`
      )
      .setFooter({ text: 'كراسي — Musical Chairs • مبروك للبطل!' })
      .setTimestamp();

    this.channel.send({ embeds: [winEmbed] }).catch(() => {});

    this.cleanup();
  }
}

/**
 * Main command entry point for starting a Musical Chairs game
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runChairsGame(context) {
  const channel = context.channel;
  const author = context.author || context.user;
  const guildId = context.guildId || context.guild?.id || 'simulated-guild';
  const channelId = channel.id;

  // 1. Channel level lock via GameManager
  if (gameManager.isGameActive(channelId)) {
    const errorMsg = '⚠️ توجد لعبة جارية بالفعل في هذه الروم! انتظر حتى تنتهي أولاً أو العب في روم أخرى.';
    if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
      return context.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
    }
    return channel.send(errorMsg).catch(() => {});
  }

  const session = new ChairsGameSession(channel, author, guildId);
  gameManager.startGame(channelId, 'chairs', { session, hostId: author.id });

  try {
    // 2. Build Lobby message with buttons
    const lobbyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('chairs_join_btn')
        .setLabel('🟢 انضمام')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('chairs_cancel_btn')
        .setLabel('🔴 إلغاء')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('chairs_start_btn')
        .setLabel('▶️ بدء')
        .setStyle(ButtonStyle.Primary)
    );

    const lobbyEmbed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('🪑 كراسي — Musical Chairs')
      .setDescription(
        `🎵 **"استعد... الموسيقى بتوقف بأي لحظة!"**\n\n` +
        `👥 **اللاعبون المنضمون (1/12):**\n` +
        `1. <@${author.id}> (صاحب اللعبة 👑)\n\n` +
        `💡 **الحد الأدنى:** 4 لاعبين | **الحد الأقصى:** 12 لاعباً.`
      )
      .setFooter({ text: 'لعبة الكراسي الموسيقية • جعفر' })
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
      time: 120000 // 2 minutes lobby timeout
    });

    session.collectors.push(lobbyCollector);
    gameManager.setCollector(channelId, lobbyCollector);

    lobbyCollector.on('collect', async (interaction) => {
      if (session.phase !== 'lobby') {
        return interaction.reply({
          content: '⚠️ اللعبة بدأت بالفعل أو غير متاحة حالياً.',
          ephemeral: true
        }).catch(() => {});
      }

      const clicker = interaction.user;

      // Cancel button
      if (interaction.customId === 'chairs_cancel_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '❌ أنت مو صاحب اللعبة.', ephemeral: true }).catch(() => {});
        }

        session.ended = true;
        session.phase = 'ended';
        lobbyCollector.stop('cancelled');
        await interaction.update({
          content: '❌ تم إلغاء غرفة لعبة كراسي.',
          embeds: [],
          components: []
        }).catch(() => {});
        session.cleanup();
        return;
      }

      // Join button
      if (interaction.customId === 'chairs_join_btn') {
        const joined = session.addPlayer(clicker);
        if (!joined) {
          return interaction.reply({
            content: session.players.some(p => p.id === clicker.id)
              ? '⚠️ أنت مسجل بالفعل في هذه اللعبة!'
              : '⚠️ اللعبة ممتلئة بالفعل! (الحد الأقصى 12 لاعب)',
            ephemeral: true
          }).catch(() => {});
        }

        await interaction.reply({ content: '✅ انضممت بنجاح!', ephemeral: true }).catch(() => {});
        await session.updateLobby();
        return;
      }

      // Start button
      if (interaction.customId === 'chairs_start_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '❌ أنت مو صاحب اللعبة.', ephemeral: true }).catch(() => {});
        }

        if (session.players.length < 4) {
          return interaction.reply({
            content: '❌ تحتاج 4 لاعبين على الأقل.',
            ephemeral: true
          }).catch(() => {});
        }

        // Transition phase immediately to prevent double starts
        session.phase = 'music';
        lobbyCollector.stop('started');
        await interaction.deferUpdate().catch(() => {});
        await session.startGame();
      }
    });

    lobbyCollector.on('end', (_, reason) => {
      if (reason === 'started') {
        if (lobbyMsg) {
          lobbyMsg.edit({ components: [] }).catch(() => {});
        }
      } else if (reason !== 'cancelled') {
        session.cleanup();
        if (lobbyMsg) {
          lobbyMsg.edit({
            content: '⏳ انتهى وقت انتظار انضمام اللاعبين للعبة كراسي.',
            embeds: [],
            components: []
          }).catch(() => {});
        }
      }
    });

  } catch (err) {
    logger.error('Error starting Musical Chairs game:', err);
    session.cleanup();
    channel.send('⚠️ حدث خطأ أثناء تشغيل لعبة كراسي.').catch(() => {});
  }
}

export default runChairsGame;
