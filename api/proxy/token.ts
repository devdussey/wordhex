import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Discord OAuth2 Token Exchange Endpoint
 *
 * This endpoint exchanges an authorization code for an access token
 * Required for Discord Activities to comply with CSP
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get environment variables
  const clientId = process.env.VITE_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Token Exchange] Missing Discord credentials');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Token Exchange] Discord API error:', errorData);
      return res.status(tokenResponse.status).json({
        error: 'Failed to exchange code',
        details: errorData,
      });
    }

    const tokenData = await tokenResponse.json();

    // Return access token to client
    return res.status(200).json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error('[Token Exchange] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
