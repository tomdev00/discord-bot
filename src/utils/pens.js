// STEP 1 — Botão → pede print
async function handlePensClaimButton(interaction) {
  const pens = store.getPens();

  if (pens.remaining <= 0) {
    return interaction.reply({
      content: "❌ Não há mais pens esta semana!",
      ephemeral: true,
    });
  }

  const already = pens.claimed.find((c) => c.userId === interaction.user.id);
  if (already) {
    return interaction.reply({
      content: `❌ Já reclamaste as tuas **${already.amount} pens** esta semana.`,
      ephemeral: true,
    });
  }

  // Sem modal — só pede a print diretamente no canal
  await interaction.reply({
    content:
      `📸 <@${interaction.user.id}> — envia a **print** do cofre aqui neste canal para confirmar a entrega.\n` +
      `Assim que enviares, usa o comando </pens-confirmar:0> para receber as tuas pens.`,
    ephemeral: false,
  });
}
