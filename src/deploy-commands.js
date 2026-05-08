// Corre uma vez para limpar todos os slash commands do servidor:
//   node src/deploy-commands.js
require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log("A remover todos os slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] },
    );
    console.log("✅ Slash commands removidos com sucesso!");
  } catch (err) {
    console.error("❌ Erro:", err);
  }
})();
