require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require("discord.js");
const cron = require("node-cron");
const config = require("./config");
const { postDailySchedule } = require("./utils/schedule");
const store = require("./utils/store");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Cron] A publicar marcação diária...");
      await postDailySchedule(client);
    },
    { timezone: process.env.TIMEZONE || "Europe/Lisbon" },
  );

  console.log("📅 Cron agendado para as 00:00.");
});

// Remove a reação do utilizador e guarda o voto internamente
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  const schedule = store.getSchedule();
  if (!schedule?.messageIds?.length) return;

  const hourIds = schedule.messageIds.slice(1); // ignora o header
  const hourIndex = hourIds.indexOf(reaction.message.id);
  if (hourIndex === -1) return;

  // Busca dados completos se necessário (partials)
  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();
  } catch (e) {
    console.error("[Reaction] Erro ao fazer fetch:", e.message);
    return;
  }

  const hour = config.SCHEDULE_HOURS[hourIndex];
  const emoji = reaction.emoji.name;

  // Guarda o voto antes de remover
  const votes = store.getVotes();
  votes.push({
    userId: user.id,
    username: user.username,
    hour,
    emoji,
    timestamp: new Date().toISOString(),
  });
  store.saveVotes(votes);

  // Remove a reação do utilizador
  try {
    await reaction.users.remove(user.id);
    console.log(`[Voto] ${user.username} votou ${emoji} às ${hour} (removido)`);
  } catch (e) {
    console.error("[Reaction] Erro ao remover reação:", e.message);
  }
});

client.login(process.env.BOT_TOKEN);
