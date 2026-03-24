// =============================================
//   commands/session.js  —  Sessões de droga + meta semanal
// =============================================
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config  = require('../config');
const store   = require('../utils/store');
const { buildSessionEmbed, buildSummaryEmbed, mergeIntoWeekly } = require('../utils/session');

const DRUGS     = config.DRUGS;
const MATERIALS = config.MATERIALS;
const fmt       = (n) => `$${Number(n).toLocaleString('pt-PT')}`;

// Choices para slash commands
const drugChoices     = Object.entries(DRUGS).map(([k, v])     => ({ name: `${v.emoji} ${v.name}`, value: k }));
const materialChoices = Object.entries(MATERIALS).map(([k, v]) => ({ name: `${v.emoji} ${v.name}`, value: k }));

module.exports = [

  // ── /session-start ───────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('session-start')
      .setDescription('Iniciar uma sessão de protect/droga')
      .addStringOption(o =>
        o.setName('droga').setDescription('Qual o spot?').setRequired(true).addChoices(...drugChoices)
      ),

    async execute(interaction) {
      if (store.getSession()) {
        return interaction.reply({
          content: '⚠️ Já há uma sessão ativa. Usa `/session-end` para a fechar primeiro.',
          ephemeral: true,
        });
      }

      const drug    = interaction.options.getString('droga');
      const def     = DRUGS[drug];
      const session = {
        drug,
        startedBy: interaction.user.username,
        startedAt: new Date().toISOString(),
        messageId: null,
        channelId: interaction.channelId,
        entries:   [],   // { type: 'civil'|'contratado', qty: N }
      };

      store.saveSession(session);
      const msg = await interaction.reply({ embeds: [buildSessionEmbed(session)], fetchReply: true });
      session.messageId = msg.id;
      session.channelId = msg.channelId;
      store.saveSession(session);
    },
  },

  // ── /session-add ────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('session-add')
      .setDescription('Adicionar unidades à sessão atual')
      .addStringOption(o =>
        o.setName('tipo')
          .setDescription('Civil ou Contratado?')
          .setRequired(true)
          .addChoices(
            { name: '👤 Civil',       value: 'civil' },
            { name: '🤝 Contratado', value: 'contratado' },
          )
      )
      .addIntegerOption(o =>
        o.setName('quantidade').setDescription('Quantas unidades?').setRequired(true).setMinValue(1)
      ),

    async execute(interaction) {
      const session = store.getSession();
      if (!session) {
        return interaction.reply({ content: '❌ Nenhuma sessão ativa. Usa `/session-start` primeiro.', ephemeral: true });
      }

      const type = interaction.options.getString('tipo');
      const qty  = interaction.options.getInteger('quantidade');
      const def  = DRUGS[session.drug];

      session.entries.push({ type, qty });
      store.saveSession(session);

      // Atualiza a mensagem da sessão
      try {
        const ch  = await interaction.client.channels.fetch(session.channelId);
        const msg = await ch.messages.fetch(session.messageId);
        await msg.edit({ embeds: [buildSessionEmbed(session)] });
      } catch (e) {
        console.error('[Session] Não foi possível atualizar a mensagem:', e.message);
      }

      const precoUnit = type === 'civil' ? def.civil : def.contratado;
      const custo     = qty * precoUnit;
      const lucro     = qty * (def.venda - precoUnit);

      await interaction.reply({
        content:
          `✅ Adicionado: **${qty} unid. de ${def.emoji} ${def.name}** (${type === 'civil' ? '👤 Civil' : '🤝 Contratado'})\n` +
          `💸 Custo: **${fmt(custo)}**  •  📈 Lucro esperado: **${fmt(lucro)}**`,
        ephemeral: true,
      });
    },
  },

  // ── /session-end ────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('session-end')
      .setDescription('Fechar a sessão atual e ver o resumo'),

    async execute(interaction) {
      const session = store.getSession();
      if (!session) {
        return interaction.reply({ content: '❌ Nenhuma sessão ativa.', ephemeral: true });
      }

      mergeIntoWeekly(session);
      store.clearSession();

      const ch = await interaction.client.channels.fetch(process.env.SESSION_CHANNEL_ID);
      await ch.send({ embeds: [buildSummaryEmbed(session)] });

      await interaction.reply({ content: '✅ Sessão fechada e resumo publicado!', ephemeral: true });
    },
  },

  // ── /session-status ─────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('session-status')
      .setDescription('Ver os totais da sessão atual'),

    async execute(interaction) {
      const session = store.getSession();
      if (!session) {
        return interaction.reply({ content: '❌ Nenhuma sessão ativa.', ephemeral: true });
      }
      await interaction.reply({ embeds: [buildSessionEmbed(session)], ephemeral: true });
    },
  },

  // ── /meta-set ───────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('meta-set')
      .setDescription('Definir a meta semanal dos membros (chefia)')
      .addStringOption(o =>
        o.setName('material1').setDescription('1º material').setRequired(true).addChoices(...materialChoices)
      )
      .addIntegerOption(o =>
        o.setName('quantidade1').setDescription('Quantidade do 1º material').setRequired(true).setMinValue(1)
      )
      .addStringOption(o =>
        o.setName('material2').setDescription('2º material (opcional)').setRequired(false).addChoices(...materialChoices)
      )
      .addIntegerOption(o =>
        o.setName('quantidade2').setDescription('Quantidade do 2º material').setRequired(false).setMinValue(1)
      )
      .addStringOption(o =>
        o.setName('material3').setDescription('3º material (opcional)').setRequired(false).addChoices(...materialChoices)
      )
      .addIntegerOption(o =>
        o.setName('quantidade3').setDescription('Quantidade do 3º material').setRequired(false).setMinValue(1)
      ),

    async execute(interaction) {
      const metaItems = [];

      for (let i = 1; i <= 3; i++) {
        const mat = interaction.options.getString(`material${i}`);
        const qty = interaction.options.getInteger(`quantidade${i}`);
        if (mat && qty) metaItems.push({ key: mat, qty });
      }

      if (!metaItems.length) {
        return interaction.reply({ content: '❌ Tens de definir pelo menos 1 material.', ephemeral: true });
      }

      // Guarda a meta desta semana
      store.saveMeta({ items: metaItems, setBy: interaction.user.username, setAt: new Date().toISOString() });

      // Publica a meta no canal de sessões
      const lines = metaItems.map(({ key, qty }) => {
        const m = MATERIALS[key];
        return `${m.emoji} **${m.name}** — ${qty} unidades`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🎯  Meta Semanal — Membros')
        .setColor(0x5865F2)
        .setDescription(
          `A chefia definiu a meta desta semana:\n\n` +
          lines.join('\n') +
          `\n\n> Em troca recebem **${config.PENS_PER_CLICK} ${config.PENS_CLAIM_EMOJI} pens** cada.`
        )
        .setFooter({ text: `Definida por ${interaction.user.username}` })
        .setTimestamp();

      const ch = await interaction.client.channels.fetch(process.env.SESSION_CHANNEL_ID);
      await ch.send({ embeds: [embed] });

      await interaction.reply({ content: '✅ Meta semanal publicada!', ephemeral: true });
    },
  },

  // ── /meta-ver ───────────────────────────────
  {
    data: new SlashCommandBuilder()
      .setName('meta-ver')
      .setDescription('Ver a meta semanal atual'),

    async execute(interaction) {
      const meta = store.getMeta();
      if (!meta) {
        return interaction.reply({ content: '❌ Nenhuma meta definida esta semana. Usa `/meta-set`.', ephemeral: true });
      }

      const lines = meta.items.map(({ key, qty }) => {
        const m = MATERIALS[key];
        return `${m.emoji} **${m.name}** — ${qty} unidades`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🎯  Meta Semanal Atual')
        .setColor(0x5865F2)
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Definida por ${meta.setBy}` })
        .setTimestamp(new Date(meta.setAt));

      await interaction.reply({ embeds: [embed], ephemeral: true });
    },
  },

];
