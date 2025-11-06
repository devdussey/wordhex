#!/usr/bin/env node

/**
 * This script updates the Discord OAuth redirect URI in your Supabase project
 * by directly modifying the auth configuration via the PostgREST API
 */

import https from 'https';
import { readFileSync } from 'fs';

// Load environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value.replace(/^"(.*)"$/, '$1');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const PROJECT_ID = SUPABASE_URL.split('//')[1].split('.')[0];
const CALLBACK_URL = 'http://localhost:5173/callback';

console.log('🚀 Setting up Discord OAuth...');
console.log(`Project ID: ${PROJECT_ID}`);
console.log(`Callback URL: ${CALLBACK_URL}`);

/**
 * Alternative: Use Supabase Management API
 * This requires an access token from https://app.supabase.com/account/tokens
 */

console.log('\n📋 To configure Discord OAuth, you have two options:');
console.log('\n Option 1: Manual Configuration (Quickest)');
console.log('────────────────────────────────────────');
console.log('1. Go to: https://app.supabase.com/');
console.log('2. Select your project');
console.log('3. Go to: Authentication → Providers → Discord');
console.log(`4. Update the Redirect URI to: ${CALLBACK_URL}`);
console.log('5. Click Save');

console.log('\n Option 2: Using Supabase Management API (Automated)');
console.log('─────────────────────────────────────────────────');
console.log('If you have a Supabase personal access token:');

const args = process.argv.slice(2);
const token = args[0];

if (!token) {
  console.log('\nUsage: node setup-oauth.js <YOUR_SUPABASE_ACCESS_TOKEN>');
  console.log('\nTo get your access token:');
  console.log('1. Go to: https://app.supabase.com/account/tokens');
  console.log('2. Click "Generate new token"');
  console.log('3. Copy the token');
  console.log('4. Run: node setup-oauth.js <token>');
  process.exit(0);
}

console.log(`\n🔑 Using provided access token (${token.substring(0, 10)}...)`);
console.log('Updating Discord OAuth redirect URI...\n');

updateDiscordOAuth(token);

function updateDiscordOAuth(accessToken) {
  const data = JSON.stringify({
    redirect_uris: [CALLBACK_URL]
  });

  const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${PROJECT_ID}/auth/config`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${accessToken}`
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ Successfully updated Discord OAuth redirect URI!');
        console.log(`   Callback URL: ${CALLBACK_URL}`);
        console.log('\n📱 Next steps:');
        console.log('1. Restart your dev server: npm run dev');
        console.log('2. Try logging in with Discord');
        console.log('3. You should be redirected to /callback');
      } else if (res.statusCode === 401) {
        console.error('❌ Authentication failed. Check your access token.');
        console.error('   Make sure your token has auth:write permissions');
      } else if (res.statusCode === 404) {
        console.error('❌ Project not found. Check your project ID.');
      } else {
        console.error(`❌ Error: ${res.statusCode}`);
        console.error(responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  });

  req.write(data);
  req.end();
}
