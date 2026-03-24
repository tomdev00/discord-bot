// =============================================
//   utils/session.js  —  Sessões de protect/droga
// =============================================
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const store  = require('./store');

const DRUGS = config.DRUGS;
const fmt   = (n) => `$${Number(n).toLocaleString('pt-PT')}`;

// ─────────────────────────────────────────────
//   EMBEDS DE SESSÃO
// ─────────────────────────────────────────────

/** Embed ao vivo durante a sessão */
function buildSessionEmbed(session) {
  const { drug, entries, startedBy, startedAt } = session;
  const def = DRUGS[drug];

  let totalCost    = 0;
  let totalRevenue = 0;
  let totalUnits   = 0;

  const civilEntries       = entries.filter(e => e.type === 'civil');
  const contratadoEntries  = entries.filter(e => e.type === 'contratado');

  const civilUnits      = civilEntries.reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = contratadoEntries.reduce((s, e) => s + e.qty, 0);
  totalUnits            = civilUnits + contratadoUnits;

  const civilCost      = civilUnits      * def.civil;
  const contratadoCost = contratadoUnits * def.contratado;
  totalCost            = civilCost + contratadoCost;
  totalRevenue         = totalUnits * def.venda;
  const profit         = totalRevenue - totalCost;

  const lines = [];
  if (civilUnits > 0)
    lines.push(`👤 **Civil** — ${civilUnits} unid. × ${fmt(def.civil)} = **${fmt(civilCost)}**`);
  if (contratadoUnits > 0)
    lines.push(`🤝 **Contratado** — ${contratadoUnits} unid. × ${fmt(def.contratado)} = **${fmt(contratadoCost)}**`);

  return new EmbedBuilder()
    .setTitle(`${def.emoji}  Sessão — ${def.name}`)
    .setColor(0x57F287)
    .setDescription(lines.length ? lines.join('\n') : '_Nenhuma unidade adicionada ainda._')
    .addFields(
      { name: '📦 Total unidades', value: `${totalUnits}`,        inline: true },
      { name: '💸 Custo total',    value: fmt(totalCost),         inline: true },
      { name: '💵 Receita',        value: fmt(totalRevenue),      inline: true },
      { name: '📈 Lucro',          value: fmt(profit),            inline: true },
      { name: '💰 Lucro/unid.',    value: totalUnits > 0 ? fmt(Math.round(profit / totalUnits)) : '—', inline: true },
    )
    .setFooter({ text: `Sessão iniciada por ${startedBy} • /session-add para adicionar` })
    .setTimestamp(new Date(startedAt));
}

/** Embed de resumo no fim da sessão */
function buildSummaryEmbed(session) {
  const { drug, entries, startedBy, startedAt } = session;
  const def = DRUGS[drug];

  const civilUnits      = entries.filter(e => e.type === 'civil').reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = entries.filter(e => e.type === 'contratado').reduce((s, e) => s + e.qty, 0);
  const totalUnits      = civilUnits + contratadoUnits;

  const civilCost      = civilUnits      * def.civil;
  const contratadoCost = contratadoUnits * def.contratado;
  const totalCost      = civilCost + contratadoCost;
  const totalRevenue   = totalUnits * def.venda;
  const profit         = totalRevenue - totalCost;
  const duration       = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);

  const lines = [];
  if (civilUnits > 0)
    lines.push(`👤 **Civil** — ${civilUnits} unid. × ${fmt(def.civil)} = ${fmt(civilCost)}`);
  if (contratadoUnits > 0)
    lines.push(`🤝 **Contratado** — ${contratadoUnits} unid. × ${fmt(def.contratado)} = ${fmt(contratadoCost)}`);

  return new EmbedBuilder()
    .setTitle(`✅  Resumo de Sessão — ${def.emoji} ${def.name}`)
    .setColor(0xFEE75C)
    .setDescription(lines.length ? lines.join('\n') : '_Nada registado nesta sessão._')
    .addFields(
      { name: '📦 Unidades compradas', value: `${totalUnits} (${civilUnits} civil · ${contratadoUnits} contratado)`, inline: false },
      { name: '💸 Custo total',        value: fmt(totalCost),    inline: true },
      { name: '💵 Receita total',      value: fmt(totalRevenue), inline: true },
      { name: '📈 Lucro',              value: fmt(profit),       inline: true },
      { name: '⏱️ Duração',            value: `${duration} min`, inline: true },
      { name: '👤 Iniciada por',       value: startedBy,         inline: true },
    )
    .setTimestamp();
}

/** Junta os totais da sessão no acumulado semanal */
function mergeIntoWeekly(session) {
  const { drug, entries } = session;
  const def    = DRUGS[drug];
  const weekly = store.getWeekly();

  if (!weekly.drugs[drug]) {
    weekly.drugs[drug] = { civilUnits: 0, contratadoUnits: 0, totalCost: 0, totalRevenue: 0, profit: 0 };
  }

  const d = weekly.drugs[drug];
  const civilUnits      = entries.filter(e => e.type === 'civil').reduce((s, e) => s + e.qty, 0);
  const contratadoUnits = entries.filter(e => e.type === 'contratado').reduce((s, e) => s + e.qty, 0);
  const totalUnits      = civilUnits + contratadoUnits;
  const totalCost       = (civilUnits * def.civil) + (contratadoUnits * def.contratado);
  const totalRevenue    = totalUnits * def.venda;

  d.civilUnits      += civilUnits;
  d.contratadoUnits += contratadoUnits;
  d.totalCost       += totalCost;
  d.totalRevenue    += totalRevenue;
  d.profit          += totalRevenue - totalCost;

  weekly.totalCost    = (weekly.totalCost    || 0) + totalCost;
  weekly.totalRevenue = (weekly.totalRevenue || 0) + totalRevenue;
  weekly.totalProfit  = (weekly.totalProfit  || 0) + (totalRevenue - totalCost);

  store.saveWeekly(weekly);
}

/** Embed do relatório semanal */
function buildWeeklyEmbed() {
  const weekly = store.getWeekly();
  const rows   = [];

  for (const [key, d] of Object.entries(weekly.drugs || {})) {
    const def   = DRUGS[key];
    const units = d.civilUnits + d.contratadoUnits;
    if (!units) continue;
    rows.push(
      `${def.emoji} **${def.name}** — ${units} unid. (${d.civilUnits} civil · ${d.contratadoUnits} contratado)\n` +
      `　💸 ${fmt(d.totalCost)}  →  💵 ${fmt(d.totalRevenue)}  →  📈 **${fmt(d.profit)}**`
    );
  }

  return new EmbedBuilder()
    .setTitle('📊  Relatório Semanal — Sessões de Droga')
    .setColor(0xEB459E)
    .setDescription(rows.length ? rows.join('\n\n') : '_Nenhuma sessão esta semana._')
    .addFields(
      { name: '💸 Custo total',   value: fmt(weekly.totalCost    || 0), inline: true },
      { name: '💵 Receita total', value: fmt(weekly.totalRevenue || 0), inline: true },
      { name: '📈 Lucro total',   value: fmt(weekly.totalProfit  || 0), inline: true },
    )
    .setTimestamp();
}

module.exports = { buildSessionEmbed, buildSummaryEmbed, mergeIntoWeekly, buildWeeklyEmbed };
