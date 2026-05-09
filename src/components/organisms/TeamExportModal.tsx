import React, { useState } from 'react';
import Modal from '@/components/atoms/Modal';
import { formatShowdownTeam } from '@/features/pokemon/utils/showdown-formatter';
import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

interface TeamExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  members: { configuration: PokemonConfig; speciesName: string }[];
}

const TeamExportModal: React.FC<TeamExportModalProps> = ({ isOpen, onClose, teamName, members }) => {
  const [copied, setCopied] = useState(false);
  const showdownText = formatShowdownTeam(members);

  const handleCopy = () => {
    navigator.clipboard.writeText(showdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Export ${teamName}`} maxWidth="max-w-xl">
      <div className="space-y-4">
        <textarea
          readOnly
          value={showdownText}
          className="w-full h-96 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg text-white font-bold transition-colors ${
              copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TeamExportModal;
