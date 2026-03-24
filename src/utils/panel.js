// =============================================
//   utils/panel.js  —  Painel de controlo da chefia
// =============================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const config = require("../config");
const store = require("./store");
const {
  buildSessionEmbed,
  buildSummaryEmbed,
  mergeIntoWeekly,
  buildWeeklyEmbed,
} = require("./session");

const DRUGS = config.DRUGS;
const MATERIALS = config.MATERIALS;

// ─────────────────────────────────────────────
//   CONSTRUIR O PAINEL
// ─────────────────────────────────────────────

function buildPanelEmbed(session) {
  const sessionInfo = session
    ? `✅ **Sessão ativa:** ${DRUGS[session.drug].emoji} ${DRUGS[session.drug].name}\n` +
      `Unidades: ${session.entries.reduce((s, e) => s + e.qty, 0)}`
    : "⏸️ **Sem sessão ativa**";

  return new EmbedBuilder()
    .setTitle("🎛️  Painel de Controlo — Chefia")
    .setColor(0x5865f2)
    .setDescription(
      `${sessionInfo}\n\n` +
        `**Sessões de droga:**\n` +
        `> 🟢 Iniciar sessão  |  ➕ Adicionar unidades  |  🔴 Fechar sessão\n\n` +
        `**Meta semanal:**\n` +
        `> 🎯 Definir Meta & Publicar Pens — publica tudo de uma vez\n\n` +
        `**Gestão semanal:**\n` +
        `> 🔄 Reset semanal completo`,
    )
    .setFooter({ text: "Painel atualizado automaticamente" })
    .setTimestamp();
}

function buildPanelRows(session) {
  const hasSession = !!session;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_session_start")
      .setLabel("Iniciar Sessão")
      .setEmoji("🟢")
      .setStyle(ButtonStyle.Success)
      .setDisabled(hasSession),
    new ButtonBuilder()
      .setCustomId("panel_session_add")
      .setLabel("Adicionar Unidades")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasSession),
    new ButtonBuilder()
      .setCustomId("panel_session_end")
      .setLabel("Fechar Sessão")
      .setEmoji("🔴")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasSession),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("panel_meta_set")
      .setLabel("Definir Meta & Publicar Pens")
      .setEmoji("🎯")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("panel_weekly_reset")
      .setLabel("Reset Semanal")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2];
}

// ─────────────────────────────────────────────
//   CRIAR / ATUALIZAR O PAINEL
// ─────────────────────────────────────────────

async function setupPanel(client) {
  const channel = await client.channels.fetch(process.env.PANEL_CHANNEL_ID);
  if (!channel) return console.error("[Panel] Canal não encontrado.");

  const session = store.getSession();
  const embed = buildPanelEmbed(session);
  const rows = buildPanelRows(session);
  const saved = store.getPanel();

  if (saved?.messageId) {
    try {
      const msg = await channel.messages.fetch(saved.messageId);
      await msg.edit({ embeds: [embed], components: rows });
      return;
    } catch {
      /* apagado, re-cria */
    }
  }

  const msg = await channel.send({ embeds: [embed], components: rows });
  store.savePanel({ messageId: msg.id });
}

async function refreshPanel(client) {
  await setupPanel(client);
}

// ─────────────────────────────────────────────
//   HANDLERS DOS BOTÕES
// ─────────────────────────────────────────────

async function handlePanelButton(interaction) {
  const id = interaction.customId;

  if (id === "panel_session_start") return handleSessionStart(interaction);
  if (id === "panel_session_add") return handleSessionAdd(interaction);
  if (id === "panel_session_end") return handleSessionEnd(interaction);
  if (id === "panel_meta_set") return handleMetaSet(interaction);
  if (id === "panel_weekly_reset") return handleWeeklyReset(interaction);
}

