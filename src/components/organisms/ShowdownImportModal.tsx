import React, { useState } from 'react';
import Modal from '@/components/atoms/Modal';
import { parseShowdownSet, ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';

interface ShowdownImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (set: ParsedShowdownSet) => void;
}

const ShowdownImportModal: React.FC<ShowdownImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = () => {
    setError(null);
    const parsed = parseShowdownSet(text);
    if (!parsed) {
      setError('Could not parse Showdown set. Please check the format.');
      return;
    }
    onImport(parsed);
    setText('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Showdown Set" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Amoonguss @ Sitrus Berry&#10;Ability: Regenerator&#10;Level: 50&#10;SPs: 32 HP / 20 Def / 13 SpD&#10;Quiet Nature&#10;- Spore&#10;- Rage Powder&#10;- Pollen Puff&#10;- Protect"
          className="w-full h-64 p-4 font-mono bg-inset border-line-2 text-ink-1 rounded-xl focus:ring-2 focus:ring-accent outline-none text-sm"
        />
        {error && <p className="text-danger text-sm font-bold">{error}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
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
            Import
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShowdownImportModal;
