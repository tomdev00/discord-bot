// =============================================
//   utils/pens.js  —  Pens semanais + meta
// =============================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const config = require("../config");
const store = require("./store");

const MATERIALS = config.MATERIALS;

// ─────────────────────────────────────────────
//   POST
// ─────────────────────────────────────────────

async function postPensMessage(client) {
  const channel = await client.channels.fetch(process.env.META_CHANNEL_ID);
  if (!channel) return console.error("[Pens] Canal não encontrado.");

  store.savePens({
    remaining: config.PENS_TOTAL,
    claimed: [],
    contributions: {},
    messageId: null,
  });

  const meta = store.getMeta();
  const metaText = meta
    ? meta.items
        .map(
          ({ key, qty }) =>
            `${MATERIALS[key].emoji} **${MATERIALS[key].name}** — ${qty} unid.`,
        )
        .join("\n")
    : "_Nenhuma meta definida ainda._";

  const embed = buildPensEmbed(store.getPens());

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pens_claim")
      .setLabel(
        `Entreguei os materiais — quero as ${config.PENS_PER_CLICK} pens`,
      )
      .setEmoji(config.PENS_CLAIM_EMOJI)
      .setStyle(ButtonStyle.Primary),
  );

  const msg = await channel.send({
    content: `## 🎯 Meta desta semana\n${metaText}`,
    embeds: [embed],
    components: [row],
  });

  store.savePens({ ...store.getPens(), messageId: msg.id });
  console.log(`[Pens] Mensagem de pens publicada: ${msg.id}`);
}

// ─────────────────────────────────────────────
//   EMBEDS
// ─────────────────────────────────────────────

function buildPensEmbed(pens) {
  const { remaining, claimed = [], contributions = {} } = pens;
  const used = config.PENS_TOTAL - remaining;
  const bar = buildBar(remaining, config.PENS_TOTAL);

  const claimedLines = claimed.map((c) => {
    const note = c.note ? `  —  📝 ${c.note}` : "";
    return `• <@${c.userId}>${note}`;
  });

  return new EmbedBuilder()
    .setTitle(`${config.PENS_CLAIM_EMOJI}  Pens Semanais`)
    .setColor(remaining > 0 ? 0x57f287 : 0xed4245)
    .setDescription(
      `**Pens restantes:** ${remaining} / ${config.PENS_TOTAL}\n${bar}\n\n` +
        `**Membros que entregaram (${claimed.length}):**\n` +
        (claimedLines.length ? claimedLines.join("\n") : "_Ninguém ainda._"),
    )
    .setFooter({
      text: `${config.PENS_PER_CLICK} pens por entrega  •  ${used} pens distribuídas`,
    })
    .setTimestamp();
}

function buildBar(current, total, length = 20) {
  const filled = Math.round((current / total) * length);
  return "🟩".repeat(filled) + "⬛".repeat(length - filled);
}

// ─────────────────────────────────────────────
//   STEP 1 — Botão → modal com caixa de texto
// ─────────────────────────────────────────────

async function handlePensClaimButton(interaction) {
  const pens = store.getPens();

  if (pens.remaining <= 0)
    return interaction.reply({
      content: "❌ Não há mais pens esta semana!",
      ephemeral: true,
    });

  const already = pens.claimed.find((c) => c.userId === interaction.user.id);
  if (already)
    return interaction.reply({
      content: `❌ Já reclamaste as tuas **${already.amount} pens** esta semana.`,
      ephemeral: true,
    });

  // Deduz pens e regista imediatamente
  const amount = Math.min(config.PENS_PER_CLICK, pens.remaining);
  pens.remaining -= amount;
  pens.claimed.push({
    userId: interaction.user.id,
    username: interaction.user.username,
    amount,
  });
  if (!pens.contributions) pens.contributions = {};
  store.savePens(pens);

  // Resposta privada
  await interaction.reply({
    content:
      `✅ Recebeste **${amount} ${config.PENS_CLAIM_EMOJI} pens**!\n\n` +
      `📸 Envia agora a **print do cofre** em <#${process.env.PRINTS_CHANNEL_ID}>.`,
    ephemeral: true,
  });

  // Atualiza embed das pens
  try {
    const ch = await interaction.client.channels.fetch(
      process.env.META_CHANNEL_ID,
    );
    const msg = await ch.messages.fetch(pens.messageId);
    await msg.edit({ embeds: [buildPensEmbed(pens)] });
  } catch (e) {
    console.error("[Pens] Não foi possível atualizar a mensagem:", e.message);
  }

  // Marca verde no quadro
  await updateStatusBoard(interaction.client, interaction.user.id, {});
}

// ─────────────────────────────────────────────
//   QUADRO DE MEMBROS
// ─────────────────────────────────────────────

async function updateStatusBoard(client, userId, contrib = {}) {
  const status = store.getStatus();
  if (status.members[userId]) {
    status.members[userId].claimed = true;
    status.members[userId].contrib = contrib;
  }
  store.saveStatus(status);
  await refreshStatusBoard(client);
}

async function refreshStatusBoard(client) {
  const statusChannel = await client.channels
    .fetch(process.env.MEMBER_STATUS_CHANNEL_ID)
    .catch(() => null);
  if (!statusChannel) return;

  const status = store.getStatus();
  const entries = Object.values(status.members);
  const total = entries.length;
  const done = entries.filter((m) => m.claimed).length;

  const lines = entries.map((m) => {
    const note = m.contrib?.note ? `  —  📝 ${m.contrib.note}` : "";
    return `${m.claimed ? "🟢" : "🔴"} <@${m.userId}>${note}`;
  });

  const embed = new EmbedBuilder()
    .setTitle("👥  Quadro de Membros — Meta Semanal")
    .setColor(done === total ? 0x57f287 : 0x5865f2)
    .setDescription(
      lines.length ? lines.join("\n") : "_Nenhum membro encontrado._",
    )
    .addFields({
      name: "📊 Progresso",
      value: `${done} / ${total} membros entregaram`,
      inline: false,
    })
    .setFooter({ text: "🟢 = Entregou  •  🔴 = Ainda não entregou" })
    .setTimestamp();

  if (status.messageId) {
    try {
      const msg = await statusChannel.messages.fetch(status.messageId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      /* apagado, re-publica */
    }
  }

  const msg = await statusChannel.send({ embeds: [embed] });
  status.messageId = msg.id;
  store.saveStatus(status);
}

async function initStatusBoard(client) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  const members = await guild.members.fetch();
  const roleId = process.env.TRACKED_ROLE_ID;
  const tracked = members.filter(
    (m) => m.roles.cache.has(roleId) && !m.user.bot,
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
  await refreshStatusBoard(client);
  console.log(`[Status] Quadro iniciado com ${tracked.size} membros.`);
}

module.exports = {
  postPensMessage,
  handlePensClaimButton,
  initStatusBoard,
  refreshStatusBoard,
  buildPensEmbed,
};
