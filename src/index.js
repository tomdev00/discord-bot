// =============================================
//   src/index.js  —  Bot entry point
// =============================================
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
const cron = require('node-cron');
const config = require('./config');

const { postDailySchedule }                                        = require('./utils/schedule');
const { postPensMessage, handlePensClaimButton, handleContributeModal, initStatusBoard } = require('./utils/pens');
const { buildWeeklyEmbed }                                         = require('./utils/session');
const store = require('./utils/store');

const sessionCommands = require('./commands/session');
const adminCommands   = require('./commands/admin');

// ── Client ───────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ── Commands ─────────────────────────────────
client.commands = new Collection();
for (const cmd of [...sessionCommands, ...adminCommands]) {
  client.commands.set(cmd.data.name, cmd);
}

// ── Ready ─────────────────────────────────────
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Daily schedule at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Posting daily schedule...');
    await postDailySchedule(client);
  }, { timezone: process.env.TIMEZONE || 'Europe/Lisbon' });

  // Weekly report + pens reset (Sunday midnight)
  cron.schedule(`0 0 * * ${config.WEEKLY_REPORT_DAY}`, async () => {
    console.log('[Cron] Weekly reset...');
    try {
      const ch = await client.channels.fetch(process.env.SESSION_CHANNEL_ID);
      await ch.send({ embeds: [buildWeeklyEmbed()] });
      store.clearWeekly();
    } catch (e) {
      console.error('[Cron] Weekly report error:', e.message);
    }
    await postPensMessage(client);
    await initStatusBoard(client);
  }, { timezone: process.env.TIMEZONE || 'Europe/Lisbon' });

  console.log('📅 Cron jobs scheduled.');
});

// ── Interactions ──────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {

  // ── Button: pens claim → open modal
  if (interaction.isButton()) {
    if (interaction.customId === 'pens_claim') {
      await handlePensClaimButton(interaction);
    }
    return;
  }

  // ── Modal: contribution form submitted
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'pens_contribute_modal') {
      await handleContributeModal(interaction);
    }
    return;
  }

  // ── Slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[Command] Error in /${interaction.commandName}:`, err);
    const msg = { content: '❌ Something went wrong running that command.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ── Login ─────────────────────────────────────
client.login(process.env.BOT_TOKEN);
