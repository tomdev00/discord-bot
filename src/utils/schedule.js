// =============================================
//   utils/schedule.js  —  Marcação diária
//   Uma mensagem por hora, cada uma com as suas reações
// =============================================
const { EmbedBuilder } = require("discord.js");
const config = require("../config");
const store = require("./store");

async function postDailySchedule(client) {
  const channel = await client.channels.fetch(process.env.SCHEDULE_CHANNEL_ID);
  if (!channel) return console.error("[Schedule] Canal não encontrado.");

  // Apaga as mensagens do dia anterior
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

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const { yes, no, maybe } = config.SCHEDULE_EMOJIS;

  // Mensagem de cabeçalho
  const header = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`📅  Marcação de Atividade — ${today}`)
        .setColor(0x5865f2)
        .setDescription(
          `Reagir em **cada hora** com a tua disponibilidade:\n\n` +
            `${yes} Disponível   ${no} Indisponível   ${maybe} Secalhar   ${contratado} Contratado\n\n` +
            `> As reações do bot são apenas para mostrar as opções — **não contam como voto.**`,
        ),
    ],
  });

  // Uma mensagem por hora
  const messageIds = [header.id];

  for (const hour of config.SCHEDULE_HOURS) {
    const msg = await channel.send(`🕐 **${hour}**`);
    for (const emoji of Object.values(config.SCHEDULE_EMOJIS)) {
      await msg.react(emoji);
    }
    messageIds.push(msg.id);
    await sleep(600);
  }

  store.saveSchedule({ messageIds, date: new Date().toISOString() });
  console.log(
    `[Schedule] Marcação publicada com ${config.SCHEDULE_HOURS.length} horas.`,
  );
}

async function countScheduleVotes(client) {
  const channel = await client.channels.fetch(process.env.SCHEDULE_CHANNEL_ID);
  const schedule = store.getSchedule();
  const botId = client.user.id;

  if (!schedule?.messageIds?.length) return [];

  const { yes, no, maybe } = config.SCHEDULE_EMOJIS;
  const results = [];
  const hourIds = schedule.messageIds.slice(1); // primeiro é o cabeçalho

  for (let i = 0; i < hourIds.length; i++) {
    try {
      const msg = await channel.messages.fetch(hourIds[i]);
      const countReaction = async (emoji) => {
        const reaction = msg.reactions.cache.get(emoji);
        if (!reaction) return 0;
        const users = await reaction.users.fetch();
        return users.filter((u) => u.id !== botId).size;
      };
      results.push({
        hour: config.SCHEDULE_HOURS[i],
        yes: await countReaction(yes),
        no: await countReaction(no),
        maybe: await countReaction(maybe),
      });
    } catch {
      results.push({ hour: config.SCHEDULE_HOURS[i], yes: 0, no: 0, maybe: 0 });
    }
  }

  return results;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { postDailySchedule, countScheduleVotes };