// ── Iniciar sessão → dropdown com drogas
async function handleSessionStart(interaction) {
  const drugOptions = Object.entries(DRUGS).map(([key, d]) => ({
    label: d.name,
    value: key,
    emoji: d.emoji,
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("panel_drug_select")
      .setPlaceholder("Escolhe a droga do spot...")
      .addOptions(drugOptions),
  );

  await interaction.reply({
    content: "🟢 Qual é a droga do spot hoje?",
    components: [row],
    ephemeral: true,
  });
}

// ── Adicionar unidades → dropdown civil/contratado
async function handleSessionAdd(interaction) {
  const session = store.getSession();
  if (!session)
    return interaction.reply({
      content: "❌ Nenhuma sessão ativa.",
      ephemeral: true,
    });

  const drug = DRUGS[session.drug];

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("panel_type_select")
      .setPlaceholder("Civil ou Contratado?")
      .addOptions([
        { label: "Civil", value: "civil", emoji: "👤" },
        { label: "Contratado", value: "contratado", emoji: "🤝" },
      ]),
  );

  await interaction.reply({
    content: `➕ **${drug.emoji} ${drug.name}** — Escolhe o tipo de vendedor:`,
    components: [row],
    ephemeral: true,
  });
}

// ── Fechar sessão
async function handleSessionEnd(interaction) {
  const session = store.getSession();
  if (!session)
    return interaction.reply({
      content: "❌ Nenhuma sessão ativa.",
      ephemeral: true,
    });

  await interaction.deferReply({ ephemeral: true });

  mergeIntoWeekly(session);
  store.clearSession();

  // Separador de dia se ainda não existe hoje
  const { postDaySeparator } = require("./session");
  const sep = store.getDaySeparator();
  const today = new Date().toDateString();
  if (sep.date !== today) {
    await postDaySeparator(interaction.client);
    store.saveDaySeparator({ date: today });
  }

  const ch = await interaction.client.channels.fetch(
    process.env.SESSION_CHANNEL_ID,
  );
  await ch.send({ embeds: [buildSummaryEmbed(session)] });

  await interaction.editReply("✅ Sessão fechada! Resumo publicado.");
  await refreshPanel(interaction.client);
}

// ── Definir meta → modal
async function handleMetaSet(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("panel_meta_modal")
    .setTitle("🎯 Definir Meta Semanal");

  const matEntries = Object.entries(MATERIALS);

  for (let i = 0; i < Math.min(matEntries.length, 5); i++) {
    const [key, mat] = matEntries[i];
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`meta_${key}`)
          .setLabel(`${mat.emoji} ${mat.name} (0 = ignorar)`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("0")
          .setRequired(false)
          .setMaxLength(4),
      ),
    );
  }

  await interaction.showModal(modal);
}

// ── Reset semanal
async function handleWeeklyReset(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const ch = await interaction.client.channels.fetch(
    process.env.SESSION_CHANNEL_ID,
  );
  await ch.send({ embeds: [buildWeeklyEmbed()] });
  store.clearWeekly();
  store.clearMeta();
  store.clearSession();

  // Reset pens inline (evita referência circular)
  store.savePens({
    remaining: config.PENS_TOTAL,
    claimed: [],
    contributions: {},
    messageId: null,
  });

  // Reset quadro de membros
  const guild = await interaction.client.guilds.fetch(process.env.GUILD_ID);
  const members = await guild.members.fetch();
  const tracked = members.filter(
    (m) => m.roles.cache.has(process.env.TRACKED_ROLE_ID) && !m.user.bot,
  );
  const statusData = { messageId: null, members: {} };
  for (const [id, member] of tracked) {
    statusData.members[id] = {
      userId: id,
      username: member.user.username,
      claimed: false,
      contrib: {},
    };
  }
  store.saveStatus(statusData);

  const { refreshStatusBoard } = require("./pens");
  await refreshStatusBoard(interaction.client);

  await interaction.editReply(
    "✅ Reset semanal completo! Relatório publicado, pens e quadro resetados.",
  );
  await refreshPanel(interaction.client);
}

// ─────────────────────────────────────────────
//   HANDLERS DOS SELECT MENUS
// ─────────────────────────────────────────────

// Dropdown da droga → inicia sessão
async function handleDrugSelect(interaction) {
  const drug = interaction.values[0];
  const def = DRUGS[drug];
  const session = {
    drug,
    startedBy: interaction.user.username,
    startedAt: new Date().toISOString(),
    messageId: null,
    channelId: process.env.SESSION_CHANNEL_ID,
    entries: [],
  };

  store.saveSession(session);

  const ch = await interaction.client.channels.fetch(
    process.env.SESSION_CHANNEL_ID,
  );
  const msg = await ch.send({ embeds: [buildSessionEmbed(session)] });

  session.messageId = msg.id;
  store.saveSession(session);

  await interaction.update({
    content: `✅ Sessão de ${def.emoji} **${def.name}** iniciada!`,
    components: [],
  });

  await refreshPanel(interaction.client);
}

// Dropdown civil/contratado → abre modal com quantidade
async function handleTypeSelect(interaction) {
  const type = interaction.values[0];
  const session = store.getSession();
  if (!session)
    return interaction.update({
      content: "❌ Nenhuma sessão ativa.",
      components: [],
    });

  const drug = DRUGS[session.drug];

  const modal = new ModalBuilder()
    .setCustomId(`panel_qty_modal_${type}`)
    .setTitle(
      `➕ ${drug.emoji} ${drug.name} — ${type === "civil" ? "👤 Civil" : "🤝 Contratado"}`,
    );

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("add_qty")
        .setLabel("Quantidade de unidades")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("50")
        .setRequired(true)
        .setMaxLength(6),
    ),
  );

  await interaction.showModal(modal);
}

