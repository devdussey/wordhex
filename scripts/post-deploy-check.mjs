#!/usr/bin/env node
// Post-deploy checklist: pings frontend, backend, and WS.
// Usage:
//   node scripts/post-deploy-check.mjs \
//     --frontend=https://wordhex-sigma.vercel.app \
//     --api=https://wordhex-backend-production.up.railway.app/api \
//     --ws=wss://wordhex-backend-production.up.railway.app/ws

import { WebSocket } from 'ws';

const FRONTEND_URL = getArg('frontend') || 'https://wordhex-sigma.vercel.app';
const API_BASE = (getArg('api') || 'https://wordhex-backend-production.up.railway.app/api').replace(/\/$/, '');
const WS_URL = getArg('ws') || 'wss://wordhex-backend-production.up.railway.app/ws';

function getArg(name) {
  const p = `--${name}=`;
  const a = process.argv.find((x) => x.startsWith(p));
  return a ? a.slice(p.length) : null;
}

async function checkHttp(url, label = url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ok = res.ok || (res.status >= 200 && res.status < 400);
    console.log(`HTTP [${label}] -> ${res.status} ${res.statusText}`);
    return ok;
  } catch (e) {
    console.error(`HTTP [${label}] error:`, e.message || e);
    return false;
  }
}

async function checkJson(url, label = url) {
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const txt = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(txt); } catch {}
    console.log(`API [${label}] -> ${res.status} ${res.statusText} body=${parsed ? '[json]' : txt.slice(0, 120)}`);
    return res.ok;
  } catch (e) {
    console.error(`API [${label}] error:`, e.message || e);
    return false;
  }
}

async function checkWs(url) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { handshakeTimeout: 5000 });
    let settled = false;
    ws.on('open', () => {
      console.log(`WS [${url}] -> open`);
      settled = true;
      ws.close();
      resolve(true);
    });
    ws.on('error', (err) => {
      if (settled) return;
      console.error(`WS [${url}] error:`, err?.message || err);
      settled = true;
      resolve(false);
    });
    ws.on('close', (code) => {
      if (!settled) {
        console.log(`WS [${url}] -> closed (${code})`);
        settled = true;
        resolve(code === 1000);
      }
    });
    setTimeout(() => {
      if (!settled) {
        console.error(`WS [${url}] timeout`);
        settled = true;
        try { ws.terminate(); } catch {}
        resolve(false);
      }
    }, 7000);
  });
}

(async () => {
  console.log('--- Post-deploy checks start ---');
  const results = [];

  results.push(['frontend', await checkHttp(FRONTEND_URL, 'frontend')]);
  results.push(['api_health', await checkJson(`${API_BASE}/health`, 'api/health')]);
  results.push(['api_leaderboard', await checkJson(`${API_BASE}/leaderboard`, 'api/leaderboard')]);
  results.push(['ws', await checkWs(WS_URL)]);

  const failed = results.filter(([, ok]) => !ok);
  console.log('\nSummary:');
  for (const [name, ok] of results) {
    console.log(`- ${name}: ${ok ? 'OK' : 'FAIL'}`);
  }

  if (failed.length) {
    console.log('\nTroubleshooting tips:');
    console.log('- If frontend FAIL: confirm Vercel deployment completed and domain is correct.');
    console.log('- If api_health FAIL: check Railway logs, env vars (DATABASE_URL), and CORS.');
    console.log('- If api_leaderboard FAIL: DB schema/migrations or Prisma connectivity issue.');
    console.log('- If ws FAIL: ensure service exposes /ws, and Vercel CSP connect-src allows ws domain.');
    process.exitCode = 1;
  }

  console.log('--- Post-deploy checks done ---');
})();

