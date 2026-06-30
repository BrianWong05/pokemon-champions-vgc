import React, { useMemo, useState } from 'react';
import Modal from '@/components/atoms/Modal';
import PokemonImage from '@/components/atoms/PokemonImage';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import { useTeamScan } from './useTeamScan';
import { pickImage } from './capture';
import { toParsedSets } from './toParsedSets';

interface ScanTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sets: ParsedShowdownSet[]) => void;
  pokemonList: PokemonBaseStats[];
}

const ScanTeamModal: React.FC<ScanTeamModalProps> = ({ isOpen, onClose, onImport, pokemonList }) => {
  const legalIds = useMemo(() => new Set(pokemonList.map((p) => p.id)), [pokemonList]);
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const { status, slots, error, scan, reset } = useTeamScan(legalIds);
  // selectedIds[slotIndex] = chosen pokemon.id (defaults to each slot's top-1)
  const [selectedIds, setSelectedIds] = useState<(number | null)[]>([]);

  const startPick = async () => {
    const blob = await pickImage();
    if (blob) {
      await scan(blob);
    }
  };

  // When a scan completes, seed selections with each slot's top candidate.
  React.useEffect(() => {
    if (status === 'done') setSelectedIds(slots.map((s) => s.candidates[0]?.id ?? null));
  }, [status, slots]);

  const confirm = () => {
    const names = selectedIds
      .map((id) => (id != null ? byId.get(id)?.nameEn : undefined))
      .filter((n): n is string => !!n);
    if (names.length === 0) return;
    onImport(toParsedSets(names));
    handleClose();
  };

  const handleClose = () => { reset(); setSelectedIds([]); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan opponent team">
      <div className="space-y-4">
        {status === 'idle' && (
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startPick}>
            Choose screenshot
          </button>
        )}
        {status === 'scanning' && <p>Scanning…</p>}
        {status === 'error' && <p className="text-red-600">Scan failed: {error}</p>}

        {status === 'done' && slots.length === 0 && (
          <p className="text-amber-600">
            Couldn't find the opponent's 6 tiles. Make sure the team-select column is fully visible, then
            <button className="ml-1 underline" onClick={startPick}>try another image</button>.
          </p>
        )}

        {status === 'done' && slots.map((slot, i) => {
          const top = slot.candidates[0];
          const lowConfidence = !top || top.score < 0.6;
          const selectedName = selectedIds[i] != null ? byId.get(selectedIds[i]!)?.nameEn : undefined;
          return (
            <div key={i} className={`flex items-center gap-3 p-2 rounded ${lowConfidence ? 'bg-amber-50' : ''}`}>
              <span className="w-5 text-sm text-gray-500">{i + 1}</span>
              {selectedIds[i] != null && (
                <PokemonImage id={selectedIds[i]!} name={selectedName ?? 'pokemon'} className="w-10 h-10" />
              )}
              <div className="flex-1">
                <select
                  className="w-full border rounded p-1"
                  value={selectedIds[i] ?? ''}
                  onChange={(e) => {
                    const next = [...selectedIds];
                    next[i] = e.target.value === '' ? null : Number(e.target.value);
                    setSelectedIds(next);
                  }}
                >
                  {slot.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {byId.get(c.id)?.nameEn ?? `#${c.id}`} ({Math.round(c.score * 100)}%)
                    </option>
                  ))}
                </select>
                <PokemonSearchSelect
                  label="Override"
                  pokemonList={pokemonList}
                  selectedPokemonName={selectedName}
                  onSelect={(p) => {
                    const next = [...selectedIds];
                    next[i] = p.id;
                    setSelectedIds(next);
                  }}
                />
              </div>
            </div>
          );
        })}

        {status === 'done' && slots.length > 0 && (
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded border" onClick={handleClose}>Cancel</button>
            <button className="px-4 py-2 rounded bg-green-600 text-white" onClick={confirm}>Create team</button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ScanTeamModal;
