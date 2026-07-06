import React from 'react';
import Modal from '@/components/atoms/Modal';

interface ShowdownExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportText: string;
}

const ShowdownExportModal: React.FC<ShowdownExportModalProps> = ({ isOpen, onClose, exportText }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Showdown Set" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <textarea
          readOnly
          value={exportText}
          className="w-full h-64 p-4 font-mono bg-inset border-line-2 text-ink-1 rounded-xl text-sm outline-none"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-line">
          <button
            onClick={onClose}
            className="px-6 py-2 text-ink-3 hover:bg-raise rounded-xl transition-colors font-semibold"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className={`px-8 py-2 rounded-xl transition-all font-bold ${
              copied ? 'bg-safe-soft text-safe' : 'bg-accent text-accent-ink hover:bg-accent-hover'
            }`}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ShowdownExportModal;
