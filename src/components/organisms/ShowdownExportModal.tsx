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
          className="w-full h-64 p-4 border border-gray-200 rounded-xl bg-gray-50 font-mono text-sm outline-none"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className={`px-8 py-2 rounded-xl transition-all font-bold shadow-sm ${
              copied ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'
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
