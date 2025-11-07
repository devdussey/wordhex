#!/usr/bin/env node

/**
 * Get OAuth URLs for WordHex Discord Authentication
 * This script shows you all the URLs you need to configure
 */

import { readFileSync } from 'fs';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          WordHex OAuth URL Configuration Helper           ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Try to read .env file
let supabaseUrl = null;
let vercelUrl = null;

try {
  const envContent = readFileSync('.env', 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    }
  });

  supabaseUrl = envVars.VITE_SUPABASE_URL;
} catch (error) {
  console.log('⚠️  No .env file found. Using placeholders.\n');
}

// Extract project reference from Supabase URL
let projectRef = '<YOUR_PROJECT_REF>';
if (supabaseUrl) {
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    projectRef = match[1];
  }
}

console.log('📋 DISCORD DEVELOPER PORTAL CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1. Go to: https://discord.com/developers/applications');
console.log('2. Select your application (or create a new one)');
console.log('3. Go to: OAuth2 → General → Redirects');
console.log('4. Add these redirect URLs:\n');

console.log('   ✓ REQUIRED - Supabase OAuth Callback:');
console.log(`     https://${projectRef}.supabase.co/auth/v1/callback\n`);

console.log('   ✓ For Local Development:');
console.log('     http://localhost:5173/callback\n');

console.log('   ✓ For Production (after deploying to Vercel):');
console.log('     https://YOUR-APP-NAME.vercel.app/callback');
console.log('     (Replace YOUR-APP-NAME with your actual Vercel URL)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 SUPABASE DASHBOARD CONFIGURATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1. Go to: https://app.supabase.com');
console.log('2. Select your project');
console.log('3. Go to: Authentication → Providers → Discord');
console.log('4. Enable Discord and add your:');
console.log('   - Discord Client ID');
console.log('   - Discord Client Secret\n');

console.log('5. Go to: Authentication → URL Configuration');
console.log('6. Set Site URL to:\n');
console.log('   For Development:');
console.log('     http://localhost:5173\n');
console.log('   For Production:');
console.log('     https://YOUR-APP-NAME.vercel.app\n');

console.log('7. Add Redirect URLs:');
console.log('     http://localhost:5173/**');
console.log('     https://YOUR-APP-NAME.vercel.app/**\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 VERCEL ENVIRONMENT VARIABLES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('In your Vercel project settings, add these environment variables:\n');

if (supabaseUrl) {
  console.log(`   VITE_SUPABASE_URL=${supabaseUrl}`);
} else {
  console.log('   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co');
}

console.log('   VITE_SUPABASE_ANON_KEY=your-anon-key-here');
console.log('   VITE_DISCORD_WEBHOOK_URL=your-discord-webhook-url (optional)');
console.log('   VITE_ENVIRONMENT=production\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📝 CURRENT CONFIGURATION SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (supabaseUrl) {
  console.log(`✓ Supabase URL: ${supabaseUrl}`);
  console.log(`✓ Project Reference: ${projectRef}`);
} else {
  console.log('✗ Supabase URL not found in .env file');
  console.log('  Create a .env file with your Supabase credentials');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('💡 QUICK TIPS:');
console.log('   • Copy the exact URLs shown above');
console.log('   • Make sure there are no trailing slashes');
console.log('   • After deploying to Vercel, re-run this and update URLs');
console.log('   • Test OAuth in incognito mode to avoid cache issues\n');

console.log('📖 For detailed setup instructions, see: OAUTH_SETUP_GUIDE.md\n');
