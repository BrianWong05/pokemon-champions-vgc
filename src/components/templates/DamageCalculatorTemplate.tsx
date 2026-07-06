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
  isFairyAura: boolean;
  isDarkAura: boolean;
  isAuraBreak: boolean;
  onToggleFieldAura: (aura: 'isFairyAura' | 'isDarkAura' | 'isAuraBreak') => void;
  activeTerrain: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic';
  onTerrainChange: (t: 'None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic') => void;
  isGravity: boolean;
  onToggleGravity: () => void;
}

const DamageCalculatorTemplate: React.FC<DamageCalculatorTemplateProps> = ({
  attackerPanel, defenderPanel, resultsPanel, activeWeather, onWeatherChange,
  isSpreadTarget, onSpreadTargetChange,
  isFairyAura, isDarkAura, isAuraBreak, onToggleFieldAura,
  activeTerrain, onTerrainChange,
  isGravity, onToggleGravity
}) => {
  const weatherOptions: ('None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow')[] = ['None', 'Sun', 'Rain', 'Sandstorm', 'Snow'];
  const terrainOptions: ('None' | 'Electric' | 'Grassy' | 'Misty' | 'Psychic')[] = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-12 text-center">
          <Typography variant="h1" className="mb-2">VGC Damage Calculator</Typography>
          <Typography variant="body" className="text-ink-3">Custom "SP" Stat System Implementation</Typography>
        </header>

        <div className="flex flex-col gap-8">
          {/* Top Section: Results */}
          <div className="w-full">
            {resultsPanel}
          </div>

          {/* Middle Section: Field Conditions */}
          <div className="w-full bg-card p-6 rounded-2xl border border-line flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[9px] font-black">Field Weather</Typography>
              <div className="flex bg-inset p-1 rounded-xl gap-1 border border-line">
                {weatherOptions.map(w => (
                  <button
                    key={w}
                    onClick={() => onWeatherChange(w)}
                    className={`
                      px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                      ${activeWeather === w
                        ? 'bg-field-soft text-field border border-field-line'
                        : 'text-ink-3 hover:text-ink-1'}
                    `}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[9px] font-black">Target Mode</Typography>
              <div className="flex bg-inset p-1 rounded-xl gap-1 border border-line">
                <button
                  onClick={() => onSpreadTargetChange(false)}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${!isSpreadTarget
                      ? 'bg-accent-soft text-accent border border-accent-soft-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Single
                </button>
                <button
                  onClick={() => onSpreadTargetChange(true)}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isSpreadTarget
                      ? 'bg-accent-soft text-accent border border-accent-soft-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Spread
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[9px] font-black">Field Auras</Typography>
              <div className="flex bg-inset p-1 rounded-xl gap-1 border border-line">
                <button
                  onClick={() => onToggleFieldAura('isFairyAura')}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isFairyAura
                      ? 'bg-field-soft text-field border border-field-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Fairy
                </button>
                <button
                  onClick={() => onToggleFieldAura('isDarkAura')}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isDarkAura
                      ? 'bg-field-soft text-field border border-field-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Dark
                </button>
                <button
                  onClick={() => onToggleFieldAura('isAuraBreak')}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isAuraBreak
                      ? 'bg-field-soft text-field border border-field-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Break
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[9px] font-black">Field Terrain</Typography>
              <div className="flex bg-inset p-1 rounded-xl gap-1 border border-line">
                {terrainOptions.map(t => (
                  <button
                    key={t}
                    onClick={() => onTerrainChange(t)}
                    className={`
                      px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                      ${activeTerrain === t
                        ? 'bg-field-soft text-field border border-field-line'
                        : 'text-ink-3 hover:text-ink-1'}
                    `}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Typography variant="label" className="text-ink-3 uppercase tracking-widest text-[9px] font-black">Field Gravity</Typography>
              <div className="flex bg-inset p-1 rounded-xl gap-1 border border-line">
                <button
                  onClick={onToggleGravity}
                  className={`
                    px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                    ${isGravity
                      ? 'bg-field-soft text-field border border-field-line'
                      : 'text-ink-3 hover:text-ink-1'}
                  `}
                >
                  Active
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
              <div className="p-6 bg-card rounded-2xl border border-line text-sm text-ink-2">
                <h4 className="font-bold mb-2 uppercase tracking-widest text-[10px]">Stat Formulas</h4>
                <div className="space-y-1 font-medium font-mono">
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
