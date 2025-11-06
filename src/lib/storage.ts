interface UserProfile {
  id: string;
  username: string;
  coins: number;
  gems: number;
  cosmetics: string[];
  createdAt: string;
}

interface GameStats {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  highestScore: number;
  longestWord: string;
  totalWordsFound: number;
  lastPlayed: string;
}

interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  unlockedAt: string;
}

export const storage = {
  users: {
    create: (username: string): UserProfile => {
      const users = storage.users.getAll();
      const id = `user_${Date.now()}`;
      const user: UserProfile = {
        id,
        username,
        coins: 100,
        gems: 0,
        cosmetics: [],
        createdAt: new Date().toISOString(),
      };
      users[id] = user;
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', id);
      return user;
    },

    get: (id: string): UserProfile | null => {
      const users = storage.users.getAll();
      return users[id] || null;
    },

    getAll: (): Record<string, UserProfile> => {
      const data = localStorage.getItem('users');
      return data ? JSON.parse(data) : {};
    },

    update: (id: string, updates: Partial<UserProfile>): UserProfile | null => {
      const users = storage.users.getAll();
      if (!users[id]) return null;
      users[id] = { ...users[id], ...updates };
      localStorage.setItem('users', JSON.stringify(users));
      return users[id];
    },

    getCurrentUser: (): UserProfile | null => {
      const userId = localStorage.getItem('currentUser');
      if (!userId) return null;
      return storage.users.get(userId);
    },

    setCurrentUser: (id: string) => {
      localStorage.setItem('currentUser', id);
    },

    logout: () => {
      localStorage.removeItem('currentUser');
    },
  },

  stats: {
    get: (userId: string): GameStats => {
      const stats = storage.stats.getAll();
      return stats[userId] || {
        userId,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        highestScore: 0,
        longestWord: '',
        totalWordsFound: 0,
        lastPlayed: new Date().toISOString(),
      };
    },

    getAll: (): Record<string, GameStats> => {
      const data = localStorage.getItem('gameStats');
      return data ? JSON.parse(data) : {};
    },

    update: (userId: string, updates: Partial<GameStats>): GameStats => {
      const stats = storage.stats.getAll();
      const current = stats[userId] || storage.stats.get(userId);
      stats[userId] = { ...current, ...updates, lastPlayed: new Date().toISOString() };
      localStorage.setItem('gameStats', JSON.stringify(stats));
      return stats[userId];
    },
  },

  achievements: {
    getAll: (userId: string): Achievement[] => {
      const achievements = storage.achievements.getAllData();
      return Object.values(achievements).filter(a => a.userId === userId);
    },

    getAllData: (): Record<string, Achievement> => {
      const data = localStorage.getItem('achievements');
      return data ? JSON.parse(data) : {};
    },

    add: (userId: string, achievementType: string): Achievement => {
      const achievements = storage.achievements.getAllData();
      const id = `achievement_${Date.now()}`;
      const achievement: Achievement = {
        id,
        userId,
        achievementType,
        unlockedAt: new Date().toISOString(),
      };
      achievements[id] = achievement;
      localStorage.setItem('achievements', JSON.stringify(achievements));
      return achievement;
    },
  },

  clear: () => {
    localStorage.clear();
  },
};
