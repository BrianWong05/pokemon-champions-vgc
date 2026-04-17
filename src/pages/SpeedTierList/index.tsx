import React, { useMemo } from 'react';
import { Pokemon, calculateSpeedStats } from '../../utils/stats';

const mockPokemon: Pokemon[] = [
  { id: 'flutter-mane', name: 'Flutter Mane', baseSpeed: 135 },
  { id: 'iron-bundle', name: 'Iron Bundle', baseSpeed: 136 },
  { id: 'chien-pao', name: 'Chien-Pao', baseSpeed: 135 },
  { id: 'urshifu-rapid-strike', name: 'Urshifu-RS', baseSpeed: 97 },
  { id: 'incineroar', name: 'Incineroar', baseSpeed: 60 },
  { id: 'amoonguss', name: 'Amoonguss', baseSpeed: 30 },
  { id: 'raging-bolt', name: 'Raging Bolt', baseSpeed: 75 },
  { id: 'landorus-therian', name: 'Landorus-T', baseSpeed: 91 },
  { id: 'ogerpon-wellspring', name: 'Ogerpon-Wellspring', baseSpeed: 110 },
];

const SpeedTierList: React.FC = () => {
  const groupedPokemon = useMemo(() => {
    const groups: Record<number, (Pokemon & { stats: ReturnType<typeof calculateSpeedStats> })[]> = {};

    mockPokemon.forEach((p) => {
      const stats = calculateSpeedStats(p.baseSpeed);
      if (!groups[p.baseSpeed]) {
        groups[p.baseSpeed] = [];
      }
      groups[p.baseSpeed].push({ ...p, stats });
    });

    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a)) // Sort base speed descending
      .map(([baseSpeed, pokemon]) => ({
        baseSpeed: Number(baseSpeed),
        pokemon,
      }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Regulation M-A Speed Tiers</h1>
      
      <div className="space-y-8">
        {groupedPokemon.map((group) => (
          <div key={group.baseSpeed} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-4 py-2 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Base {group.baseSpeed}</h2>
            </div>
            
            <div className="divide-y">
              {/* Header for the grid */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider items-center">
                <div className="col-span-4 lg:col-span-5">Pokemon</div>
                <div className="col-span-2 text-center">Max+</div>
                <div className="col-span-2 text-center">Max</div>
                <div className="col-span-2 text-center">Neutral</div>
                <div className="col-span-2 lg:col-span-1 text-center">Min-</div>
              </div>

              {group.pokemon.map((p) => (
                <div key={p.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-4 lg:col-span-5 flex items-center space-x-3">
                    <img 
                      src={`/images/pokemon/thumbnails/${p.id}.png`} 
                      alt={p.name}
                      className="w-10 h-10 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                      }}
                    />
                    <span className="font-medium text-gray-900 truncate">{p.name}</span>
                  </div>
                  
                  <div className="col-span-2 text-center font-bold text-red-600">
                    {p.stats.maxPlus}
                  </div>
                  <div className="col-span-2 text-center font-semibold text-orange-600">
                    {p.stats.maxNeutral}
                  </div>
                  <div className="col-span-2 text-center text-gray-700">
                    {p.stats.uninvested}
                  </div>
                  <div className="col-span-2 lg:col-span-1 text-center text-blue-600">
                    {p.stats.minMinus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpeedTierList;
