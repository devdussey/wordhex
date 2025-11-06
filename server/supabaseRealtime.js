import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const realtimeEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let supabaseClient = null;
const channelCache = new Map();

if (realtimeEnabled) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 15,
      },
    },
  });

  console.log('[realtime] Supabase realtime enabled');
} else {
  console.warn('[realtime] Supabase realtime disabled - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

async function ensureChannel(channelName) {
  if (!supabaseClient) {
    return null;
  }

  let entry = channelCache.get(channelName);
  if (entry?.status === 'SUBSCRIBED') {
    return entry.channel;
  }

  if (!entry) {
    const channel = supabaseClient.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    const readyPromise = new Promise((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          entry.status = status;
          resolve(channel);
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          entry.status = status;
          reject(new Error(`Supabase channel ${channelName} subscribe failed with status ${status}`));
        }
      });
    });

    entry = {
      channel,
      status: 'SUBSCRIBING',
      readyPromise,
    };
    channelCache.set(channelName, entry);
  }

  try {
    await entry.readyPromise;
    return entry.channel;
  } catch (error) {
    console.error('[realtime] Failed to subscribe Supabase channel', channelName, error);
    channelCache.delete(channelName);
    return null;
  }
}

export async function publishSupabaseEvent(channelName, payload) {
  if (!supabaseClient) {
    return;
  }

  try {
    const channel = await ensureChannel(channelName);
    if (!channel) {
      return;
    }

    const message = { channel: channelName, ...payload };
    const result = await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    if (result === 'timed out') {
      console.warn('[realtime] Supabase broadcast timed out for channel', channelName);
    }
  } catch (error) {
    console.error('[realtime] Failed to publish Supabase event', channelName, error);
  }
}

export async function shutdownSupabaseRealtime() {
  if (!supabaseClient) {
    return;
  }

  const closePromises = [];
  channelCache.forEach((entry, channelName) => {
    try {
      closePromises.push(entry.channel.unsubscribe());
    } catch (error) {
      console.error('[realtime] Failed to unsubscribe channel during shutdown', channelName, error);
    }
  });

  channelCache.clear();

  try {
    await Promise.allSettled(closePromises);
  } catch (error) {
    console.error('[realtime] Error during Supabase shutdown', error);
  }
}

export const isSupabaseRealtimeEnabled = realtimeEnabled;
