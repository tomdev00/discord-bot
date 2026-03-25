// =============================================
//   src/index.js  —  Bot entry point
// =============================================
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
} = require("discord.js");
const cron = require("node-cron");
const config = require("./config");

const {
  setupPanel,
  handlePanelButton,
  handleDrugSelect,
  handleTypeSelect,
  handleAddModal,
  handleMetaModal,
  handleFightStartModal,
  handleFightEndModal,
} = require("./utils/panel");
const { postDailySchedule } = require("./utils/schedule");
const {
  postPensMessage,
  handlePensClaimButton,
  initStatusBoard,
} = require("./utils/pens");
const { buildWeeklyEmbed, postDaySeparator } = require("./utils/session");
const store = require("./utils/store");

const sessionCommands = require("./commands/session");
const adminCommands = require("./commands/admin");

// ── Client ───────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
  ],
});

// ── Commands ─────────────────────────────────
client.commands = new Collection();
for (const cmd of [...sessionCommands, ...adminCommands]) {
  client.commands.set(cmd.data.name, cmd);
}

// ── Ready ─────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  await setupPanel(client);

  // Separador de dia + marcação à meia-noite
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Cron] Separador de dia + marcação...");
      const today = new Date().toDateString();
      store.saveDaySeparator({ date: today });
      await postDaySeparator(client);
      // Ping da org antes da marcação
      const scheduleCh = await client.channels.fetch(
        process.env.SCHEDULE_CHANNEL_ID,
      );
      await scheduleCh.send(`<@&${process.env.ORG_ROLE_ID}>`);
      await postDailySchedule(client);
    },
    { timezone: process.env.TIMEZONE || "Europe/Lisbon" },
  );

  // Reset semanal ao domingo
  cron.schedule(
    `0 0 * * ${config.WEEKLY_REPORT_DAY}`,
    async () => {
      console.log("[Cron] Weekly reset...");
      try {
        const ch = await client.channels.fetch(process.env.SESSION_CHANNEL_ID);
        await ch.send({ embeds: [buildWeeklyEmbed()] });
        store.clearWeekly();
      } catch (e) {
        console.error("[Cron] Weekly report error:", e.message);
      }
      await postPensMessage(client);
      await initStatusBoard(client);
    },
    { timezone: process.env.TIMEZONE || "Europe/Lisbon" },
  );

  console.log("📅 Cron jobs scheduled.");
});

