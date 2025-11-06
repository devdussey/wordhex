import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Start a new game of SpellCast')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('tutorial')
    .setDescription('Learn how to play SpellCast')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your SpellCast statistics')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the global leaderboard')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

export async function deployCommands() {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.VITE_DISCORD_CLIENT_ID!),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}