// ─────────────────────────────────────────────
//   HANDLERS DOS MODAIS
// ─────────────────────────────────────────────

// Modal de quantidade → adiciona à sessão
async function handleAddModal(interaction) {
  const session = store.getSession();
  if (!session)
    return interaction.reply({
      content: "❌ Nenhuma sessão ativa.",
      ephemeral: true,
    });

  const type = interaction.customId.replace("panel_qty_modal_", "");
  const rawQty = interaction.fields.getTextInputValue("add_qty").trim();
  const qty = parseInt(rawQty, 10);

  if (isNaN(qty) || qty <= 0)
    return interaction.reply({
      content: "❌ Quantidade inválida.",
      ephemeral: true,
    });

  session.entries.push({ type, qty });
  store.saveSession(session);

  try {
    const ch = await interaction.client.channels.fetch(session.channelId);
    const msg = await ch.messages.fetch(session.messageId);
    await msg.edit({ embeds: [buildSessionEmbed(session)] });
  } catch (e) {
    console.error("[Panel] Erro ao atualizar sessão:", e.message);
  }

  const def = DRUGS[session.drug];
  const precoUnit = type === "civil" ? def.civil : def.contratado;
  const fmt = (n) => `$${Number(n).toLocaleString("pt-PT")}`;

  await interaction.reply({
    content:
      `✅ **${qty} unid.** de ${def.emoji} ${def.name} (${type === "civil" ? "👤 Civil" : "🤝 Contratado"}) adicionadas.\n` +
      `💸 Custo: **${fmt(qty * precoUnit)}**  •  📈 Lucro: **${fmt(qty * (def.venda - precoUnit))}**`,
    ephemeral: true,
  });
}

// Modal da meta → publica meta + pens numa só mensagem
async function handleMetaModal(interaction) {
  const items = [];

  for (const [key] of Object.entries(MATERIALS)) {
    try {
      const raw = interaction.fields.getTextInputValue(`meta_${key}`).trim();
      const qty = parseInt(raw, 10);
      if (!isNaN(qty) && qty > 0) items.push({ key, qty });
    } catch {
      /* campo não estava no modal */
    }
  }

  if (!items.length)
    return interaction.reply({
      content: "❌ Tens de definir pelo menos 1 material com quantidade > 0.",
      ephemeral: true,
    });

  store.saveMeta({
    items,
    setBy: interaction.user.username,
    setAt: new Date().toISOString(),
  });
  store.savePens({
    remaining: config.PENS_TOTAL,
    claimed: [],
    contributions: {},
    messageId: null,
  });

  const lines = items.map(
    ({ key, qty }) =>
      `${MATERIALS[key].emoji} **${MATERIALS[key].name}** — ${qty} unid.`,
  );

  const { buildPensEmbed } = require("./pens");

  const metaEmbed = new EmbedBuilder()
    .setTitle("🎯  Meta Semanal — Membros")
    .setColor(0x5865f2)
    .setDescription(
      `A chefia definiu a meta desta semana:\n\n` +
        lines.join("\n") +
        `\n\n> Em troca recebem **${config.PENS_PER_CLICK} ${config.PENS_CLAIM_EMOJI} pens** cada.`,
    )
    .setFooter({ text: `Definida por ${interaction.user.username}` })
    .setTimestamp();

  const claimRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pens_claim")
      .setLabel(
        `Entreguei os materiais — quero as ${config.PENS_PER_CLICK} pens`,
      )
      .setEmoji(config.PENS_CLAIM_EMOJI)
      .setStyle(ButtonStyle.Primary),
  );

  // ← META_CHANNEL_ID em vez de SESSION_CHANNEL_ID
  const ch = await interaction.client.channels.fetch(
    process.env.META_CHANNEL_ID,
  );
  const msg = await ch.send({
    embeds: [metaEmbed, buildPensEmbed(store.getPens())],
    components: [claimRow],
  });

  store.savePens({ ...store.getPens(), messageId: msg.id });
  await interaction.reply({
    content: "✅ Meta definida e pens publicadas!",
    ephemeral: true,
  });
}

module.exports = {
  setupPanel,
  refreshPanel,
  handlePanelButton,
  handleDrugSelect,
  handleTypeSelect,
  handleAddModal,
  handleMetaModal,
};
