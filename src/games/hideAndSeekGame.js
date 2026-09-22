import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import gameManager from './GameManager.js';
import db from '../database/index.js';
import logger from '../utils/logger.js';
import HIDE_AND_SEEK_LOCATIONS from './datasets/hideAndSeekLocations.js';

export class HideAndSeekGameSession {
  /**
   * @param {import('discord.js').TextChannel} channel 
   * @param {import('discord.js').User} creator 
   * @param {string} guildId 
   */
  constructor(channel, creator, guildId) {
    this.channel = channel;
    this.creator = creator;
    this.guildId = guildId;
    this.players = [creator]; // Array of User objects, initially owner
    this.seeker = null; // User object
    this.hiders = []; // Array of { user: User, location: null, found: false }
    this.phase = 'lobby'; // 'lobby' | 'hiding' | 'seeking' | 'ended'
    this.ended = false;
    this.attempts = 0;
    this.maxAttempts = 0;
    this.lobbyMessage = null;
    this.gameMessage = null;
    this.timers = [];
    this.collectors = [];
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
   * Removes a player from the lobby or active hiders
   * @param {string} userId 
   */
  removePlayer(userId) {
    this.players = this.players.filter(p => p.id !== userId);
    this.hiders = this.hiders.filter(h => h.user.id !== userId);

    if (this.seeker && this.seeker.id === userId) {
      this.ended = true;
      this.phase = 'ended';
      this.cleanup();
      this.channel.send('❌ **توقفت اللعبة!** الباحث خرج من اللعبة.').catch(() => {});
      return;
    }

    if (this.phase === 'lobby') {
      this.updateLobby();
    } else if (this.phase === 'hiding' || this.phase === 'seeking') {
      if (this.hiders.length === 0) {
        this.endGameSession('seeker', 'جميع المختبئين غادروا اللعبة!');
      }
    }
  }

  /**
   * Cleans up all active collectors, timers, and game locks
   */
  cleanup() {
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

    // Release GameManager lock
    gameManager.endGame(this.channel.id);
  }

  /**
   * Updates the lobby embed with the current list of joined players
   */
  async updateLobby() {
    if (this.ended || !this.lobbyMessage) return;

    const listText = this.players
      .map((p, idx) => `${idx + 1}. <@${p.id}> ${p.id === this.creator.id ? '(منشئ اللعبة 👑)' : ''}`)
      .join('\n');

    const lobbyEmbed = new EmbedBuilder()
      .setColor(0x2980B9)
      .setTitle('🙈 لعبة غميضة — Hide & Seek')
      .setDescription(
        `🏃 **"اهرب واختبئ قبل أن يمسك بك الباحث!"**\n\n` +
        `👥 **اللاعبون المنضمون (${this.players.length}/12):**\n` +
        `${listText}\n\n` +
        `💡 الحد الأدنى للبدء هو **4 لاعبين**.`
      )
      .setFooter({ text: 'لعبة غميضة جماعية • جعفر' })
      .setTimestamp();

    await this.lobbyMessage.edit({ embeds: [lobbyEmbed] }).catch(() => {});
  }

  /**
   * Verifies if players are still in the guild
   */
  async checkPlayersPresence() {
    const guild = this.channel.guild;
    if (!guild) return;

    const idsToCheck = [...this.players.map(p => p.id)];
    for (const id of idsToCheck) {
      try {
        const member = await guild.members.fetch(id).catch(() => null);
        if (!member) {
          this.removePlayer(id);
        }
      } catch {
        this.removePlayer(id);
      }
    }
  }

  /**
   * Starts the round: picks seeker, alerts players, and starts hiding phase
   */
  async startRound() {
    if (this.ended) return;
    this.phase = 'hiding';

    await this.checkPlayersPresence();
    if (this.ended) return;

    if (this.players.length < 4) {
      this.cleanup();
      await this.channel.send('❌ لا يمكن بدء اللعبة! قلّ عدد اللاعبين عن 4 بسبب مغادرة أحد اللاعبين.').catch(() => {});
      return;
    }

    // Pick random seeker
    const seekerIndex = Math.floor(Math.random() * this.players.length);
    this.seeker = this.players[seekerIndex];
    
    // Set up hiders list
    this.hiders = this.players
      .filter(p => p.id !== this.seeker.id)
      .map(p => ({ user: p, location: null, found: false }));

    // DM roles with fallback ephemeral in case DMs are locked
    for (const p of this.players) {
      try {
        if (p.id === this.seeker.id) {
          await p.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('🙈 دورك السري: الباحث!')
                .setDescription('لقد تم اختيارك لتكون الباحث! انتظر انتهاء وقت الاختباء (15 ثانية) ثم حاول إيجاد المختبئين قبل نفاد محاولاتك.')
                .setTimestamp()
            ]
          }).catch(() => {});
        } else {
          await p.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🫣 دورك السري: مختبئ!')
                .setDescription('بسرعة! اختر مكاناً للاختباء من الأزرار التي ستظهر في القناة، ولا تجعل الباحث يمسك بك!')
                .setTimestamp()
            ]
          }).catch(() => {});
        }
      } catch (err) {
        logger.warn(`Could not DM player ${p.id}`, err.message);
      }
    }

    // Announce Seeker Selection (but keep identity hidden as requested by prompt "تم اختيار الباحث ولكن لا تكشف الباحث لبقية اللاعبين")
    const announceEmbed = new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle('🙈 تم اختيار الباحث!')
      .setDescription(
        `تم اختيار الباحث سراً وإرسال التنبيهات في الخاص للجميع!\n\n` +
        `🫣 **وقت الاختباء بدأ (15 ثانية)!**\n` +
        `يرجى من جميع المختبئين اختيار مكانهم من الأزرار أدناه.`
      )
      .setFooter({ text: 'الغميضة • مرحلة الاختباء' })
      .setTimestamp();

    // Render location buttons
    const row1 = new ActionRowBuilder().addComponents(
      HIDE_AND_SEEK_LOCATIONS.slice(0, 3).map(loc =>
        new ButtonBuilder()
          .setCustomId(`hide_spot_${loc.id}`)
          .setLabel(`${loc.emoji} ${loc.name}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );
    const row2 = new ActionRowBuilder().addComponents(
      HIDE_AND_SEEK_LOCATIONS.slice(3, 6).map(loc =>
        new ButtonBuilder()
          .setCustomId(`hide_spot_${loc.id}`)
          .setLabel(`${loc.emoji} ${loc.name}`)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    this.gameMessage = await this.channel.send({
      embeds: [announceEmbed],
      components: [row1, row2]
    });

    const hidingCollector = this.gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000
    });

    this.collectors.push(hidingCollector);

    hidingCollector.on('collect', async (interaction) => {
      if (this.ended) return;
      const clicker = interaction.user;

      // Seeker guard
      if (clicker.id === this.seeker.id) {
        return interaction.reply({
          content: '❌ أنت الباحث! انتظر حتى ينتهي وقت الاختباء والبحث.',
          ephemeral: true
        }).catch(() => {});
      }

      // Member check
      const hider = this.hiders.find(h => h.user.id === clicker.id);
      if (!hider) {
        return interaction.reply({
          content: '❌ أنت لست جزءاً من هذه اللعبة كلاعب مختبئ.',
          ephemeral: true
        }).catch(() => {});
      }

      // Already chose check
      if (hider.location) {
        return interaction.reply({
          content: '❌ لقد اخترت مكانك بالفعل ولا يمكنك تغييره!',
          ephemeral: true
        }).catch(() => {});
      }

      // Record location
      const spotId = interaction.customId.replace('hide_spot_', '');
      const spotObj = HIDE_AND_SEEK_LOCATIONS.find(loc => loc.id === spotId);
      hider.location = spotObj;

      await interaction.reply({
        content: `✅ اختبأت بنجاح في **${spotObj.emoji} ${spotObj.name}**!`,
        ephemeral: true
      }).catch(() => {});

      // Fast-forward if all hiders have chosen
      const allSelected = this.hiders.every(h => h.location !== null);
      if (allSelected) {
        hidingCollector.stop('all_hidden');
      }
    });

    hidingCollector.on('end', async (_, reason) => {
      if (this.ended) return;

      // Assign random locations for hiders who did not choose
      this.hiders.forEach(hider => {
        if (!hider.location) {
          const randSpot = HIDE_AND_SEEK_LOCATIONS[Math.floor(Math.random() * HIDE_AND_SEEK_LOCATIONS.length)];
          hider.location = randSpot;
        }
      });

      // Disable location buttons
      const disabledRows = [row1, row2].map(row => {
        return new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
      });

      await this.gameMessage.edit({ components: disabledRows }).catch(() => {});

      // Launch seeking phase
      this.startSeekingPhase();
    });
  }

  /**
   * Sets up seeker remaining attempts and starts the 60 seconds countdown
   */
  async startSeekingPhase() {
    if (this.ended) return;
    this.phase = 'seeking';

    await this.checkPlayersPresence();
    if (this.ended) return;

    // Seeker attempts = Hiders + 2
    this.maxAttempts = this.hiders.length + 2;
    this.attempts = this.maxAttempts;

    // Send reveal message to public and alert seeker
    await this.channel.send(`🔎 **بدأ البحث!** لقد تم الإعلان عن الباحث وهو: <@${this.seeker.id}>`).catch(() => {});

    // Render seeker search dashboard
    const seekRow1 = new ActionRowBuilder().addComponents(
      HIDE_AND_SEEK_LOCATIONS.slice(0, 3).map(loc =>
        new ButtonBuilder()
          .setCustomId(`seek_spot_${loc.id}`)
          .setLabel(`${loc.emoji} ${loc.name}`)
          .setStyle(ButtonStyle.Primary)
      )
    );
    const seekRow2 = new ActionRowBuilder().addComponents(
      HIDE_AND_SEEK_LOCATIONS.slice(3, 6).map(loc =>
        new ButtonBuilder()
          .setCustomId(`seek_spot_${loc.id}`)
          .setLabel(`${loc.emoji} ${loc.name}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    const seekEmbed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('🔎 الباحث يبحث!')
      .setDescription(
        `الباحث الحالي: <@${this.seeker.id}>\n` +
        `المختبئون المتبقون: **${this.hiders.filter(h => !h.found).length}** لاعبين.\n` +
        `المحاولات المتبقية: **${this.attempts} / ${this.maxAttempts}**.\n\n` +
        `*لديك 60 ثانية للبحث في الأماكن المختلفة.*`
      )
      .setFooter({ text: 'الغميضة • مرحلة البحث' })
      .setTimestamp();

    const seekMsg = await this.channel.send({
      embeds: [seekEmbed],
      components: [seekRow1, seekRow2]
    });

    const seekCollector = seekMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 60 seconds timeout
    });

    this.collectors.push(seekCollector);

    seekCollector.on('collect', async (interaction) => {
      if (this.ended) return;
      const clicker = interaction.user;

      // Access restriction
      if (clicker.id !== this.seeker.id) {
        return interaction.reply({
          content: '❌ هذا الزر مخصص للباحث فقط.',
          ephemeral: true
        }).catch(() => {});
      }

      await interaction.deferUpdate().catch(() => {});

      const spotId = interaction.customId.replace('seek_spot_', '');
      const spotObj = HIDE_AND_SEEK_LOCATIONS.find(loc => loc.id === spotId);

      // Find hiders in this spot
      const foundHiders = this.hiders.filter(h => h.location.id === spotId && !h.found);

      if (foundHiders.length > 0) {
        // Mark as found
        foundHiders.forEach(h => h.found = true);

        const mentions = foundHiders.map(h => `<@${h.user.id}>`).join(', ');
        await this.channel.send(`🎯 **تم العثور على لاعب!** وجد الباحث ${mentions} في **${spotObj.emoji} ${spotObj.name}**!`).catch(() => {});
      } else {
        await this.channel.send(`❌ **ما لقيت أحد!** بحث الباحث في **${spotObj.emoji} ${spotObj.name}** ولم يجد أحداً هناك.`).catch(() => {});
      }

      this.attempts--;

      // Check win states
      const remainingHiders = this.hiders.filter(h => !h.found);

      if (remainingHiders.length === 0) {
        seekCollector.stop('seeker_won');
        this.endGameSession('seeker');
        return;
      }

      if (this.attempts <= 0) {
        seekCollector.stop('hiders_won');
        this.endGameSession('hiders');
        return;
      }

      // Update seek message embed
      const updatedSeekEmbed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle('🔎 الباحث يبحث!')
        .setDescription(
          `الباحث الحالي: <@${this.seeker.id}>\n` +
          `المختبئون المتبقون: **${remainingHiders.length}** لاعبين.\n` +
          `المحاولات المتبقية: **${this.attempts} / ${this.maxAttempts}**.\n\n` +
          `*لديك 60 ثانية للبحث في الأماكن المختلفة.*`
        )
        .setFooter({ text: 'الغميضة • مرحلة البحث' })
        .setTimestamp();

      await seekMsg.edit({ embeds: [updatedSeekEmbed] }).catch(() => {});
    });

    seekCollector.on('end', async (_, reason) => {
      if (this.ended) return;

      // Disable buttons
      const disabledSeekRows = [seekRow1, seekRow2].map(row => {
        return new ActionRowBuilder().addComponents(
          row.components.map(btn => ButtonBuilder.from(btn).setDisabled(true))
        );
      });
      await seekMsg.edit({ components: disabledSeekRows }).catch(() => {});

      // Handle time-out (no seeker/hiders winner recorded yet)
      if (reason === 'time') {
        const remainingHiders = this.hiders.filter(h => !h.found);
        if (remainingHiders.length > 0) {
          this.endGameSession('hiders', 'انتهى الوقت المسموح به للبحث!');
        } else {
          this.endGameSession('seeker', 'تم الإمساك بجميع اللاعبين!');
        }
      }
    });
  }

  /**
   * Concludes the game, updates points in db and displays final layout
   * @param {'seeker' | 'hiders'} winnerFaction 
   * @param {string} [reason] Optional ending reason
   */
  async endGameSession(winnerFaction, reason = '') {
    if (this.ended) return;
    this.ended = true;
    this.phase = 'ended';

    this.cleanup();

    const pointsToAward = 10;
    const awardedPlayers = [];

    // Award points
    if (winnerFaction === 'seeker') {
      try {
        db.addWin(this.guildId, this.seeker.id, this.seeker.displayName || this.seeker.username, 'hide_and_seek', pointsToAward);
        awardedPlayers.push(this.seeker);
      } catch (err) {
        logger.error(`Error saving score for seeker ${this.seeker.id}`, err);
      }
    } else {
      // Surviving hiders win points
      const survivors = this.hiders.filter(h => !h.found);
      survivors.forEach(h => {
        try {
          db.addWin(this.guildId, h.user.id, h.user.displayName || h.user.username, 'hide_and_seek', pointsToAward);
          awardedPlayers.push(h.user);
        } catch (err) {
          logger.error(`Error saving score for hider ${h.user.id}`, err);
        }
      });
    }

    // Embed formatting
    const foundPlayersList = this.hiders.filter(h => h.found).map(h => `• <@${h.user.id}> (${h.location?.emoji || ''} ${h.location?.name || ''})`);
    const survivorPlayersList = this.hiders.filter(h => !h.found).map(h => `• <@${h.user.id}> (${h.location?.emoji || ''} ${h.location?.name || ''})`);
    const awardedMentions = awardedPlayers.map(p => `<@${p.id}> (**+${pointsToAward}**)`).join(', ') || 'لا أحد';

    const finalEmbed = new EmbedBuilder()
      .setColor(winnerFaction === 'seeker' ? 0xE74C3C : 0x2ECC71)
      .setTitle('🙈 انتهت لعبة غميضة!')
      .setDescription(
        (reason ? `📝 **سبب النهاية:** ${reason}\n\n` : '') +
        `🏆 **الفائزون:** ${winnerFaction === 'seeker' ? 'الباحث 🕵️' : 'المختبئون الناجون 🫣'}\n\n` +
        `🔎 **الباحث:** <@${this.seeker.id}>\n\n` +
        `🎯 **الذين تم العثور عليهم (${foundPlayersList.length}):**\n${foundPlayersList.join('\n') || '• لا أحد'}\n\n` +
        `🫣 **الناجون (${survivorPlayersList.length}):**\n${survivorPlayersList.join('\n') || '• لا أحد'}\n\n` +
        `⭐ **النقاط المكتسبة:** ${awardedMentions}`
      )
      .setFooter({ text: 'بوت جعفر للألعاب • اكتب !نقاط لمشاهدة التحديث!' })
      .setTimestamp();

    await this.channel.send({ embeds: [finalEmbed] }).catch(() => {});
  }
}

