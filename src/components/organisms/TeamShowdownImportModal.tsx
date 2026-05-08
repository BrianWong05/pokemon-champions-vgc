import React, { useState } from 'react';
import Modal from '@/components/atoms/Modal';
import { parseShowdownTeam, ParsedShowdownSet } from '@/utils/showdown-parser';

interface TeamShowdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sets: ParsedShowdownSet[]) => void;
}

const TeamShowdownImportModal: React.FC<TeamShowdownImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    const sets = parseShowdownTeam(text);
    if (sets.length === 0) {
      setError('Could not parse any Pokémon from the provided text. Please check the format.');
      return;
    }
    onImport(sets);
    setText('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Team from Showdown" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            Paste your Pokémon Showdown team export here. Each Pokémon should be separated by an empty line.
            Up to 6 Pokémon will be imported into the team.
          </p>
        </div>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Incineroar @ Figy Berry\nAbility: Intimidate\nLevel: 50\nSPs: 32 HP / 32 Atk / 4 Spe\nAdamant Nature\n- Fake Out\n- Flare Blitz\n- Knock Off\n- Parting Shot\n\nAmoonguss @ Sitrus Berry\nAbility: Regenerator\nLevel: 50\nSPs: 32 HP / 20 Def / 13 SpD\nQuiet Nature\n- Spore\n- Rage Powder\n- Pollen Puff\n- Protect`}
          className="w-full h-80 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm leading-tight"
        />
        
        {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {text.trim() ? `${parseShowdownTeam(text).length} Pokémon detected` : 'Waiting for input...'}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!text.trim()}
              className="px-8 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              Import Team
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TeamShowdownImportModal;
