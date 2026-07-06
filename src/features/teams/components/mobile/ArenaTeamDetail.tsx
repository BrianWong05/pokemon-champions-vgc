import React, { useState } from 'react';
import { Card, Badge, Button, Icon, Sprite, ItemIcon, TypeBadge, Sheet, type IconName } from '@/design-system/arena';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { ArenaPokemonPicker } from '@/features/damage-calculator/components/mobile/ArenaPokemonPicker';

export interface ArenaTeamDetailProps {
  team: TeamWithMembers;
  pokemonList: PokemonBaseStats[];
  onRename: (newName: string) => Promise<void>;
  onExportTeam: () => void;
  onImportTeam: () => void;
  onAdd: (p: PokemonBaseStats) => void; // handleAddPokemonClick — resets edit state, builds config, opens editor
  onImportSingle: () => void;
  onEdit: (index: number) => void;
  onExportMember: (index: number) => void;
  onRemove: (orderToRemove: number) => void;
}

const MemberCard: React.FC<{
  member: TeamWithMembers['members'][number];
  speciesName: string;
  onEdit: () => void; onExport: () => void; onRemove: () => void;
}> = ({ member, speciesName, onEdit, onExport, onRemove }) => {
  const { configuration: c } = member;
  const footerActions: { label: string; icon: IconName; tone: string; onClick: () => void }[] = [
    { label: 'Edit', icon: 'pencil', tone: 'var(--ink-2)', onClick: onEdit },
    { label: 'Export', icon: 'share', tone: 'var(--ink-2)', onClick: onExport },
    { label: 'Remove', icon: 'trash-2', tone: 'var(--danger)', onClick: onRemove },
  ];

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--sp-4)' }} onClick={onEdit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Sprite dex={c.selectedId} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{speciesName}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <TypeBadge type={c.type1 || 'normal'} size="sm" />
              {c.type2 && <TypeBadge type={c.type2} size="sm" />}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Item</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ItemIcon item={c.item} size={16} />
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{c.item || 'None'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Ability</span>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{c.activeAbility || 'None'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Nature</span>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{c.nature}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {c.moves.map((move, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--ink-2)', background: 'var(--surface-inset)', border: '1px solid var(--line-1)', borderRadius: 'var(--r-xs)', padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {move?.nameEn || '—'}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--line-1)' }}>
        {footerActions.map((a, i) => (
          <button key={a.label} onClick={a.onClick} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            height: 46, background: 'transparent', border: 'none',
            borderLeft: i ? '1px solid var(--line-1)' : 'none', cursor: 'pointer',
            color: a.tone, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700,
          }}>
            <Icon name={a.icon} size={15} color={a.tone} />{a.label}
          </button>
        ))}
      </div>
    </Card>
  );
};

export const ArenaTeamDetail: React.FC<ArenaTeamDetailProps> = ({
  team, pokemonList, onRename, onExportTeam, onImportTeam, onAdd, onImportSingle, onEdit, onExportMember, onRemove,
}) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const openRename = () => { setName(team.name); setRenameOpen(true); };
  const submit = () => { if (name.trim()) { onRename(name.trim()); setRenameOpen(false); } };
  const full = team.members.length === 6;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.name}
          </div>
          <button onClick={openRename} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, display: 'grid', placeItems: 'center' }}>
            <Icon name="pencil" size={16} color="var(--ink-3)" />
          </button>
          <Badge tone={full ? 'accent' : 'neutral'} solid={full}>{team.members.length} / 6</Badge>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 12 }}>Created {team.createdAt.toLocaleDateString()}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" block icon={<Icon name="share" size={16} />} onClick={onExportTeam}>Export</Button>
          <Button variant="secondary" block icon={<Icon name="clipboard-paste" size={16} />} onClick={onImportTeam}>Import</Button>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {team.members.map((member, idx) => (
          <MemberCard
            key={member.id}
            member={member}
            speciesName={pokemonList.find(p => p.id === member.configuration.selectedId)?.nameEn ?? 'Unknown'}
            onEdit={() => onEdit(idx)}
            onExport={() => onExportMember(idx)}
            onRemove={() => onRemove(member.order)}
          />
        ))}
      </div>

      {!full && (
        <>
          <Button variant="secondary" block icon={<Icon name="plus" size={18} />} onClick={() => setPickerOpen(true)}>Add member</Button>
          <Button variant="ghost" block onClick={onImportSingle}>Import from Showdown</Button>
        </>
      )}

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add member" height="80vh">
        <ArenaPokemonPicker
          pokemonList={pokemonList}
          onSelect={(p) => { onAdd(p); setPickerOpen(false); }}
        />
      </Sheet>

      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename team">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Team name"
            style={{
              height: 44, padding: '0 12px', borderRadius: 'var(--r-sm)',
              background: 'var(--surface-inset)', border: '1px solid var(--border-input)',
              color: 'var(--ink-1)', fontFamily: 'var(--font-ui)', fontSize: 15, outline: 'none',
            }}
          />
          <Button variant="primary" block disabled={!name.trim()} onClick={submit}>Save</Button>
        </div>
      </Sheet>
    </div>
  );
};
