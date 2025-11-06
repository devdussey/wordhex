#!/usr/bin/env node
// Generates CLI commands to sync env vars to Vercel and Railway.
// This does not call any external API; it prints commands for you to run.
// Options:
//   --vercel=production,preview,development  Which Vercel envs to target (default: production,preview)
//   --emit-files                             Emit .env.vercel.<env> files with frontend vars

import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve(process.cwd(), '.env');

function parseDotEnv(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function shellEscape(val) {
  if (process.platform === 'win32') {
    // wrap in double quotes and escape internal double quotes
    return '"' + String(val).replace(/"/g, '\\"') + '"';
  }
  return `'${String(val).replace(/'/g, "'\\''")}'`;
}

function main() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error('No .env found at', ENV_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const env = parseDotEnv(content);

  // Select vars to sync
  const FRONTEND_VARS = [
    'VITE_DISCORD_CLIENT_ID',
    'VITE_API_URL',
    'VITE_WS_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_REALTIME_PROVIDER',
    'VITE_ALLOW_CROSS_ORIGIN_API',
  ];
  const BACKEND_VARS = [
    'DATABASE_URL',
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET',
    'ALLOWED_ORIGINS',
    'TRUST_PROXY',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingFrontend = FRONTEND_VARS.filter((k) => !(k in env));
  const missingBackend = BACKEND_VARS.filter((k) => !(k in env));

  if (missingFrontend.length) {
    console.warn('Warning: missing frontend vars in .env:', missingFrontend.join(', '));
  }
  if (missingBackend.length) {
    console.warn('Warning: missing backend vars in .env:', missingBackend.join(', '));
  }

  // Parse CLI args for Vercel envs
  const arg = (name) => {
    const prefix = `--${name}=`;
    const found = process.argv.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : null;
  };
  const vercelArg = arg('vercel');
  const vercelTargets = vercelArg
    ? vercelArg.split(',').map((s) => s.trim()).filter(Boolean)
    : ['production', 'preview'];
  const emitFiles = process.argv.includes('--emit-files');

  console.log('\n=== Vercel (frontend) ===');
  console.log('# Requires Vercel CLI login: vercel login');
  for (const target of vercelTargets) {
    console.log(`\n# Vercel target: ${target}`);
    for (const key of FRONTEND_VARS) {
      if (!(key in env)) continue;
      const value = shellEscape(env[key]);
      console.log(`vercel env add ${key} ${target} ${value}`);
    }
    if (emitFiles) {
      const lines = FRONTEND_VARS
        .filter((k) => k in env)
        .map((k) => `${k}=${env[k]}`)
        .join('\n');
      const outPath = path.resolve(process.cwd(), `.env.vercel.${target}`);
      fs.writeFileSync(outPath, lines + '\n', 'utf8');
      console.log(`# Wrote ${outPath}`);
    }
  }

  console.log('\n=== Railway (backend) ===');
  console.log('# Requires Railway CLI login: railway login');
  console.log('# Run inside the Railway project directory or add --project <id>');
  const parts = [];
  for (const key of BACKEND_VARS) {
    if (!(key in env)) continue;
    const value = shellEscape(env[key]);
    parts.push(`${key}=${value}`);
  }
  if (parts.length) {
    // Railway supports setting multiple in one command
    console.log('railway variables set ' + parts.join(' '));
  } else {
    console.log('# No backend variables found to set');
  }

  console.log('\nNotes:');
  console.log('- Review secrets before pasting. Avoid committing real secrets to git.');
  console.log('- For Vercel, rerun builds after setting variables.');
  console.log('- For Railway, redeploy or restart the service to pick up new variables.');
  if (emitFiles) {
    console.log('- Files .env.vercel.<env> were generated for convenience.');
  }
}

main();
