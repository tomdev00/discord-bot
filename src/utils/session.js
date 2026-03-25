// =============================================
//   utils/session.js  —  Sessões de protect/droga
// =============================================
const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const store = require("./store");

const DRUGS = config.DRUGS;
const fmt = (n) => `$${Number(n).toLocaleString("pt-PT")}`;

// ─────────────────────────────────────────────
//   SEPARADOR DE DIA
// ─────────────────────────────────────────────

async function postDaySeparator(client) {
  const channel = await client.channels.fetch(process.env.SESSION_CHANNEL_ID);
  if (!channel) return;

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          `╔═══════════════════════════════╗\n**${today.toUpperCase()}**\n╚═══════════════════════════════╝`,
        ),
    ],
  });
}

// ─────────────────────────────────────────────
//   EMBEDS DE SESSÃO
// ─────────────────────────────────────────────

function buildSessionEmbed(session) {
  const { drug, entries, startedBy, startedAt } = session;
  const def = DRUGS[drug];

  const civilUnits = entries
    .filter((e) => e.type === "civil")
    .reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = entries
    .filter((e) => e.type === "contratado")
    .reduce((s, e) => s + e.qty, 0);
  const totalUnits = civilUnits + contratadoUnits;

  const civilCost = civilUnits * def.civil;
  const contratadoCost = contratadoUnits * def.contratado;
  const totalCost = civilCost + contratadoCost;
  const totalRevenue = totalUnits * def.venda;
  const profit = totalRevenue - totalCost;

  const lines = [];
  if (civilUnits > 0)
    lines.push(
      `👤 **Civil** — ${civilUnits} unid. × ${fmt(def.civil)} = **${fmt(civilCost)}**`,
    );
  if (contratadoUnits > 0)
    lines.push(
      `🤝 **Contratado** — ${contratadoUnits} unid. × ${fmt(def.contratado)} = **${fmt(contratadoCost)}**`,
    );

  return new EmbedBuilder()
    .setTitle(`${def.emoji}  Sessão em curso — ${def.name}`)
    .setColor(0x57f287)
    .setDescription(
      lines.length ? lines.join("\n") : "_Nenhuma unidade adicionada ainda._",
    )
    .addFields(
      { name: "📦 Total unidades", value: `${totalUnits}`, inline: true },
      { name: "💸 Custo total", value: fmt(totalCost), inline: true },
      { name: "💵 Receita", value: fmt(totalRevenue), inline: true },
      { name: "📈 Lucro", value: fmt(profit), inline: true },
      {
        name: "💰 Lucro/unid.",
        value: totalUnits > 0 ? fmt(Math.round(profit / totalUnits)) : "—",
        inline: true,
      },
    )
    .setFooter({ text: `Iniciada por ${startedBy}` })
    .setTimestamp(new Date(startedAt));
}

function buildSummaryEmbed(session) {
  const { drug, entries, startedBy, startedAt } = session;
  const def = DRUGS[drug];

  const civilUnits = entries
    .filter((e) => e.type === "civil")
    .reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = entries
    .filter((e) => e.type === "contratado")
    .reduce((s, e) => s + e.qty, 0);
  const totalUnits = civilUnits + contratadoUnits;

  const civilCost = civilUnits * def.civil;
  const contratadoCost = contratadoUnits * def.contratado;
  const totalCost = civilCost + contratadoCost;
  const totalRevenue = totalUnits * def.venda;
  const profit = totalRevenue - totalCost;
  const duration = Math.round(
    (Date.now() - new Date(startedAt).getTime()) / 60000,
  );

  const lines = [];
  if (civilUnits > 0)
    lines.push(
      `👤 **Civil** — ${civilUnits} unid. × ${fmt(def.civil)} = ${fmt(civilCost)}`,
    );
  if (contratadoUnits > 0)
    lines.push(
      `🤝 **Contratado** — ${contratadoUnits} unid. × ${fmt(def.contratado)} = ${fmt(contratadoCost)}`,
    );

  return new EmbedBuilder()
    .setTitle(`✅  Resumo — ${def.emoji} ${def.name}`)
    .setColor(0xfee75c)
    .setDescription(lines.length ? lines.join("\n") : "_Nada registado._")
    .addFields(
      {
        name: "📦 Unidades",
        value: `${totalUnits} (${civilUnits} civil · ${contratadoUnits} contratado)`,
        inline: false,
      },
      { name: "💸 Custo", value: fmt(totalCost), inline: true },
      { name: "💵 Receita", value: fmt(totalRevenue), inline: true },
      { name: "📈 Lucro", value: fmt(profit), inline: true },
      { name: "⏱️ Duração", value: `${duration} min`, inline: true },
      { name: "👤 Por", value: startedBy, inline: true },
    )
    .setTimestamp();
}

function mergeIntoWeekly(session) {
  const { drug, entries } = session;
  const def = DRUGS[drug];
  const weekly = store.getWeekly();

  if (!weekly.drugs[drug]) {
    weekly.drugs[drug] = {
      civilUnits: 0,
      contratadoUnits: 0,
      totalCost: 0,
      totalRevenue: 0,
      profit: 0,
    };
  }

  const d = weekly.drugs[drug];
  const civilUnits = entries
    .filter((e) => e.type === "civil")
    .reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = entries
    .filter((e) => e.type === "contratado")
    .reduce((s, e) => s + e.qty, 0);
  const totalUnits = civilUnits + contratadoUnits;
  const totalCost = civilUnits * def.civil + contratadoUnits * def.contratado;
  const totalRevenue = totalUnits * def.venda;

  d.civilUnits += civilUnits;
  d.contratadoUnits += contratadoUnits;
  d.totalCost += totalCost;
  d.totalRevenue += totalRevenue;
  d.profit += totalRevenue - totalCost;

  weekly.totalCost = (weekly.totalCost || 0) + totalCost;
  weekly.totalRevenue = (weekly.totalRevenue || 0) + totalRevenue;
  weekly.totalProfit = (weekly.totalProfit || 0) + (totalRevenue - totalCost);

  store.saveWeekly(weekly);
}

function buildWeeklyEmbed() {
  const weekly = store.getWeekly();
  const rows = [];

  for (const [key, d] of Object.entries(weekly.drugs || {})) {
    const def = DRUGS[key];
    const units = d.civilUnits + d.contratadoUnits;
    if (!units) continue;
    rows.push(
      `${def.emoji} **${def.name}** — ${units} unid. (${d.civilUnits} civil · ${d.contratadoUnits} contratado)\n` +
        `　💸 ${fmt(d.totalCost)}  →  💵 ${fmt(d.totalRevenue)}  →  📈 **${fmt(d.profit)}**`,
    );
  }

  return new EmbedBuilder()
    .setTitle("📊  Relatório Semanal — Sessões de Droga")
    .setColor(0xeb459e)
    .setDescription(
      rows.length ? rows.join("\n\n") : "_Nenhuma sessão esta semana._",
    )
    .addFields(
      {
        name: "💸 Custo total",
        value: fmt(weekly.totalCost || 0),
        inline: true,
      },
      {
        name: "💵 Receita total",
        value: fmt(weekly.totalRevenue || 0),
        inline: true,
      },
      {
        name: "📈 Lucro total",
        value: fmt(weekly.totalProfit || 0),
        inline: true,
      },
    )
    .setTimestamp();
}

module.exports = {
  buildSessionEmbed,
  buildSummaryEmbed,
  mergeIntoWeekly,
  buildWeeklyEmbed,
  postDaySeparator,
};
