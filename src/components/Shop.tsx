import { ArrowLeft, Sparkles, Zap, Crown, Star, Gem } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';

interface ShopProps {
  onBack: () => void;
}

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  type: 'powerup' | 'cosmetic' | 'currency';
}

export function Shop({ onBack }: ShopProps) {
  const { user } = useAuth();

  const shopItems: ShopItem[] = [
    {
      id: 'double-points',
      name: 'Double Points',
      description: 'Earn 2x points for one game',
      price: 100,
      icon: Zap,
      gradient: 'from-yellow-500 to-orange-600',
      type: 'powerup'
    },
    {
      id: 'time-boost',
      name: 'Time Boost',
      description: 'Add 60 seconds to your timer',
      price: 150,
      icon: Sparkles,
      gradient: 'from-blue-500 to-cyan-600',
      type: 'powerup'
    },
    {
      id: 'hint-pack',
      name: 'Hint Pack',
      description: 'Get 5 word suggestions',
      price: 75,
      icon: Star,
      gradient: 'from-green-500 to-emerald-600',
      type: 'powerup'
    },
    {
      id: 'premium-theme',
      name: 'Premium Theme',
      description: 'Unlock exclusive visual style',
      price: 500,
      icon: Crown,
      gradient: 'from-amber-500 to-yellow-600',
      type: 'cosmetic'
    },
    {
      id: 'gem-multiplier',
      name: 'Gem Multiplier',
      description: 'Double gem rewards for 10 games',
      price: 300,
      icon: Gem,
      gradient: 'from-red-500 to-pink-600',
      type: 'powerup'
    }
  ];

  const handlePurchase = (item: ShopItem) => {
    if (!user) return;

    if (user.coins >= item.price) {
      const newCoins = user.coins - item.price;
      storage.users.update(user.id, { coins: newCoins });
      alert(`Successfully purchased ${item.name}!`);
      window.location.reload();
    } else {
      alert('Not enough coins!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-purple-800/50 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Menu
          </button>

          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl px-6 py-3 shadow-lg border-2 border-yellow-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-white" />
              <span className="text-2xl font-bold text-white">{user?.coins || 0}</span>
              <span className="text-white/90 text-sm">Coins</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Shop</h1>
          <p className="text-purple-300 text-lg">Power-ups, Themes & More</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopItems.map((item) => {
            const Icon = item.icon;
            const canAfford = user && user.coins >= item.price;

            return (
              <div
                key={item.id}
                className="bg-purple-900/30 rounded-2xl overflow-hidden shadow-lg border-2 border-purple-700/50 hover:border-slate-600 transition-all"
              >
                <div className={`bg-gradient-to-br ${item.gradient} p-6 flex items-center justify-center`}>
                  <Icon className="w-16 h-16 text-white" />
                </div>

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-purple-300 text-sm mb-4">{item.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-xl">{item.price}</span>
                    </div>

                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={!canAfford}
                      className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                          : 'bg-purple-800/50 text-purple-400 cursor-not-allowed'
                      }`}
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-green-600/20 rounded-2xl p-6 border-2 border-blue-500/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Earn More Coins!</h3>
              <p className="text-slate-300">
                Play games to earn coins. The higher your score, the more coins you'll receive.
                Complete daily challenges for bonus rewards!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
