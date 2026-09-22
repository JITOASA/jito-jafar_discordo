/**
 * لعبة XO (Tic-Tac-Toe) التفاعلية لديسكورد
 * تدعم لاعبين (X و O) بنظام أزرار Discord Components التفاعلية.
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import config from '../config/index.js';
import db from '../database/index.js';
import embeds from '../utils/embeds.js';
import gameManager from './GameManager.js';
import logger from '../utils/logger.js';

// Winning combinations for 3x3 board
const WINNING_COMBOS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Column 1
  [1, 4, 7], // Column 2
  [2, 5, 8], // Column 3
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

/**
 * Checks if there is a winner on the board
 * @param {Array<string|null>} board 
 * @returns {{ winner: 'X' | 'O', combo: number[] } | null}
 */
export function checkXOWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  return null;
}

/**
 * Checks if the board is completely filled
 * @param {Array<string|null>} board 
 * @returns {boolean}
 */
export function isXOBoardFull(board) {
  return board.every((cell) => cell !== null);
}

/**
 * Builds 3 ActionRows with 3 Button components for the 3x3 grid
 * @param {Array<string|null>} board 
 * @param {boolean} disabled 
 * @returns {ActionRowBuilder<ButtonBuilder>[]}
 */
export function buildBoardComponents(board, disabled = false) {
  const rows = [];
  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const cellValue = board[index];

      const btn = new ButtonBuilder().setCustomId(`xo_cell_${index}`);

      if (cellValue === 'X') {
        btn
          .setLabel('❌')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true);
      } else if (cellValue === 'O') {
        btn
          .setLabel('⭕')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);
      } else {
        btn
          .setLabel('➖')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled);
      }

      actionRow.addComponents(btn);
    }
    rows.push(actionRow);
  }
  return rows;
}

/**
 * Runs the XO game in a Discord channel
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').Message} context 
 * @param {import('discord.js').User|null} challengedUser 
 */
