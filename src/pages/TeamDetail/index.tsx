import React from 'react';
import { useParams, Link } from 'react-router-dom';
import TeamMemberEditorModal from '@/components/organisms/TeamMemberEditorModal';
import TeamExportModal from '@/components/organisms/TeamExportModal';
import ShowdownExportModal from '@/components/organisms/ShowdownExportModal';
import TeamShowdownImportModal from '@/components/organisms/TeamShowdownImportModal';
import ShowdownImportModal from '@/components/organisms/ShowdownImportModal';

import { useTeamDetail } from '@/features/teams/hooks/useTeamDetail';
import { TeamHeader } from '@/features/teams/components/TeamHeader';
import { TeamMemberGrid } from '@/features/teams/components/TeamMemberGrid';
import { useToast } from '@/hooks/useToast';
import { ToastNotification } from '@/components/atoms/ToastNotification';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArenaTeamDetail } from '@/features/teams/components/mobile/ArenaTeamDetail';

const TeamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const {
    team,
    loading,
    error,
    pokemonList,
    moveList,
    modals,
    currentConfig,
    exportText,
    handleAddPokemonClick,
    handleEditPokemonClick,
    handleSaveMember,
    handleRenameTeam,
    handleExportIndividual,
    handleRemovePokemon,
    handleImportTeamShowdown,
    handleImportSingleShowdown
  } = useTeamDetail(id);

  const isMobile = useIsMobile();

  if (loading) {
    return <div className="container mx-auto p-4 max-w-4xl text-center text-ink-2">Loading team...</div>;
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-danger mb-4">Error: {error || 'Team not found'}</div>
        <Link to="/teams" className="text-accent hover:text-accent-hover">&larr; Back to Teams</Link>
      </div>
    );
  }

  const modalsFragment = (
    <>
      <TeamMemberEditorModal
        isOpen={modals.isModalOpen('editor')}
        onClose={() => modals.closeModal('editor')}
        onSave={handleSaveMember}
        initialConfig={currentConfig}
        pokemonList={pokemonList}
        moveList={moveList}
      />

      <TeamExportModal
        isOpen={modals.isModalOpen('export')}
        onClose={() => modals.closeModal('export')}
        teamName={team.name}
        members={team.members.map(m => ({
          configuration: m.configuration,
          speciesName: pokemonList.find(p => p.id === m.configuration.selectedId)?.nameEn || 'Unknown'
        }))}
      />

      <ShowdownExportModal
        isOpen={modals.isModalOpen('exportSingle')}
        onClose={() => modals.closeModal('exportSingle')}
        exportText={exportText}
      />

      <TeamShowdownImportModal
        isOpen={modals.isModalOpen('importTeam')}
        onClose={() => modals.closeModal('importTeam')}
        onImport={handleImportTeamShowdown}
      />

      <ShowdownImportModal
        isOpen={modals.isModalOpen('importSingle')}
        onClose={() => modals.closeModal('importSingle')}
        onImport={handleImportSingleShowdown}
      />
      <ToastNotification message={toast} />
    </>
  );

  if (isMobile) {
    return (
      <>
        <ArenaTeamDetail
          team={team}
          pokemonList={pokemonList}
          onRename={handleRenameTeam}
          onExportTeam={() => modals.openModal('export')}
          onImportTeam={() => modals.openModal('importTeam')}
          onAdd={() => modals.openModal('editor')}
          onImportSingle={() => modals.openModal('importSingle')}
          onEdit={handleEditPokemonClick}
          onExportMember={handleExportIndividual}
          onRemove={handleRemovePokemon}
        />
        {modalsFragment}
      </>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="mb-8">
        <Link to="/teams" className="text-accent hover:text-accent-hover mb-4 inline-block font-semibold">
          &larr; Back to Teams
        </Link>
        <TeamHeader
          team={team}
          onRenameTeam={handleRenameTeam}
          onExportTeam={() => modals.openModal('export')}
          onImportTeam={() => modals.openModal('importTeam')}
        />
      </div>

      <TeamMemberGrid
        team={team}
        pokemonList={pokemonList}
        onEditPokemon={handleEditPokemonClick}
        onExportIndividual={handleExportIndividual}
        onRemovePokemon={handleRemovePokemon}
        onAddPokemon={handleAddPokemonClick}
        onImportSingle={() => modals.openModal('importSingle')}
      />

      {modalsFragment}
    </div>
  );
};

export default TeamDetailPage;
