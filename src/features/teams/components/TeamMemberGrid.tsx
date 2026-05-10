import React, { useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import ItemImage from '@/components/atoms/ItemImage';
import TypeBadge from '@/components/molecules/TypeBadge';
import Typography from '@/components/atoms/Typography';
import TeamMemberStatDisplay from '@/components/molecules/TeamMemberStatDisplay';
import PokemonSearchSelect, { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { TeamWithMembers } from '@/db/repositories/team.repo';

interface TeamMemberGridProps {
  team: TeamWithMembers;
  pokemonList: PokemonBaseStats[];
  onEditPokemon: (index: number) => void;
  onExportIndividual: (index: number) => void;
  onRemovePokemon: (orderToRemove: number) => void;
  onAddPokemon: (p: PokemonBaseStats) => void;
  onImportSingle: () => void;
}

export const TeamMemberGrid: React.FC<TeamMemberGridProps> = ({
  team,
  pokemonList,
  onEditPokemon,
  onExportIndividual,
  onRemovePokemon,
  onAddPokemon,
  onImportSingle,
}) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
      {team.members.map((member, idx) => (
        <div key={member.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col group transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="p-5 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden shrink-0">
                <PokemonImage id={member.configuration.selectedId!} name={member.configuration.selectedId?.toString() || ''} className="w-12 h-12" />
              </div>
              <div className="flex flex-col items-end">
                <div className="flex gap-1">
                  <TypeBadge type={member.configuration.type1 || 'normal'} size="sm" />
                  {member.configuration.type2 && <TypeBadge type={member.configuration.type2} size="sm" />}
                </div>
              </div>
            </div>

            <h3 className="font-black text-xl text-gray-800 mb-1 truncate">
              {pokemonList.find(p => p.id === member.configuration.selectedId)?.nameEn || 'Unknown'}
            </h3>
            
            <div className="space-y-1.5 text-xs font-bold text-gray-500 mb-4">
              <div className="flex justify-between items-center">
                <span className="uppercase tracking-tighter">Item:</span>
                <div className="flex items-center gap-1.5">
                  {member.configuration.item && member.configuration.item !== 'None' && (
                    <div className="w-5 h-5 flex items-center justify-center bg-gray-50 rounded-md border border-gray-100 overflow-hidden shrink-0">
                      <ItemImage name={member.configuration.item} className="w-4 h-4 object-contain" />
                    </div>
                  )}
                  <span className="text-blue-600">{member.configuration.item || 'None'}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="uppercase tracking-tighter">Ability:</span>
                <span className="text-indigo-600">{member.configuration.activeAbility || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase tracking-tighter">Nature:</span>
                <span className="text-amber-600">{member.configuration.nature}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-50 mb-4">
              {member.configuration.moves.map((move, mIdx) => (
                <div key={mIdx} className="text-[10px] font-black text-gray-400 truncate bg-gray-50 px-2 py-1 rounded-lg">
                  {move?.nameEn || '-'}
                </div>
              ))}
            </div>

            <TeamMemberStatDisplay config={member.configuration} pokemonList={pokemonList} />
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between gap-2">
            <div className="flex gap-4">
              <button
                onClick={() => onEditPokemon(idx)}
                className="text-blue-600 hover:text-blue-800 font-black text-xs uppercase tracking-widest transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onExportIndividual(idx)}
                className="text-purple-600 hover:text-purple-800 font-black text-xs uppercase tracking-widest transition-colors"
              >
                Export
              </button>
            </div>
            <button
              onClick={() => onRemovePokemon(member.order)}
              className="text-red-400 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {team.members.length < 6 && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px] transition-colors hover:border-blue-300 group relative">
          <div className="flex flex-col items-center gap-4 w-full mb-4">
            <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[10px] font-black">
              Add New Member
            </Typography>
            <button
              onClick={onImportSingle}
              className="text-[10px] font-black text-purple-500 hover:text-purple-600 uppercase tracking-widest bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import Showdown
            </button>
          </div>
          <div className="w-full">
             <PokemonSearchSelect 
              label="" 
              pokemonList={pokemonList} 
              onSelect={onAddPokemon}
            />
          </div>
          <div className="mt-6 text-center text-gray-300 group-hover:text-blue-400 transition-colors">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-bold">Search to add</p>
          </div>
        </div>
      )}
    </div>
  );
};
