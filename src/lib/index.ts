
// Router exports
export {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
} from "react-router-dom";

// Supabase client
export { supabase } from "./supabaseClient";

// Game + word logic
export { getWordSet, clearWordCache } from "./wordService";
export { validWords } from "./wordlist";

// Discord logging helpers
export { discordLogger } from "./discordLogger";
export type { LogLevel, LogEntry } from "./discordLogger";
