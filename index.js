require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const { DISCORD_TOKEN, GUILD_ID } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN を .env に設定してください。');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.once('clientReady', readyClient => {
  console.log(`${readyClient.user.tag} としてログインしました。`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (GUILD_ID && interaction.guildId !== GUILD_ID) {
    await interaction.reply({ content: 'このコマンドはこのサーバーでは利用できません。', ephemeral: true });
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`コマンド実行エラー (${interaction.commandName}):`, error);
    const errorResponse = { content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorResponse);
    } else {
      await interaction.reply(errorResponse);
    }
  }
});

client.login(DISCORD_TOKEN);
