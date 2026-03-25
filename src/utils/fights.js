// =============================================
//   utils/fights.js  —  Negociações e fights
// =============================================
const { EmbedBuilder } = require("discord.js");

function buildFightEmbed(fight, closed = false) {
  const color = closed
    ? fight.desfecho?.toLowerCase().includes("vitória") ||
      fight.desfecho?.toLowerCase().includes("vitoria")
      ? 0x57f287
      : 0xed4245
    : 0xfee75c;

  const fields = [
    { name: "🗺️ Território", value: fight.territorio, inline: true },
    { name: "⚔️ Adversário", value: fight.adversario, inline: true },
    {
      name: "👥 Contagem",
      value: `**${fight.nosCount}** vs **${fight.elesCount}**`,
      inline: true,
    },
    { name: "🕐 Início negociação", value: fight.inicioNeg, inline: true },
  ];

  if (closed) {
    fields.push({
      name: "🕑 Fim negociação",
      value: fight.fimNeg,
      inline: true,
    });
    fields.push({ name: "🏁 Desfecho", value: fight.desfecho, inline: true });
  }

  return new EmbedBuilder()
    .setTitle(
      closed
        ? `${fight.desfecho?.toLowerCase().includes("vitória") || fight.desfecho?.toLowerCase().includes("vitoria") ? "🏆" : "💀"}  Negociação — ${fight.territorio}`
        : `⚔️  Negociação em curso — ${fight.territorio}`,
    )
    .setColor(color)
    .addFields(fields)
    .setFooter({
      text: closed
        ? `Fechada por ${fight.closedBy}`
        : `Aberta por ${fight.openedBy}`,
    })
    .setTimestamp();
}

module.exports = { buildFightEmbed };
