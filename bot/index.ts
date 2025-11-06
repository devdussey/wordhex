import { config } from 'dotenv';
import { startBot } from './client';

// Load environment variables
config();

// Start the Discord bot
startBot();
