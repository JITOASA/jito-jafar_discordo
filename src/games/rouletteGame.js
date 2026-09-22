/**
 * لعبة روليت — Roulette Game
 * Multiplayer interactive luck game with an animated wheel selection, 
 * choices ("try on self" vs "try on player"), extra mandatory shots, and timeouts.
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import gameManager from './GameManager.js';
import db from '../database/index.js';
import logger from '../utils/logger.js';

export const TURN_DURATION = 15000; // 15 seconds per turn

export class RouletteGameSession {
  /**
   * @param {import('discord.js').TextChannel} channel 
   * @param {import('discord.js').User} creator 
   * @param {string} guildId 
   */
  constructor(channel, creator, guildId) {
    this.channel = channel;
    this.creator = creator;
    this.guildId = guildId;
    this.players = [creator]; // Players joined in the lobby
    this.activePlayers = []; // Players currently alive in the game
    this.phase = 'lobby'; // 'lobby' | 'spin' | 'turn' | 'extra_shot' | 'ended'
    this.round = 0;
    this.currentPlayer = null;
    this.processingTurn = false;
    this.wheelSpinning = false;
    this.extraShot = false;
    this.ended = false;
    this.hasAwardedPoints = false;

    this.lobbyMessage = null;
    this.roundMessage = null;
    this.timers = [];
    this.collectors = [];
    this.turnTimeoutTimer = null;
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
   * Removes a player from the game
   * @param {string} userId 
   */
  removePlayer(userId) {
    this.players = this.players.filter(p => p.id !== userId);

    if (this.phase === 'lobby') {
      this.updateLobby();
      return;
    }

    const wasActive = this.activePlayers.some(p => p.id === userId);
    this.activePlayers = this.activePlayers.filter(p => p.id !== userId);

    if (this.currentPlayer && this.currentPlayer.id === userId) {
      this.clearTurnTimeout();
      this.channel.send(`⚠️ غادر لاعب الدور الحالي <@${userId}> اللعبة.`).catch(() => {});
      if (!this.ended && this.activePlayers.length > 1) {
        this.timers.push(setTimeout(() => this.startNewRound(), 2000));
      }
    }

    if (wasActive && !this.ended) {
      if (this.activePlayers.length === 1) {
        this.channel.send(`⚠️ غادر أحد اللاعبين اللعبة.`).catch(() => {});
        this.declareWinner(this.activePlayers[0]);
      } else if (this.activePlayers.length === 0) {
        this.cleanup();
        this.channel.send('❌ انتهت اللعبة لعدم وجود لاعبين متبقين.').catch(() => {});
      }
    }
  }

  /**
   * Cleans up all resources, timeouts, and releases GameManager lock
   */
  cleanup() {
    if (this.ended && this.phase === 'ended') return;
    this.ended = true;
    this.phase = 'ended';

    this.clearTurnTimeout();

    // Clear all timeouts
    this.timers.forEach(t => {
      try { clearTimeout(t); } catch {}
    });
    this.timers = [];

    // Stop all collectors
    this.collectors.forEach(c => {
      try { c.stop(); } catch {}
    });
    this.collectors = [];

    // Release the channel lock
    gameManager.releaseChannel(this.channel.id);
  }

  /**
   * Starts the turn timeout timer
   */
  startTurnTimeout() {
    this.clearTurnTimeout();
    const currentRoundNum = this.round;
    const currentTurnPlayer = this.currentPlayer;

    this.turnTimeoutTimer = setTimeout(async () => {
      if (this.ended || this.phase === 'ended' || this.round !== currentRoundNum || !currentTurnPlayer) return;
      if (this.currentPlayer && this.currentPlayer.id === currentTurnPlayer.id) {
        this.channel.send(`⏰ انتهى الوقت! تم استبعاد <@${currentTurnPlayer.id}> لتأخره في اتخاذ قرار (15 ثانية).`).catch(() => {});
        
        // Remove him from active players
        this.activePlayers = this.activePlayers.filter(p => p.id !== currentTurnPlayer.id);

        if (this.activePlayers.length === 1) {
          await this.declareWinner(this.activePlayers[0]);
        } else if (this.activePlayers.length === 0) {
          this.cleanup();
          this.channel.send('❌ انتهت اللعبة لعدم وجود لاعبين أحياء.').catch(() => {});
        } else {
          this.startNewRound();
        }
      }
    }, TURN_DURATION);
  }

  /**
   * Clears the turn timeout timer
   */
  clearTurnTimeout() {
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer);
      this.turnTimeoutTimer = null;
    }
  }

  /**
   * Refreshes/updates the lobby message
   */
  async updateLobby() {
    if (this.ended || !this.lobbyMessage) return;

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🎰 لعبة روليت')
      .setDescription('انضم للعبة وانتظر حتى يبدأ صاحب اللعبة.\n\nتعتمد اللعبة على عجلة حظ تختار لاعب الدور ليقرر حظه أو حظ خصومه!')
      .addFields(
        { name: `المشاركون (${this.players.length}/12)`, value: this.players.length > 0 ? this.players.map(p => `👤 ${p.username}`).join('\n') : 'لا يوجد لاعبين بعد' }
      )
      .setFooter({ text: 'تحتاج اللعبة إلى 4 لاعبين على الأقل لبدء المنافسة.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('roulette_join_btn').setLabel('انضمام').setStyle(ButtonStyle.Success).setEmoji('🟢'),
      new ButtonBuilder().setCustomId('roulette_leave_btn').setLabel('مغادرة').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
      new ButtonBuilder().setCustomId('roulette_start_btn').setLabel('بدء اللعبة').setStyle(ButtonStyle.Primary).setEmoji('▶️')
    );

    await this.lobbyMessage.edit({ embeds: [embed], components: [row] }).catch(() => {});
  }

  /**
   * Starts the roulette game
   */
  async startGame() {
    this.activePlayers = [...this.players];
    this.round = 0;
    this.phase = 'spin';

    const startEmbed = new EmbedBuilder()
      .setColor('#2F3136')
      .setTitle('🎰 تبدأ لعبة روليت الآن!')
      .setDescription(`تم تثبيت قائمة المشاركين وعددهم **${this.activePlayers.length}** لاعبين!\n\nيتم الآن تحضير العجلة لأول دور...`);

    await this.channel.send({ embeds: [startEmbed] }).catch(() => {});

    // Delay before starting the first round
    this.timers.push(setTimeout(() => this.startNewRound(), 3000));
  }

  /**
   * Starts a new round/spin
   */
  async startNewRound() {
    if (this.ended || this.activePlayers.length <= 1) {
      if (this.activePlayers.length === 1) {
        this.declareWinner(this.activePlayers[0]);
      }
      return;
    }

    this.round++;
    this.phase = 'spin';
    this.extraShot = false;
    this.processingTurn = false;
    this.wheelSpinning = true;

    // Pick a random alive player
    const randomIndex = Math.floor(Math.random() * this.activePlayers.length);
    this.currentPlayer = this.activePlayers[randomIndex];

    // Build spin visualization
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle(`🎰 الجولة رقم ${this.round} — العجلة تدور...`)
      .setDescription(this.activePlayers.map((p, i) => {
        return `▫️ **[${p.username}]**`;
      }).join('\n') + '\n\n🌀 العجلة تدور وتتباطأ تدريجياً...');

    const msg = await this.channel.send({ embeds: [embed] }).catch(() => {});

    // Visual animation steps to simulate slowing down
    this.timers.push(setTimeout(async () => {
      if (this.ended) return;

      const finalEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎰 توقفت العجلة!')
        .setDescription(`🎯 **وقع الاختيار على صاحب الدور الحالي:** <@${this.currentPlayer.id}>\n\nلديه **15 ثانية** لاتخاذ القرار: هل يجرب على نفسه أم يجرب على لاعب آخر؟`);

      if (msg) {
        await msg.edit({ embeds: [finalEmbed] }).catch(() => {});
      }

      this.wheelSpinning = false;
      this.phase = 'turn';
      this.promptPlayerDecision();
    }, 3000));
  }

  /**
   * Prompts the current player to make a choice
   */
  async promptPlayerDecision() {
    if (this.ended || this.phase !== 'turn') return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`roulette_choice_self_${this.round}`)
        .setLabel('أجرب على نفسي')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴'),
      new ButtonBuilder()
        .setCustomId(`roulette_choice_player_${this.round}`)
        .setLabel('أجرب على لاعب')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔵')
    );

    const embed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle(`🎯 دورك يا <@${this.currentPlayer.username}>`)
      .setDescription(`اختر بحكمة:\n\n` +
        `🔴 **أجرب على نفسي:** فرصة 50% للنجاة. إذا نجوت، تحصل على **طلقة إضافية إجبارية** ضد خصم آخر!\n` +
        `🔵 **أجرب على لاعب:** تختار لاعباً آخر وتجرب عليه مباشرة دون فرصة طلقة إضافية.`);

    this.roundMessage = await this.channel.send({
      content: `<@${this.currentPlayer.id}>`,
      embeds: [embed],
      components: [row]
    }).catch(() => {});

    this.startTurnTimeout();

    const collector = this.channel.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('roulette_choice_'),
      time: 20000,
      componentType: ComponentType.Button
    });

    this.collectors.push(collector);

    collector.on('collect', async (interaction) => {
      if (this.ended) {
        return interaction.reply({ content: '❌ اللعبة انتهت بالفعل.', ephemeral: true }).catch(() => {});
      }

      if (interaction.user.id !== this.currentPlayer.id) {
        return interaction.reply({ content: '❌ مو دورك يا بطل.', ephemeral: true }).catch(() => {});
      }

      if (this.processingTurn) return;
      this.processingTurn = true;
      this.clearTurnTimeout();

      await interaction.deferUpdate().catch(() => {});
      collector.stop();

      const action = interaction.customId.includes('_self_') ? 'self' : 'player';
      if (action === 'self') {
        await this.handleTryOnSelf();
      } else {
        await this.handleTryOnPlayerPrompt();
      }
    });
  }

  /**
   * Option "أجرب على نفسي"
   */
  async handleTryOnSelf() {
    if (this.ended) return;

    this.channel.send(`🔴 اختار <@${this.currentPlayer.id}> أن يجرب على نفسه!`).catch(() => {});

    // Roll 50% survival chance
    const survived = Math.random() < 0.5;

    this.timers.push(setTimeout(async () => {
      if (this.ended) return;

      if (survived) {
        this.extraShot = true;
        this.phase = 'extra_shot';

        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🟢 نجوت!')
          .setDescription(`🔥 **لقد نجوت من الطلقة وحصلت على طلقة إضافية إجبارية!**\n\nيجب عليك الآن اختيار لاعب آخر ليجرب حظه.`);

        await this.channel.send({ embeds: [embed] }).catch(() => {});
        this.promptTargetSelection();
      } else {
        // Player is eliminated
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🔴 انطلقت الطلقة!')
          .setDescription(`💥 للاسف! خرج <@${this.currentPlayer.id}> من اللعبة.`);

        await this.channel.send({ embeds: [embed] }).catch(() => {});

        this.activePlayers = this.activePlayers.filter(p => p.id !== this.currentPlayer.id);

        if (this.activePlayers.length === 1) {
          await this.declareWinner(this.activePlayers[0]);
        } else {
          this.timers.push(setTimeout(() => this.startNewRound(), 3000));
        }
      }
    }, 2000));
  }

  /**
   * Presents target buttons for selection
   */
  async promptTargetSelection() {
    if (this.ended) return;

    // Get list of targets (excluding current player)
    const targets = this.activePlayers.filter(p => p.id !== this.currentPlayer.id);

    if (targets.length === 0) {
      // Should not happen, but just in case
      this.startNewRound();
      return;
    }

    const rows = [];
    let currentRow = new ActionRowBuilder();

    targets.forEach((p, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`roulette_target_${this.round}_${p.id}`)
          .setLabel(p.username)
          .setStyle(ButtonStyle.Danger)
      );
    });
    rows.push(currentRow);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🎯 اختر هدفاً للطلقة الإجبارية')
      .setDescription('يجب عليك اختيار لاعب آخر لتسليط الطلقة عليه الآن. لا يوجد زر تخطٍ!');

    this.roundMessage = await this.channel.send({
      content: `<@${this.currentPlayer.id}>`,
      embeds: [embed],
      components: rows
    }).catch(() => {});

    this.startTurnTimeout();

    const collector = this.channel.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith(`roulette_target_${this.round}_`),
      time: 20000,
      componentType: ComponentType.Button
    });

    this.collectors.push(collector);

    collector.on('collect', async (interaction) => {
      if (this.ended) {
        return interaction.reply({ content: '❌ اللعبة انتهت بالفعل.', ephemeral: true }).catch(() => {});
      }

      if (interaction.user.id !== this.currentPlayer.id) {
        return interaction.reply({ content: '❌ مو دورك لتختار الهدف.', ephemeral: true }).catch(() => {});
      }

      const targetId = interaction.customId.split('_')[3];

      // Security Check: prevent selecting oneself
      if (targetId === this.currentPlayer.id) {
        return interaction.reply({ content: '❌ لا يمكنك اختيار نفسك!', ephemeral: true }).catch(() => {});
      }

      const targetUser = this.activePlayers.find(p => p.id === targetId);
      if (!targetUser) {
        return interaction.reply({ content: '❌ اللاعب المستهدف غير موجود أو تم إقصاؤه.', ephemeral: true }).catch(() => {});
      }

      this.clearTurnTimeout();
      await interaction.deferUpdate().catch(() => {});
      collector.stop();

      await this.executeTargetShot(targetUser);
    });
  }

  /**
   * Option "أجرب على لاعب" (Prompts for target immediately)
   */
  async handleTryOnPlayerPrompt() {
    if (this.ended) return;

    const targets = this.activePlayers.filter(p => p.id !== this.currentPlayer.id);

    if (targets.length === 0) {
      this.startNewRound();
      return;
    }

    const rows = [];
    let currentRow = new ActionRowBuilder();

    targets.forEach((p, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`roulette_target_${this.round}_${p.id}`)
          .setLabel(p.username)
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(currentRow);

    const embed = new EmbedBuilder()
      .setColor('#1E90FF')
      .setTitle('🎯 اختر خصماً لتجربة حظك عليه')
      .setDescription('اختر لاعباً من الخيارات أدناه لتصويب الطلقة العشوائية عليه:');

    this.roundMessage = await this.channel.send({
      content: `<@${this.currentPlayer.id}>`,
      embeds: [embed],
      components: rows
    }).catch(() => {});

    this.startTurnTimeout();

    const collector = this.channel.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith(`roulette_target_${this.round}_`),
      time: 20000,
      componentType: ComponentType.Button
    });

    this.collectors.push(collector);

    collector.on('collect', async (interaction) => {
      if (this.ended) {
        return interaction.reply({ content: '❌ اللعبة انتهت بالفعل.', ephemeral: true }).catch(() => {});
      }

      if (interaction.user.id !== this.currentPlayer.id) {
        return interaction.reply({ content: '❌ مو دورك لتختار الخصم.', ephemeral: true }).catch(() => {});
      }

      const targetId = interaction.customId.split('_')[3];

      // Security Check: prevent selecting oneself
      if (targetId === this.currentPlayer.id) {
        return interaction.reply({ content: '❌ لا يمكنك اختيار نفسك!', ephemeral: true }).catch(() => {});
      }

      const targetUser = this.activePlayers.find(p => p.id === targetId);
      if (!targetUser) {
        return interaction.reply({ content: '❌ الخصم المستهدف غير موجود أو تم إقصاؤه.', ephemeral: true }).catch(() => {});
      }

      this.clearTurnTimeout();
      await interaction.deferUpdate().catch(() => {});
      collector.stop();

      await this.executeTargetShot(targetUser);
    });
  }

  /**
   * Executes a shot at a target player (50% chance of survival)
   * @param {import('discord.js').User} targetUser 
   */
  async executeTargetShot(targetUser) {
    if (this.ended) return;

    this.channel.send(`🎯 تم توجيه الطلقة نحو اللاعب <@${targetUser.id}>...`).catch(() => {});

    const targetSurvived = Math.random() < 0.5;

    this.timers.push(setTimeout(async () => {
      if (this.ended) return;

      if (targetSurvived) {
        const embed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🟢 نجا!')
          .setDescription(`👍 لقد نجا <@${targetUser.id}> من الطلقة بسلام!`);

        await this.channel.send({ embeds: [embed] }).catch(() => {});
      } else {
        const embed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🔴 أصابته الطلقة!')
          .setDescription(`💥 لقد تم إقصاء <@${targetUser.id}> من اللعبة.`);

        await this.channel.send({ embeds: [embed] }).catch(() => {});

        this.activePlayers = this.activePlayers.filter(p => p.id !== targetUser.id);
      }

      // Check for winner or transition to next round
      if (this.activePlayers.length === 1) {
        await this.declareWinner(this.activePlayers[0]);
      } else if (this.activePlayers.length === 0) {
        this.cleanup();
        this.channel.send('❌ انتهت اللعبة لعدم وجود لاعبين أحياء.').catch(() => {});
      } else {
        this.timers.push(setTimeout(() => this.startNewRound(), 3000));
      }
    }, 2000));
  }

  /**
   * Declares the final remaining player as the winner
   * @param {import('discord.js').User} winner 
   */
  async declareWinner(winner) {
    if (this.ended && this.phase === 'ended') return;
    this.phase = 'ended';
    this.ended = true;

    if (this.hasAwardedPoints) return;
    this.hasAwardedPoints = true;

    const winPoints = 10;
    try {
      db.addWin(this.guildId, winner.id, winner.username, 'roulette', winPoints);
    } catch (dbErr) {
      logger.error('Error saving roulette score in declareWinner:', dbErr);
    }

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏆 بطل الروليت!')
      .setDescription(`👑 **الفائز بالمركز الأول:** <@${winner.id}>\n\nحصل على **+${winPoints} نقاط** في لوحة الصدارة وزاد رصيد انتصاراته!\n\n🎰 **انتهت لعبة الروليت!**`);

    await this.channel.send({ embeds: [embed] }).catch(() => {});

    this.cleanup();
  }
}

