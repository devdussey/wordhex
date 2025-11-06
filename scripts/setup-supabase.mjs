#!/usr/bin/env node

/**
 * Supabase Setup Helper Script
 *
 * This script helps you set up and test your Supabase database connection.
 *
 * Usage:
 *   node scripts/setup-supabase.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${colors.bright}${msg}${colors.reset}`),
  dim: (msg) => console.log(`${colors.dim}${msg}${colors.reset}`),
};

async function checkDatabaseConnection() {
  log.step('Checking database connection...');

  try {
    const { stdout, stderr } = await execAsync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
      cwd: rootDir,
      input: 'SELECT version();',
    });

    if (stderr && stderr.includes('Error')) {
      throw new Error(stderr);
    }

    log.success('Database connection successful!');
    return true;
  } catch (error) {
    log.error('Database connection failed!');
    log.dim(error.message);
    return false;
  }
}

async function generatePrismaClient() {
  log.step('Generating Prisma Client...');

  try {
    await execAsync('npm run prisma:generate', { cwd: rootDir });
    log.success('Prisma Client generated successfully!');
    return true;
  } catch (error) {
    log.error('Failed to generate Prisma Client');
    log.dim(error.message);
    return false;
  }
}

async function runMigrations() {
  log.step('Running database migrations...');

  try {
    const { stdout } = await execAsync('npm run prisma:migrate', { cwd: rootDir });
    log.success('Migrations applied successfully!');
    log.dim(stdout);
    return true;
  } catch (error) {
    log.error('Migration failed!');
    log.dim(error.message);

    // Check if it's because migrations haven't been created yet
    if (error.message.includes('No migration found')) {
      log.info('No migrations found. Creating initial migration...');
      try {
        await execAsync('npx prisma migrate dev --name init', { cwd: rootDir });
        log.success('Initial migration created and applied!');
        return true;
      } catch (migrateError) {
        log.error('Failed to create migration');
        log.dim(migrateError.message);
        return false;
      }
    }

    return false;
  }
}

async function seedDatabase() {
  log.step('Seeding database with initial data...');

  try {
    await execAsync('npm run prisma:seed', { cwd: rootDir });
    log.success('Database seeded successfully!');
    return true;
  } catch (error) {
    log.warning('Seeding failed (this is optional)');
    log.dim(error.message);
    return true; // Don't fail the whole process if seeding fails
  }
}

async function checkEnvFile() {
  log.step('Checking environment configuration...');

  try {
    const envPath = join(rootDir, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    // Check for DATABASE_URL
    if (!envContent.includes('DATABASE_URL=')) {
      log.error('DATABASE_URL not found in .env file');
      return false;
    }

    // Check if it's still the default/example value
    if (envContent.includes('DATABASE_URL=postgresql://user:password@host:port/database')) {
      log.warning('DATABASE_URL appears to be using the example value');
      log.info('Please update DATABASE_URL in .env with your Supabase connection string');
      return false;
    }

    // Check if it's a Supabase URL
    const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
    if (dbUrlMatch) {
      const dbUrl = dbUrlMatch[1].trim();
      if (dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com')) {
        log.success('Supabase DATABASE_URL configured!');

        // Check which mode (Session vs Transaction)
        if (dbUrl.includes(':5432')) {
          log.info('Using Session Mode (Port 5432) - Good for migrations');
        } else if (dbUrl.includes(':6543')) {
          log.info('Using Transaction Mode (Port 6543) - Good for production');
        }
      } else if (dbUrl.includes('railway.app')) {
        log.warning('Still using Railway database');
        log.info('Consider switching to Supabase for better performance');
      } else {
        log.info('Using custom database configuration');
      }
    }

    log.success('Environment configuration looks good!');
    return true;
  } catch (error) {
    log.error('.env file not found!');
    log.info('Create a .env file based on .env.example');
    return false;
  }
}

async function displayNextSteps() {
  console.log('\n' + colors.bright + '━'.repeat(60) + colors.reset);
  console.log(colors.bright + '  Next Steps' + colors.reset);
  console.log(colors.bright + '━'.repeat(60) + colors.reset + '\n');

  log.info('1. Deploy your backend to a hosting platform:');
  log.dim('   - Railway (keep using Railway for hosting, but with Supabase DB)');
  log.dim('   - Render.com');
  log.dim('   - Fly.io');
  log.dim('   - Vercel (for API routes only, separate WebSocket server needed)');

  console.log();
  log.info('2. Update environment variables on your hosting platform:');
  log.dim('   - DATABASE_URL (your Supabase connection string)');
  log.dim('   - ALLOWED_ORIGINS (include your frontend domains)');
  log.dim('   - DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET');

  console.log();
  log.info('3. Update frontend configuration:');
  log.dim('   - Update VITE_API_URL in Vercel environment variables');
  log.dim('   - Update VITE_WS_URL in Vercel environment variables');
  log.dim('   - Update vercel.json rewrite destination');
  log.dim('   - Update package.json CSP header');

  console.log();
  log.info('4. Test your deployment:');
  log.dim('   - Visit your frontend URL');
  log.dim('   - Try signing in with Discord');
  log.dim('   - Create a lobby and test multiplayer');

  console.log();
  log.success('For detailed instructions, see SUPABASE_SETUP.md');
  console.log(colors.bright + '━'.repeat(60) + colors.reset + '\n');
}

async function main() {
  console.log(colors.bright + colors.cyan);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║           🚀 Supabase Setup Helper Script 🚀             ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(colors.reset + '\n');

  log.info('This script will help you set up Supabase for WordHex Discord\n');

  // Step 1: Check environment
  const envOk = await checkEnvFile();
  if (!envOk) {
    log.error('\nSetup cannot continue without proper .env configuration');
    log.info('Please follow these steps:\n');
    log.dim('1. Copy .env.example to .env');
    log.dim('2. Create a Supabase project at https://supabase.com');
    log.dim('3. Get your DATABASE_URL from Supabase Settings → Database');
    log.dim('4. Update DATABASE_URL in .env file');
    log.dim('5. Run this script again\n');
    log.info('See SUPABASE_SETUP.md for detailed instructions');
    process.exit(1);
  }

  console.log();

  // Step 2: Generate Prisma Client
  const clientOk = await generatePrismaClient();
  if (!clientOk) {
    log.error('\nFailed to generate Prisma Client');
    process.exit(1);
  }

  console.log();

  // Step 3: Test database connection
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    log.error('\nCannot connect to database');
    log.info('Please check your DATABASE_URL and ensure:');
    log.dim('- The Supabase project is running');
    log.dim('- The password is correct');
    log.dim('- The connection string format is correct');
    log.dim('- You have internet connectivity');
    process.exit(1);
  }

  console.log();

  // Step 4: Run migrations
  const migrationsOk = await runMigrations();
  if (!migrationsOk) {
    log.warning('\nMigrations failed, but you can fix this later');
  }

  console.log();

  // Step 5: Seed database
  await seedDatabase();

  console.log();

  // Success!
  log.success(colors.bright + 'Supabase setup completed successfully!' + colors.reset);

  // Display next steps
  await displayNextSteps();
}

// Run the script
main().catch((error) => {
  console.error('\n' + colors.red + '✗ Unexpected error:' + colors.reset);
  console.error(error);
  process.exit(1);
});
