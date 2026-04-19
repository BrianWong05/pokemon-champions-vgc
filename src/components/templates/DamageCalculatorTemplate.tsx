import React from 'react';
import Typography from '@/components/atoms/Typography';

interface DamageCalculatorTemplateProps {
  attackerPanel: React.ReactNode;
  defenderPanel: React.ReactNode;
  resultsPanel: React.ReactNode;
}

const DamageCalculatorTemplate: React.FC<DamageCalculatorTemplateProps> = ({
  attackerPanel, defenderPanel, resultsPanel
}) => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-12 text-center">
          <Typography variant="h1" className="mb-2">VGC Damage Calculator</Typography>
          <Typography variant="body" className="text-gray-500">Custom "SP" Stat System Implementation</Typography>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1">{attackerPanel}</div>
          <div className="lg:col-span-1">{defenderPanel}</div>
          <div className="lg:col-span-1 space-y-8 sticky top-8">
            {resultsPanel}
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-800">
              <h4 className="font-bold mb-2">Stat Formulas</h4>
              <p>HP = Base + 75 + SP</p>
              <p>Stats = floor((Base + 20 + SP) * Nature)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamageCalculatorTemplate;