/**
 * Global game runner called by command
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runRouletteGame(context) {
  const channel = context.channel;
  const author = context.user || context.author;
  const guildId = context.guildId || 'default-guild';

  if (!channel) return;

  // 1. Acquire global GameManager lock
  if (!gameManager.acquireChannel(channel.id, 'roulette')) {
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setDescription('❌ توجد لعبة نشطة حالياً في هذه الروم! الرجاء الانتظار حتى تنتهي.');
    return context.reply({ embeds: [embed] }).catch(() => {});
  }

  const session = new RouletteGameSession(channel, author, guildId);

  try {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🎰 لعبة روليت — ردهة الانتظار')
      .setDescription('انضم للعبة وانتظر حتى يبدأ صاحب اللعبة.\n\nتعتمد اللعبة على عجلة حظ تختار لاعب الدور ليقرر حظه أو حظ خصومه!')
      .addFields(
        { name: `المشاركون (1/12)`, value: `👤 ${author.username}` }
      )
      .setFooter({ text: 'تحتاج اللعبة إلى 4 لاعبين على الأقل لبدء المنافسة.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('roulette_join_btn').setLabel('انضمام').setStyle(ButtonStyle.Success).setEmoji('🟢'),
      new ButtonBuilder().setCustomId('roulette_leave_btn').setLabel('مغادرة').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
      new ButtonBuilder().setCustomId('roulette_start_btn').setLabel('بدء اللعبة').setStyle(ButtonStyle.Primary).setEmoji('▶️')
    );

    let lobbyMsg;
    if (context.reply && typeof context.reply === 'function' && !context.author) {
      // Slash Command
      lobbyMsg = await context.reply({ embeds: [embed], components: [row], fetchReply: true }).catch(() => {});
    } else {
      // Text Command
      lobbyMsg = await channel.send({ embeds: [embed], components: [row] }).catch(() => {});
    }

    if (!lobbyMsg) {
      gameManager.releaseChannel(channel.id);
      return;
    }

    session.lobbyMessage = lobbyMsg;

    const lobbyCollector = lobbyMsg.createMessageComponentCollector({
      filter: (i) => ['roulette_join_btn', 'roulette_leave_btn', 'roulette_start_btn'].includes(i.customId),
      time: 120000 // 2 minutes lobby time
    });

    session.collectors.push(lobbyCollector);

    lobbyCollector.on('collect', async (interaction) => {
      const clicker = interaction.user;

      // Join button
      if (interaction.customId === 'roulette_join_btn') {
        const added = session.addPlayer(clicker);
        if (!added) {
          if (session.players.some(p => p.id === clicker.id)) {
            return interaction.reply({ content: '❌ أنت منضم بالفعل للعبة.', ephemeral: true }).catch(() => {});
          }
          if (session.players.length >= 12) {
            return interaction.reply({ content: '❌ الردهة ممتلئة بالكامل (الحد الأقصى 12 لاعباً).', ephemeral: true }).catch(() => {});
          }
          return interaction.reply({ content: '❌ لا يمكنك الانضمام الآن.', ephemeral: true }).catch(() => {});
        }
        await interaction.deferUpdate().catch(() => {});
        await session.updateLobby();
        return;
      }

      // Leave button
      if (interaction.customId === 'roulette_leave_btn') {
        if (!session.players.some(p => p.id === clicker.id)) {
          return interaction.reply({ content: '❌ أنت لست مسجلاً بالردهة أساساً.', ephemeral: true }).catch(() => {});
        }
        session.removePlayer(clicker.id);
        await interaction.deferUpdate().catch(() => {});
        await session.updateLobby();
        return;
      }

      // Start button
      if (interaction.customId === 'roulette_start_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '❌ أنت مو صاحب اللعبة.', ephemeral: true }).catch(() => {});
        }

        if (session.players.length < 4) {
          return interaction.reply({
            content: '❌ تحتاج 4 لاعبين على الأقل للبدء.',
            ephemeral: true
          }).catch(() => {});
        }

        // Transition phase immediately to lock out new joins
        session.phase = 'spin';
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
      } else {
        session.cleanup();
        if (lobbyMsg) {
          lobbyMsg.edit({
            content: '⏳ انتهى وقت انتظار انضمام اللاعبين للعبة الروليت.',
            embeds: [],
            components: []
          }).catch(() => {});
        }
      }
    });

  } catch (err) {
    logger.error('Error starting Roulette game:', err);
    session.cleanup();
    channel.send('⚠️ حدث خطأ أثناء تشغيل لعبة الروليت.').catch(() => {});
  }
}

export default runRouletteGame;
