
// Router exports (custom router implementation)
export {
  Router,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from "./router";

// Supabase client
export { supabase } from "./supabaseClient";

// Game + word logic
export { getWordSet, clearWordCache } from "./wordService";
export { validWords } from "./wordlist";

// Discord logging helpers
export { discordLogger } from "./discordLogger";
export type { LogLevel, LogEntry } from "./discordLogger";

// Discord Embedded SDK
export { discordSdk } from "./discordSdk";
export type { DiscordUser, DiscordAuth } from "./discordSdk";
