# WordHex Discord

A multiplayer word game built as a Discord Activity, where players compete to find words in a hexagonal grid. Challenge friends in real-time lobbies or practice solo to climb the leaderboard!

## Features

- **Multiplayer Lobbies**: Create public or private lobbies and play with friends
- **Real-time Gameplay**: WebSocket-powered live updates for seamless multiplayer experience
- **Multiple Authentication Methods**:
  - Discord OAuth integration
  - Email authentication
  - Guest play with custom usernames
- **Leaderboards & Statistics**: Track your performance and compete globally
- **Server Records**: Set high scores for your Discord server
- **Matchmaking**: Join queue for quick matches with other players

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Discord Embedded App SDK** for Discord integration

### Backend
- **Node.js** with Express
- **WebSocket (ws)** for real-time communication
- **Prisma ORM** with PostgreSQL database
- **Discord.js** for bot functionality

## Prerequisites

- **Node.js** 20.19.0 or higher
- **PostgreSQL** database (or compatible service like Supabase)
- **Discord Application** (for OAuth and bot features)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/devdussey/WordHexDiscord.git
cd WordHexDiscord
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# Discord Activity Configuration (Frontend)
VITE_DISCORD_CLIENT_ID=your-discord-client-id

# Optional API/WebSocket endpoints (defaults to localhost)
VITE_API_URL=https://your-backend-host/api
VITE_WS_URL=wss://your-backend-host/ws

# Server ID (optional, defaults to 'dev-server-123')
VITE_SERVER_ID=your-discord-server-id

# Backend Configuration
PORT=3001
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com

# Discord OAuth / Bot Configuration
# (client id/secret required for Discord login)
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database
```

### Discord OAuth Setup

To enable Discord logins for embedded activities:

1. In the [Discord Developer Portal](https://discord.com/developers/applications), open your application and add the backend callback URL to **OAuth2 → Redirects**. Use the pattern:
   - `https://your-backend-domain/api/auth/discord/callback`
   - Add one entry per environment (e.g., Railway production domain, localhost for development).
2. Under **OAuth2 → Default Authorization Link**, include the `identify` and `guilds` scopes. These scopes match the backend generator so the activity can read the player identity and available guilds.
3. If you configure the Activity's **Root URL**, point it to your frontend origin (for example `https://your-frontend-domain/`). The SPA handles routing from there.

Once saved, redeploy the backend after setting `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` so the OAuth flow can exchange codes successfully.

### 4. Database Setup

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Development

Run the frontend and backend in separate terminals:

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run server
```

**Optional - Discord Bot:**
```bash
npm run bot
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Deployment

This project supports deployment to multiple platforms. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy Options

- **Frontend**: Vercel (recommended)
- **Backend**: Railway, Render, or Fly.io
- **Database**: Supabase, Railway, or any PostgreSQL provider

### Deployment Notifications

Discord webhook notifications are configured for both Vercel and Railway deployments, providing real-time deployment status updates.

### Production Build

```bash
npm run build
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Create production build |
| `npm run server` | Start backend server |
| `npm run bot` | Run Discord bot |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Deploy database migrations |
| `npm run prisma:seed` | Seed database with initial data |

## Project Structure

```
WordHexDiscord/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── contexts/           # React contexts (Auth, Error, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and WebSocket services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── server/                 # Backend source code
│   ├── index.js            # Express server & WebSocket setup
│   └── state.js            # In-memory state management
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Prisma schema definition
│   ├── migrations/         # Database migrations
│   └── seed.js             # Database seeding script
├── public/                 # Static assets
└── [config files]          # Various configuration files
```

## Security Features

- **CORS Protection**: Configurable origin allowlist
- **Input Validation**: Request parameter validation
- **Error Sanitization**: Generic error messages to prevent information leakage
- **OAuth State Management**: Automatic cleanup of expired states

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private. All rights reserved.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ for the Discord community
