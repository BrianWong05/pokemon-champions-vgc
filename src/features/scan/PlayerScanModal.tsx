import React from 'react';
import Modal from '@/components/atoms/Modal';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import PlayerScanPanel from './PlayerScanPanel';
import type { PlayerTeamScanDeps } from './usePlayerTeamScan';

interface PlayerScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  onSave: (members: PokemonConfig[]) => void;
  /** test-only affordance: inject fake usePlayerTeamScan deps instead of the real DEFAULT_PLAYER_DEPS */
  deps?: PlayerTeamScanDeps;
}

/** PlayerScanModal — the "scan my team" panel in a Modal, for the portrait Teams flow. */
const PlayerScanModal: React.FC<PlayerScanModalProps> = ({ isOpen, onClose, pokemonList, moveList, onSave, deps }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Scan my team" maxWidth="max-w-4xl">
    <PlayerScanPanel active={isOpen} pokemonList={pokemonList} moveList={moveList} onSave={onSave} onCancel={onClose} deps={deps} />
  </Modal>
);

export default PlayerScanModal;
