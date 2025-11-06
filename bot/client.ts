import { Client, Events, GatewayIntentBits } from 'discord.js';
import { deployCommands } from './commands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  deployCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'play') {
    const appUrl = `https://discord.com/applications/${process.env.VITE_DISCORD_CLIENT_ID}/app`;
    await interaction.reply({
      content: `Click here to start playing SpellCast: ${appUrl}`,
      ephemeral: true,
    });
  }

  if (commandName === 'tutorial') {
    await interaction.reply({
      content: 'Welcome to SpellCast! Connect letters to form words and cast spells. The longer the word, the more powerful the spell!',
      ephemeral: true,
    });
  }

  if (commandName === 'stats') {
    // TODO: Implement stats lookup from Supabase
    await interaction.reply({
      content: 'Stats feature coming soon!',
      ephemeral: true,
    });
  }

  if (commandName === 'leaderboard') {
    // TODO: Implement leaderboard lookup from Supabase
    await interaction.reply({
      content: 'Leaderboard feature coming soon!',
      ephemeral: true,
    });
  }
});

export function startBot() {
  client.login(process.env.DISCORD_BOT_TOKEN);
}
