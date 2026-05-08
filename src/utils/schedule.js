const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const store = require("./store");

async function postDailySchedule(client) {
  const channel = await client.channels.fetch(process.env.SCHEDULE_CHANNEL_ID);
  if (!channel) return console.error("[Schedule] Canal não encontrado.");

  // Apaga mensagens do dia anterior
  const prev = store.getSchedule();
  if (prev?.messageIds?.length) {
    for (const id of prev.messageIds) {
      try {
        const old = await channel.messages.fetch(id);
        await old.delete();
      } catch {
        /* já apagada */
      }
    }
  }

  // Limpa votos do dia anterior
  store.clearVotes();

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const { yes, no, maybe, hired } = config.SCHEDULE_EMOJIS;

  const header = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Marcação de Atividade — ${today}`)
        .setColor(0x5865f2)
        .setDescription(
          `Reage em **cada hora** com a tua disponibilidade:\n\n` +
          `${yes} Disponível   ${no} Indisponível   ${maybe} Talvez   ${hired} Contratado\n\n` +
          `> As reações são **anónimas** — o bot remove-as após votar.`,
        ),
    ],
  });

  const messageIds = [header.id];
  for (const hour of config.SCHEDULE_HOURS) {
    const msg = await channel.send(`🕐 **${hour}**`);
    for (const emoji of Object.values(config.SCHEDULE_EMOJIS)) {
      await msg.react(emoji);
    }
    messageIds.push(msg.id);
    await sleep(600);
  }

  await channel.send(`<@&${process.env.ORG_ROLE_ID}> Votar! ☝️`);

  store.saveSchedule({ messageIds, date: new Date().toISOString() });
  console.log(`[Schedule] Marcação publicada com ${config.SCHEDULE_HOURS.length} horas.`);
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { postDailySchedule };
