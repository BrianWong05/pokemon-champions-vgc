import React from 'react';
import Typography from '@/components/atoms/Typography';
interface DamageCalculatorTemplateProps {
  attackerPanel: React.ReactNode;
  defenderPanel: React.ReactNode;
  resultsPanel: React.ReactNode;
  activeWeather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  onWeatherChange: (w: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow') => void;
  isSpreadTarget: boolean;
  onSpreadTargetChange: (isSpread: boolean) => void;
}

const DamageCalculatorTemplate: React.FC<DamageCalculatorTemplateProps> = ({
  attackerPanel, defenderPanel, resultsPanel, activeWeather, onWeatherChange,
  isSpreadTarget, onSpreadTargetChange
}) => {
  const weatherOptions: ('None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow')[] = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-12 text-center">
          <Typography variant="h1" className="mb-2">VGC Damage Calculator</Typography>
          <Typography variant="body" className="text-gray-500">Custom "SP" Stat System Implementation</Typography>
        </header>

        <div className="flex flex-col gap-8">
          {/* Top Section: Results */}
          <div className="w-full">
            {resultsPanel}
          </div>

          {/* Middle Section: Field Conditions */}
          <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[9px] font-black">Field Weather</Typography>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1 border border-gray-100">
                {weatherOptions.map(w => (
                  <button
                    key={w}
                    onClick={() => onWeatherChange(w)}
                    className={`
                      px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                      ${activeWeather === w 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-gray-600'}
                    `}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 border-l border-gray-100 pl-8 h-8">
              <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[9px] font-black">Target Mode</Typography>
              <div className="flex bg-gray-50 p-1 rounded-xl gap-1 border border-gray-100">
                <button
                  onClick={() => onSpreadTargetChange(false)}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${!isSpreadTarget 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-600'}
                  `}
                >
                  Single
                </button>
                <button
                  onClick={() => onSpreadTargetChange(true)}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isSpreadTarget 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-600'}
                  `}
                >
                  Spread
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Setup */}

          {/* Bottom Section: Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>{attackerPanel}</div>
            <div className="space-y-8">
              {defenderPanel}
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-800 shadow-sm">
                <h4 className="font-bold mb-2 uppercase tracking-widest text-[10px]">Stat Formulas</h4>
                <div className="space-y-1 font-medium">
                  <p>HP = Base + 75 + SP</p>
                  <p>Stats = floor((Base + 20 + SP) * Nature)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamageCalculatorTemplate;