export async function runXOGame(context, challengedUser = null) {
  const channel = context.channel;
  const channelId = channel.id;
  const guildId = context.guild?.id || 'dm';
  const author = context.author || context.user;

  // Prevent multiple games in the same channel
  if (gameManager.isGameActive(channelId)) {
    const warnEmbed = embeds.error('⚠️ هناك لعبة جارية بالفعل في هذه الروم! انتظر حتى تنتهي.');
    if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
      return context.reply({ embeds: [warnEmbed], ephemeral: true }).catch(() => {});
    }
    return channel.send({ embeds: [warnEmbed] }).catch(() => {});
  }

  // Prevent playing against oneself or a bot
  if (challengedUser) {
    if (challengedUser.id === author.id) {
      const errEmbed = embeds.error('⚠️ لا يمكنك تحدي نفسك في لعبة XO! اطلب من صديق الانضمام.');
      if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
        return context.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
      }
      return channel.send({ embeds: [errEmbed] }).catch(() => {});
    }
    if (challengedUser.bot) {
      const errEmbed = embeds.error('⚠️ لا يمكنك اللعب ضد البوتات! اختر عضواً حقيقياً من السيرفر.');
      if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
        return context.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
      }
      return channel.send({ embeds: [errEmbed] }).catch(() => {});
    }
  }

  // Register game session
  gameManager.startGame(channelId, 'xo', { player1: author, player2: challengedUser });

  try {
    let player1 = author; // X - always starts first
    let player2 = challengedUser; // O

    let gameMessage = null;

    // Phase 1: Lobby / Opponent matching if not directly challenged
    if (!player2) {
      const lobbyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('xo_join_btn')
          .setLabel('انضمام للمباراة 🎮')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('xo_cancel_lobby_btn')
          .setLabel('إلغاء ❌')
          .setStyle(ButtonStyle.Secondary)
      );

      const lobbyEmbed = embeds.xoLobby(player1);

      if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
        gameMessage = await context.reply({ embeds: [lobbyEmbed], components: [lobbyRow], fetchReply: true });
      } else {
        gameMessage = await channel.send({ embeds: [lobbyEmbed], components: [lobbyRow] });
      }

      // Collect joining player
      const lobbyCollector = gameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      const joined = await new Promise((resolve) => {
        lobbyCollector.on('collect', async (interaction) => {
          if (interaction.customId === 'xo_cancel_lobby_btn') {
            if (interaction.user.id !== player1.id) {
              return interaction.reply({ content: '⚠️ صاحب التحدي فقط يمكنه إلغاء الغرفة.', ephemeral: true });
            }
            await interaction.update({
              content: '❌ تم إلغاء غرفة لعبة XO.',
              embeds: [],
              components: [],
            }).catch(() => {});
            lobbyCollector.stop('cancelled');
            resolve(null);
            return;
          }

          if (interaction.customId === 'xo_join_btn') {
            if (interaction.user.id === player1.id) {
              return interaction.reply({ content: '⚠️ أنت اللاعب الأول (X) بالفعل! في انتظار لاعب ثانٍ (O).', ephemeral: true });
            }
            if (interaction.user.bot) {
              return interaction.reply({ content: '⚠️ لا يمكن للبوتات الانضمام!', ephemeral: true });
            }

            player2 = interaction.user;
            await interaction.deferUpdate().catch(() => {});
            lobbyCollector.stop('joined');
            resolve(player2);
          }
        });

        lobbyCollector.on('end', (_collected, reason) => {
          if (reason !== 'joined' && reason !== 'cancelled') {
            resolve(null);
          }
        });
      });

      if (!joined) {
        gameManager.endGame(channelId);
        if (gameMessage && !gameMessage.deleted) {
          gameMessage.edit({
            content: '⌛ انتهى وقت انتظار انضمام لاعب لمباراة XO.',
            embeds: [],
            components: [],
          }).catch(() => {});
        }
        return;
      }
    }

    // Phase 2: Start 3x3 Match
    // Initial empty board (indices 0..8)
    const board = Array(9).fill(null);
    let currentTurnUserId = player1.id; // X starts first
    let isGameOver = false;

    const boardEmbed = embeds.xoBoard(player1, player2, currentTurnUserId, board);
    const boardComponents = buildBoardComponents(board, false);

    if (gameMessage) {
      await gameMessage.edit({
        content: null,
        embeds: [boardEmbed],
        components: boardComponents,
      }).catch(() => {});
    } else {
      if (context.reply && typeof context.reply === 'function' && context.isCommand?.()) {
        gameMessage = await context.reply({ embeds: [boardEmbed], components: boardComponents, fetchReply: true });
      } else {
        gameMessage = await channel.send({ embeds: [boardEmbed], components: boardComponents });
      }
    }

    // Set up Move Collector
    const moveCollector = gameMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: (config.games.xo?.moveTimeoutSeconds || 60) * 1000,
    });

    gameManager.setCollector(channelId, moveCollector);

    moveCollector.on('collect', async (interaction) => {
      if (isGameOver) return;

      const clickerId = interaction.user.id;

      // 1. Check if clicker is part of the game
      if (clickerId !== player1.id && clickerId !== player2.id) {
        return interaction.reply({
          content: '⚠️ أنت لست طرفاً في هذه المباراة! انتظر انتهاء الجولة.',
          ephemeral: true,
        }).catch(() => {});
      }

      // 2. Check if it is clicker's turn
      if (clickerId !== currentTurnUserId) {
        return interaction.reply({
          content: '⏳ ليس دورك الآن! انتظر حركة منافسك.',
          ephemeral: true,
        }).catch(() => {});
      }

      // 3. Extract cell index
      const match = interaction.customId.match(/^xo_cell_(\d)$/);
      if (!match) return;

      const cellIndex = parseInt(match[1], 10);
      if (board[cellIndex] !== null) {
        return interaction.reply({
          content: '⚠️ هذه الخانة مأخوذة بالفعل! اختر خانة فارغة.',
          ephemeral: true,
        }).catch(() => {});
      }

      // Apply move
      const currentSymbol = (currentTurnUserId === player1.id) ? 'X' : 'O';
      board[cellIndex] = currentSymbol;

      // Check Win Condition
      const winResult = checkXOWinner(board);
      if (winResult) {
        isGameOver = true;
        moveCollector.stop('winner');

        const winnerUser = (winResult.winner === 'X') ? player1 : player2;
        const winnerName = winnerUser.displayName || winnerUser.username;
        const points = config.games.xo?.pointsPerWin || 10;

        // Record win in database
        db.addWin(guildId, winnerUser.id, winnerName, 'xo', points);

        // Update board to disabled state
        const finalRows = buildBoardComponents(board, true);
        await interaction.update({
          embeds: [embeds.xoBoard(player1, player2, currentTurnUserId, board)],
          components: finalRows,
        }).catch(() => {});

        // Send exact requested win message: 🏆 **فاز باللعبة! 👑** @الفائز
        await channel.send(`🏆 **فاز باللعبة! 👑** <@${winnerUser.id}>`).catch(() => {});
        gameManager.endGame(channelId);
        return;
      }

      // Check Draw Condition
      if (isXOBoardFull(board)) {
        isGameOver = true;
        moveCollector.stop('draw');

        const finalRows = buildBoardComponents(board, true);
        await interaction.update({
          embeds: [embeds.xoBoard(player1, player2, currentTurnUserId, board)],
          components: finalRows,
        }).catch(() => {});

        // Send exact requested draw message: 🤝 **تعادل!**
        await channel.send('🤝 **تعادل!**').catch(() => {});
        gameManager.endGame(channelId);
        return;
      }

      // Switch turn to the other player
      currentTurnUserId = (currentTurnUserId === player1.id) ? player2.id : player1.id;
      moveCollector.resetTimer();

      // Update board with new turn
      const nextEmbed = embeds.xoBoard(player1, player2, currentTurnUserId, board);
      const nextRows = buildBoardComponents(board, false);

      await interaction.update({
        embeds: [nextEmbed],
        components: nextRows,
      }).catch(() => {});
    });

    moveCollector.on('end', async (_collected, reason) => {
      gameManager.endGame(channelId);

      if (!isGameOver && reason === 'time') {
        isGameOver = true;
        const disabledRows = buildBoardComponents(board, true);
        if (gameMessage && !gameMessage.deleted) {
          await gameMessage.edit({
            components: disabledRows,
          }).catch(() => {});
        }
        await channel.send(`⌛ **انتهت جولة XO لعدم التفاعل في الوقت المحدد!**`).catch(() => {});
      }
    });

  } catch (err) {
    logger.error('حدث خطأ أثناء تشغيل لعبة XO', err);
    gameManager.endGame(channelId);
    channel.send('⚠️ عذراً، حدث خطأ غير متوقع أثناء تشغيل لعبة XO. حاول مرة أخرى.').catch(() => {});
  }
}

export default runXOGame;
