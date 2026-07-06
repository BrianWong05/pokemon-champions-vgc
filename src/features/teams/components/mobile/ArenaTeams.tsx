import React, { useState } from 'react';
import { Card, Badge, Button, Icon, Sprite, ItemIcon, Sheet, type IconName } from '@/design-system/arena';
import type { TeamWithMembers } from '@/features/teams/hooks/useTeams';

export interface ArenaTeamsProps {
  teams: TeamWithMembers[];
  loading: boolean;
  error: string | null;
  onCreate: (name: string) => void;          // page's createTeam-and-navigate
  onImport: () => void;                       // opens existing TeamShowdownImportModal
  onScan: () => void;                         // opens existing ScanTeamModal
  onOpen: (id: string) => void;               // navigate to /teams/:id
  onExport: (team: TeamWithMembers) => void;  // opens existing TeamExportModal
  onDelete: (id: string, name: string) => void;
}

const MemberSprite: React.FC<{ dex: number | null; item: string | null }> = ({ dex, item }) => (
  <div style={{ position: 'relative', width: 44, flex: '0 0 auto' }}>
    <Sprite dex={dex} size={44} />
    <span style={{ position: 'absolute', right: -4, bottom: -4 }}>
      <ItemIcon item={item} size={16} />
    </span>
  </div>
);

const TeamCard: React.FC<{
  team: TeamWithMembers;
  onOpen: () => void; onExport: () => void; onDelete: () => void;
}> = ({ team, onOpen, onExport, onDelete }) => {
  const footerActions: { label: string; icon: IconName; tone: string; onClick: () => void }[] = [
    { label: 'Edit', icon: 'pencil', tone: 'var(--ink-2)', onClick: onOpen },
    { label: 'Export', icon: 'share', tone: 'var(--ink-2)', onClick: onExport },
    { label: 'Delete', icon: 'trash-2', tone: 'var(--danger)', onClick: onDelete },
  ];

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-3)' }} onClick={onOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Created {team.createdAt.toLocaleDateString()}</div>
          </div>
          <Badge tone={team.members.length === 6 ? 'accent' : 'neutral'} solid={team.members.length === 6}>{team.members.length} / 6</Badge>
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
          {team.members.slice(0, 6).map((m) => (
            <MemberSprite key={m.id} dex={m.configuration.selectedId} item={m.configuration.item} />
          ))}
          {team.members.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>Empty team</span>
          )}
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

export const ArenaTeams: React.FC<ArenaTeamsProps> = ({
  teams, loading, error, onCreate, onImport, onScan, onOpen, onExport, onDelete,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const submit = () => { if (name.trim()) { onCreate(name.trim()); setName(''); setCreateOpen(false); } };

  if (loading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading teams…</div>;
  if (error) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Button variant="primary" block icon={<Icon name="plus" size={18} />} onClick={() => setCreateOpen(true)}>Create new team</Button>
        <Button variant="secondary" icon={<Icon name="clipboard-paste" size={16} />} onClick={onImport}>Import</Button>
        <Button variant="secondary" icon={<Icon name="search" size={16} />} onClick={onScan}>Scan</Button>
      </div>

      {teams.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', gap: 6 }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'var(--surface-card)', border: '1px solid var(--line-2)', display: 'grid', placeItems: 'center', marginBottom: 10 }}>
            <Icon name="users-round" size={30} color="var(--accent)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink-1)' }}>No teams yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 240 }}>
            Build your first team to start running damage calcs and checking speed tiers.
          </div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 240 }}>
            <Button variant="primary" size="lg" block icon={<Icon name="plus" size={18} />} onClick={() => setCreateOpen(true)}>Create new team</Button>
            <Button variant="secondary" block icon={<Icon name="clipboard-paste" size={16} />} onClick={onImport}>Import from Showdown</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} onOpen={() => onOpen(t.id)} onExport={() => onExport(t)} onDelete={() => onDelete(t.id, t.name)} />
          ))}
        </div>
      )}

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Create team">
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
          <Button variant="primary" block disabled={!name.trim()} onClick={submit}>Create</Button>
        </div>
      </Sheet>
    </div>
  );
};
