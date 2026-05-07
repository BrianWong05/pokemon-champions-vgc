import React, { useEffect } from 'react';
import Modal from '@/components/atoms/Modal';
import PokemonConfigForm from './PokemonConfigForm';
import { usePokemonEditor, PokemonConfig } from '@/hooks/usePokemonEditor';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { PokemonPreset } from '@/utils/pokemon-presets';

interface TeamMemberEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PokemonConfig) => void;
  initialConfig?: PokemonConfig | null;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
}

const TeamMemberEditorModal: React.FC<TeamMemberEditorModalProps> = ({
  isOpen, onClose, onSave, initialConfig, pokemonList, moveList
}) => {
  const { 
    state, handleSelectPokemon, handleSelectPreset, setSp, toggleNature, 
    setItem, setAbility, setMove, clearMove, setType, toggleTypeOverride, loadConfig 
  } = usePokemonEditor();

  useEffect(() => {
    if (isOpen && initialConfig) {
      loadConfig(initialConfig);
    }
  }, [isOpen, initialConfig, loadConfig]);

  const handleSave = () => {
    onSave(state);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialConfig?.selectedId ? "Edit Pokemon" : "Add Pokemon"}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        <PokemonConfigForm
          config={state}
          pokemonList={pokemonList}
          moveList={moveList}
          onSelectPokemon={handleSelectPokemon}
          onSelectPreset={(preset) => handleSelectPreset(preset, pokemonList, moveList)}
          onSpChange={setSp}
          onToggleNature={toggleNature}
          onSelectMove={setMove}
          onClearMove={clearMove}
          onAbilityChange={setAbility}
          onItemChange={setItem}
          onTypeChange={setType}
          onToggleTypeOverride={toggleTypeOverride}
        />
        
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!state.selectedId}
            className="px-8 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialConfig?.selectedId ? "Save Changes" : "Add to Team"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TeamMemberEditorModal;
