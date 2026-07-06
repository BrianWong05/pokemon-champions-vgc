import React, { useState } from 'react';
import Modal from '@/components/atoms/Modal';
import { parseShowdownTeam, ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { fetchTeamFromUrl } from '@/services/paste-fetcher';

interface TeamShowdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sets: ParsedShowdownSet[]) => void;
}

const TeamShowdownImportModal: React.FC<TeamShowdownImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const handleImport = () => {
    setError(null);
    const sets = parseShowdownTeam(text);
    if (sets.length === 0) {
      setError('Could not parse any Pokémon from the provided text. Please check the format.');
      return;
    }
    onImport(sets);
    setText('');
    setUrl('');
    onClose();
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    
    setError(null);
    setIsFetching(true);
    try {
      const result = await fetchTeamFromUrl(url);
      setText(result.text);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch team from URL.');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Team from Showdown / URL" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="bg-accent-soft border border-accent-soft-line p-3 rounded-xl space-y-2">
          <p className="text-xs text-accent font-medium leading-relaxed">
            Paste your Pokémon Showdown team export below, or enter a URL from <strong>Pokepaste</strong> or <strong>Victory Road</strong>.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://pokepast.es/xxxxx or https://www.vrpastes.com/xxxxx"
              className="flex-1 px-3 py-2 bg-card border border-accent-soft-line rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent placeholder:text-ink-4"
            />
            <button
              onClick={handleFetchUrl}
              disabled={isFetching || !url.trim()}
              className="px-4 py-2 bg-accent text-accent-ink rounded-lg text-xs font-black uppercase tracking-widest hover:bg-accent-hover disabled:opacity-50 transition-colors shrink-0"
            >
              {isFetching ? 'Fetching...' : 'Fetch URL'}
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Incineroar @ Figy Berry\nAbility: Intimidate\nLevel: 50\nSPs: 32 HP / 32 Atk / 4 Spe\nAdamant Nature\n- Fake Out\n- Flare Blitz\n- Knock Off\n- Parting Shot\n\nAmoonguss @ Sitrus Berry\nAbility: Regenerator\nLevel: 50\nSPs: 32 HP / 20 Def / 13 SpD\nQuiet Nature\n- Spore\n- Rage Powder\n- Pollen Puff\n- Protect`}
          className="w-full h-80 p-4 font-mono bg-inset border-line-2 text-ink-1 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm leading-tight"
        />

        {error && <p className="text-danger text-sm font-bold bg-danger-soft p-2 rounded-lg">{error}</p>}

        <div className="flex justify-between items-center pt-4 border-t border-line">
          <span className="text-xs font-black text-ink-4 uppercase tracking-widest">
            {text.trim() ? `${parseShowdownTeam(text).length} Pokémon detected` : 'Waiting for input...'}
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-ink-3 hover:bg-raise rounded-xl transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!text.trim()}
              className="px-8 py-2 bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
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
