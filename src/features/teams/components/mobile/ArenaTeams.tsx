import React from 'react';
import { Card, Badge, Button, Icon, Sprite, ItemIcon, type IconName } from '@/design-system/arena';
import type { TeamWithMembers } from '@/features/teams/hooks/useTeams';

export interface ArenaTeamsProps {
  teams: TeamWithMembers[];
  loading: boolean;
  error: string | null;
  onNew: () => void;                          // opens the full-screen ArenaAddTeam (paste / scan)
  onOpen: (id: string) => void;               // navigate to /teams/:id (edit)
  onExport: (team: TeamWithMembers) => void;  // opens TeamExportModal
  onDelete: (id: string, name: string) => void;
}

const relativeDate = (d: Date): string => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return d.toLocaleDateString();
};

const MemberSprite: React.FC<{ dex: number | null; item: string | null }> = ({ dex, item }) => (
  <div style={{ position: 'relative', width: 40, height: 40, flex: '0 0 auto' }}>
    <Sprite dex={dex} size={40} />
    <span style={{ position: 'absolute', right: -3, bottom: -3 }}><ItemIcon item={item} size={14} /></span>
  </div>
);

const EmptySlot: React.FC = () => (
  <div style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: 'var(--r-md)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)' }} />
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
  const n = team.members.length;

  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 'var(--sp-4) var(--sp-4) var(--sp-3)' }} onClick={onOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-h2)', fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{relativeDate(team.createdAt)}</div>
          </div>
          <Badge tone={n === 6 ? 'accent' : 'neutral'} solid={n === 6}>{n}</Badge>
        </div>
        {/* six slots — filled members + empty placeholders */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {Array.from({ length: 6 }, (_, i) => {
            const m = team.members[i];
            return m
              ? <MemberSprite key={m.id} dex={m.configuration.selectedId} item={m.configuration.item} />
              : <EmptySlot key={`empty-${i}`} />;
          })}
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

export const ArenaTeams: React.FC<ArenaTeamsProps> = ({ teams, loading, error, onNew, onOpen, onExport, onDelete }) => {
  if (loading) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--ink-3)', textAlign: 'center' }}>Loading teams…</div>;
  if (error) return <div style={{ padding: 'var(--sp-6) var(--gutter)', color: 'var(--danger)' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 'var(--sp-4) var(--gutter) var(--sp-7)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button variant="primary" icon={<Icon name="plus" size={18} />} onClick={onNew}>New team</Button>
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
          <div style={{ marginTop: 14, width: '100%', maxWidth: 240 }}>
            <Button variant="primary" size="lg" block icon={<Icon name="plus" size={18} />} onClick={onNew}>New team</Button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--accent)' }}>MY TEAMS</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)' }}>{teams.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} onOpen={() => onOpen(t.id)} onExport={() => onExport(t)} onDelete={() => onDelete(t.id, t.name)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