/**
 * Unified executor for both prefix message and slash interactions
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 */
export async function runHideAndSeekGame(context) {
  const channel = context.channel;
  if (!channel) return;
  const channelId = channel.id;
  const guildId = context.guild?.id || 'dm';
  const author = context.author || context.user;

  // 1. Guard against simultaneous games in the same channel
  if (gameManager.isGameActive(channelId)) {
    const activeEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setDescription('⚠️ هناك لعبة جارية بالفعل في هذه الروم! انتظر حتى تنتهي.');
    
    if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
      return context.reply({ embeds: [activeEmbed], ephemeral: true }).catch(() => {});
    }
    return channel.send({ embeds: [activeEmbed] }).catch(() => {});
  }

  // Register session with gameManager
  const session = new HideAndSeekGameSession(channel, author, guildId);
  gameManager.startGame(channelId, 'hide_and_seek', session);

  try {
    const lobbyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('has_join_btn')
        .setLabel('انضمام 🟢')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('has_start_btn')
        .setLabel('بدء اللعبة ▶️')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('has_cancel_btn')
        .setLabel('إلغاء اللعبة 🔴')
        .setStyle(ButtonStyle.Danger)
    );

    const lobbyEmbed = new EmbedBuilder()
      .setColor(0x2980B9)
      .setTitle('🙈 لعبة غميضة — Hide & Seek')
      .setDescription(
        `🏃 **"اهرب واختبئ قبل أن يمسك بك الباحث!"**\n\n` +
        `👥 **اللاعبون المنضمون (1):**\n` +
        `1. <@${author.id}> (منشئ اللعبة 👑)\n\n` +
        `💡 الحد الأدنى للبدء هو **4 لاعبين**.`
      )
      .setFooter({ text: 'لعبة غميضة جماعية • جعفر' })
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

      if (interaction.customId === 'has_cancel_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '❌ أنت مو صاحب اللعبة.', ephemeral: true }).catch(() => {});
        }

        session.ended = true;
        session.phase = 'ended';
        lobbyCollector.stop('cancelled');
        await interaction.update({
          content: '❌ تم إلغاء غرفة لعبة غميضة.',
          embeds: [],
          components: []
        }).catch(() => {});
        session.cleanup();
        return;
      }

      if (interaction.customId === 'has_join_btn') {
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

      if (interaction.customId === 'has_start_btn') {
        if (clicker.id !== author.id) {
          return interaction.reply({ content: '❌ أنت مو صاحب اللعبة.', ephemeral: true }).catch(() => {});
        }

        if (session.players.length < 4) {
          return interaction.reply({
            content: '❌ تحتاج 4 لاعبين على الأقل لبدء لعبة الغميضة.',
            ephemeral: true
          }).catch(() => {});
        }

        // Transition phase immediately to prevent double starts
        session.phase = 'hiding';
        lobbyCollector.stop('started');
        await interaction.deferUpdate().catch(() => {});
        await session.startRound();
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
            content: '⏳ انتهى وقت انتظار انضمام اللاعبين للعبة الغميضة.',
            embeds: [],
            components: []
          }).catch(() => {});
        }
      }
    });

  } catch (err) {
    logger.error('Error starting Hide & Seek game:', err);
    session.cleanup();
    channel.send('⚠️ حدث خطأ أثناء تشغيل لعبة غميضة.').catch(() => {});
  }
}

export default runHideAndSeekGame;
