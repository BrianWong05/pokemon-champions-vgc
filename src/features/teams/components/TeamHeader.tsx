import React, { useState } from 'react';
import { TeamWithMembers } from '@/db/repositories/team.repo';

interface TeamHeaderProps {
  team: TeamWithMembers;
  onRenameTeam: (newName: string) => Promise<void>;
  onExportTeam: () => void;
  onImportTeam: () => void;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({ team, onRenameTeam, onExportTeam, onImportTeam }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(team.name);

  const handleRename = async () => {
    if (editedName.trim() && editedName !== team.name) {
      await onRenameTeam(editedName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex justify-between items-end bg-card p-6 rounded-xl border border-line">
      <div>
        <div className="flex items-center gap-4 mb-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="text-4xl font-black text-ink-1 bg-inset border border-line-2 rounded-xl px-4 py-1 outline-none focus:ring-2 focus:ring-accent/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <button
                onClick={handleRename}
                className="bg-accent text-accent-ink p-2 rounded-xl hover:bg-accent-hover transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="bg-inset text-ink-3 p-2 rounded-xl hover:bg-raise transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-black text-ink-1">{team.name}</h1>
              <button
                onClick={() => {
                  setEditedName(team.name);
                  setIsEditingName(true);
                }}
                className="p-2 text-ink-4 hover:text-accent hover:bg-accent-soft rounded-xl transition-all"
                title="Rename Team"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onExportTeam}
              className="text-[10px] font-black text-accent hover:text-accent-hover uppercase tracking-widest bg-accent-soft hover:bg-accent-soft-hover px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export team
            </button>
            <button
              onClick={onImportTeam}
              className="text-[10px] font-black text-accent hover:text-accent-hover uppercase tracking-widest bg-accent-soft hover:bg-accent-soft-hover px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import team
            </button>
          </div>
        </div>
        <p className="text-ink-4 font-medium">Created {team.createdAt.toLocaleDateString()}</p>
      </div>
      <div className="text-right">
        <div className="text-sm font-black text-ink-4 uppercase tracking-widest mb-2">
          {team.members.length} / 6 members
        </div>
        <div className="flex gap-1.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < team.members.length ? 'bg-accent' : 'bg-inset'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
