// =============================================
//   src/deploy-commands.js
//   Run once with: node src/deploy-commands.js
// =============================================
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const sessionCommands = require('./commands/session');
const adminCommands   = require('./commands/admin');

const commands = [...sessionCommands, ...adminCommands].map(c => c.data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Slash commands registered successfully!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();
