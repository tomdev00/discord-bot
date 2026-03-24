// =============================================
//   commands/admin.js  —  Comandos de chefia
// =============================================
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { postDailySchedule, countScheduleVotes }                   = require('../utils/schedule');
const { postPensMessage, initStatusBoard }                         = require('../utils/pens');
const { buildWeeklyEmbed }                                         = require('../utils/session');
const store = require('../utils/store');

module.exports = [

  // ── /schedule-post ───────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('schedule-post')
      .setDescription('Publicar manualmente a marcação de hoje')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      await postDailySchedule(interaction.client);
      await interaction.editReply('✅ Marcação publicada!');
    },
  },

  // ── /schedule-votes ──────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('schedule-votes')
      .setDescription('Ver quantos votaram na marcação de hoje (bot excluído)')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const schedule = store.getSchedule();
      if (!schedule?.messageId)
        return interaction.editReply('❌ Nenhuma marcação encontrada. Usa `/schedule-post` primeiro.');
      const votes = await countScheduleVotes(interaction.client, schedule.messageId);
      await interaction.editReply(
        `**Votos de hoje (bot excluído):**\n✅ Disponível: **${votes.yes}**\n❌ Indisponível: **${votes.no}**\n🤖 Bot/Auto: **${votes.maybe}**`
      );
    },
  },

  // ── /pens-post ───────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('pens-post')
      .setDescription('Publicar a mensagem de pens da semana')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      await postPensMessage(interaction.client);
      await interaction.editReply('✅ Mensagem de pens publicada!');
    },
  },

  // ── /pens-reset ──────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('pens-reset')
      .setDescription('Resetar as pens e o quadro de membros (início de semana)')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      await postPensMessage(interaction.client);
      await initStatusBoard(interaction.client);
      store.clearMeta();
      await interaction.editReply('✅ Pens resetadas, quadro de membros atualizado e meta limpa!');
    },
  },

  // ── /status-init ─────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('status-init')
      .setDescription('(Re)construir o quadro de membros a partir do cargo')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      await initStatusBoard(interaction.client);
      await interaction.editReply('✅ Quadro de membros iniciado!');
    },
  },

  // ── /weekly-report ───────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('weekly-report')
      .setDescription('Publicar o relatório semanal agora e resetar os totais')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const ch = await interaction.client.channels.fetch(process.env.SESSION_CHANNEL_ID);
      await ch.send({ embeds: [buildWeeklyEmbed()] });
      store.clearWeekly();
      await interaction.editReply('✅ Relatório semanal publicado e totais resetados!');
    },
  },

];