// ── Interactions ──────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("panel_")) {
      await handlePanelButton(interaction);
      return;
    }
    if (interaction.customId === "pens_claim") {
      await handlePensClaimButton(interaction);
      return;
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "panel_drug_select") {
      await handleDrugSelect(interaction);
      return;
    }
    if (interaction.customId === "panel_type_select") {
      await handleTypeSelect(interaction);
      return;
    }
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("panel_qty_modal_")) {
      await handleAddModal(interaction);
      return;
    }
    if (interaction.customId === "panel_meta_modal") {
      await handleMetaModal(interaction);
      return;
    }
    if (interaction.customId === "panel_fight_start_modal") {
      await handleFightStartModal(interaction);
      return;
    }
    if (interaction.customId === "panel_fight_end_modal") {
      await handleFightEndModal(interaction);
      return;
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Command] Error in /${interaction.commandName}:`, err);
    const msg = { content: "❌ Algo correu mal.", ephemeral: true };
    if (interaction.deferred || interaction.replied)
      await interaction.editReply(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

// ── Listener: prints no canal de prints ───────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== process.env.PRINTS_CHANNEL_ID) return;

  const image = message.attachments.find((a) =>
    a.contentType?.startsWith("image/"),
  );
  if (!image) {
    const warn = await message.reply(
      "⚠️ Tens de enviar uma **imagem** como print. Tenta outra vez.",
    );
    setTimeout(() => warn.delete().catch(() => {}), 5000);
    return;
  }

  const chefiaChannel = await message.client.channels
    .fetch(process.env.CHEFIA_CHANNEL_ID)
    .catch(() => null);
  if (!chefiaChannel) return;

  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setTitle("📸  Print de entrega — aguarda confirmação")
    .setColor(0xfee75c)
    .addFields(
      {
        name: "👤 Membro",
        value: `<@${message.author.id}> (${message.author.username})`,
        inline: true,
      },
      {
        name: "📅 Data",
        value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
        inline: true,
      },
      {
        name: "🕐 Hora",
        value: `<t:${Math.floor(message.createdTimestamp / 1000)}:T>`,
        inline: true,
      },
    )
    .setImage(image.url)
    .setFooter({
      text: `ID do membro: ${message.author.id} | Reage com ✅ para confirmar ou ❌ para rejeitar`,
    })
    .setTimestamp();

  const chefiaMsg = await chefiaChannel.send({ embeds: [embed] });
  await chefiaMsg.react("✅");
  await chefiaMsg.react("❌");
  await message.delete().catch(() => {});

  const pending = store.getPendingPrints();
  pending[chefiaMsg.id] = {
    userId: message.author.id,
    username: message.author.username,
    sentAt: message.createdTimestamp,
  };
  store.savePendingPrints(pending);
});

// ── Listener: reações da chefia nas prints ────
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channelId !== process.env.CHEFIA_CHANNEL_ID) return;

  const pending = store.getPendingPrints();
  const entry = pending[reaction.message.id];
  if (!entry) return;

  const emoji = reaction.emoji.name;
  const { EmbedBuilder } = require("discord.js");

  if (emoji === "✅") {
    const { refreshStatusBoard } = require("./utils/pens");
    const status = store.getStatus();
    if (status.members[entry.userId]) {
      status.members[entry.userId].claimed = true;
    }
    store.saveStatus(status);
    await refreshStatusBoard(client);

    const embed = new EmbedBuilder()
      .setTitle("✅  Print confirmada")
      .setColor(0x57f287)
      .addFields(
        {
          name: "👤 Membro",
          value: `<@${entry.userId}> (${entry.username})`,
          inline: true,
        },
        {
          name: "📅 Data",
          value: `<t:${Math.floor(entry.sentAt / 1000)}:F>`,
          inline: true,
        },
        {
          name: "🕐 Hora",
          value: `<t:${Math.floor(entry.sentAt / 1000)}:T>`,
          inline: true,
        },
        { name: "👮 Confirmado por", value: `<@${user.id}>`, inline: true },
      )
      .setImage(reaction.message.embeds[0]?.image?.url || "")
      .setTimestamp();

    await reaction.message.edit({ embeds: [embed] });

    try {
      const member = await client.users.fetch(entry.userId);
      await member.send("✅ A tua entrega foi confirmada pela chefia!");
    } catch {
      /* DMs fechadas */
    }
  } else if (emoji === "❌") {
    const embed = new EmbedBuilder()
      .setTitle("❌  Print rejeitada")
      .setColor(0xed4245)
      .addFields(
        {
          name: "👤 Membro",
          value: `<@${entry.userId}> (${entry.username})`,
          inline: true,
        },
        {
          name: "📅 Data",
          value: `<t:${Math.floor(entry.sentAt / 1000)}:F>`,
          inline: true,
        },
        {
          name: "🕐 Hora",
          value: `<t:${Math.floor(entry.sentAt / 1000)}:T>`,
          inline: true,
        },
        { name: "👮 Rejeitado por", value: `<@${user.id}>`, inline: true },
      )
      .setImage(reaction.message.embeds[0]?.image?.url || "")
      .setTimestamp();

    await reaction.message.edit({ embeds: [embed] });

    const pens = store.getPens();
    const claim = pens.claimed.findIndex((c) => c.userId === entry.userId);
    if (claim !== -1) {
      pens.remaining += pens.claimed[claim].amount;
      pens.claimed.splice(claim, 1);
      store.savePens(pens);
    }

    try {
      const member = await client.users.fetch(entry.userId);
      await member.send(
        `❌ A tua print foi rejeitada pela chefia. As tuas pens foram devolvidas.\n` +
          `Envia uma nova print no canal <#${process.env.PRINTS_CHANNEL_ID}>.`,
      );
    } catch {
      /* DMs fechadas */
    }
  }

  delete pending[reaction.message.id];
  store.savePendingPrints(pending);
});

// ── Login ─────────────────────────────────────
client.login(process.env.BOT_TOKEN);
