// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamImportSelector } from './TeamImportSelector';

// Mock PokemonImage and ItemImage
vi.mock('@/components/atoms/PokemonImage', () => ({
  default: ({ id, className }: any) => <div data-testid="pokemon-image" data-id={id} className={className} />
}));

vi.mock('@/components/atoms/ItemImage', () => ({
  default: ({ name, className }: any) => <div data-testid="item-image" data-name={name} className={className} />
}));

// Mock useTeams hook
let mockTeams: any[] = [];
let mockLoading = false;

vi.mock('@/features/teams/hooks/useTeams', () => ({
  useTeams: () => ({
    teams: mockTeams,
    loading: mockLoading
  })
}));

describe('TeamImportSelector', () => {
  const mockPokemonList = [
    { id: 591, nameEn: 'Amoonguss', nameZh: '敗露球菇' },
    { id: 6, nameEn: 'Charizard', nameZh: '噴火龍' }
  ];

  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnClose.mockClear();
    mockTeams = [];
    mockLoading = false;
  });

  it('renders loading state when loading is true', () => {
    mockLoading = true;
    render(
      <TeamImportSelector 
        pokemonList={mockPokemonList}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('Loading teams...')).toBeDefined();
  });

  it('renders empty state when there are no teams', () => {
    render(
      <TeamImportSelector 
        pokemonList={mockPokemonList}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText('No teams found')).toBeDefined();
  });

  it('renders team select options and member list with resolved species name', () => {
    mockTeams = [
      {
        id: 'team-1',
        name: 'My VGC Team',
        members: [
          {
            id: 'member-1',
            configuration: {
              selectedId: 591,
              nature: 'Bold',
              activeAbility: 'Regenerator',
              item: 'Rocky Helmet'
            }
          }
        ]
      }
    ];

    render(
      <TeamImportSelector 
        pokemonList={mockPokemonList}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    // Verify team name is in selector option
    expect(screen.getByRole('option', { name: 'My VGC Team' })).toBeDefined();

    // Verify resolved species name is rendered
    expect(screen.getByText('敗露球菇 / Amoonguss')).toBeDefined();

    // Verify nature and ability are rendered as metadata
    expect(screen.getByText('Bold • Regenerator')).toBeDefined();
  });

  it('calls onSelect and onClose when a member is clicked', () => {
    const memberConfig = {
      selectedId: 6,
      nature: 'Jolly',
      activeAbility: 'Solar Power',
      item: 'Charizardite Y'
    };

    mockTeams = [
      {
        id: 'team-1',
        name: 'My VGC Team',
        members: [
          {
            id: 'member-2',
            configuration: memberConfig
          }
        ]
      }
    ];

    render(
      <TeamImportSelector 
        pokemonList={mockPokemonList}
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    const button = screen.getByRole('button', { name: /噴火龍 \/ Charizard/ });
    fireEvent.click(button);

    expect(mockOnSelect).toHaveBeenCalledWith(memberConfig);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
