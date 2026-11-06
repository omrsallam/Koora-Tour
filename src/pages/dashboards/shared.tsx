import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { ApprovalRequest, Role, User } from '../../types';
import { useStore, useLookup, ROLE_LABEL } from '../../store/store';
import { Avatar, Crest, usePageTitle } from '../../components/ui';
import { fmtDateTime, timeAgo } from '../../format';
import { score } from '../../data/derive';

export interface DashSection { id: string; label: string; icon: string; badge?: number; group?: string }

export function DashShell({ sections, active, onSelect, children, accent = '#1cc4bf' }: { sections: DashSection[]; active: string; onSelect: (id: string) => void; children: ReactNode; accent?: string }) {
  const { user } = useStore();
  usePageTitle(`${sections.find((s) => s.id === active)?.label ?? 'Dashboard'} · Dashboard`);
  let lastGroup: string | undefined;
  return (
    <div className="dash">
      <aside className="dash-side" aria-label="Dashboard sections">
        {user && (
          <div className="who">
            <Avatar name={user.name} size={40} color={accent} />
            <div><b>{user.name}</b><small>{ROLE_LABEL[user.role]}</small></div>
          </div>
        )}
        {sections.map((s) => {
          const label = s.group && s.group !== lastGroup ? <div className="side-label">{s.group}</div> : null;
          lastGroup = s.group;
          return (
            <div key={s.id} style={{ display: 'contents' }}>
              {label}
              <button className={active === s.id ? 'active' : ''} onClick={() => onSelect(s.id)}>
                <span><span aria-hidden="true" style={{ marginRight: 10 }}>{s.icon}</span>{s.label}</span>
                {!!s.badge && <span className="badge-count" style={{ position: 'static' }}>{s.badge}</span>}
              </button>
            </div>
          );
        })}
      </aside>
      <div className="dash-main">{children}</div>
    </div>
  );
}

export function RequireRole({ roles, children }: { roles: Role[]; children: (u: User) => ReactNode }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.suspended) return <div className="section"><div className="container"><div className="empty">Your account is suspended. Contact the God Admin.</div></div></div>;
  if (!roles.includes(user.role)) return <div className="section"><div className="container"><div className="empty">This dashboard is for {roles.map((r) => ROLE_LABEL[r]).join(' / ')} accounts. <Link to="/" className="link-btn">Go home</Link></div></div></div>;
  return <>{children(user)}</>;
}

export const TYPE_LABEL: Record<ApprovalRequest['type'], string> = {
  reschedule: 'Match reschedule',
  add_player: 'Add player',
  remove_player: 'Remove player',
  result: 'Result verification',
  fixture_change: 'Fixture change',
};

export function RequestCard({ r, actions, showRecommend }: { r: ApprovalRequest; actions?: ReactNode; showRecommend?: boolean }) {
  const { db } = useStore();
  const L = useLookup();
  const m = db.matches.find((x) => x.id === r.matchId);
  const by = L.user(r.createdBy);
  const team = L.team(r.teamId);
  const statusPill = { pending: 'pill-warn', approved: 'pill-ok', rejected: 'pill-danger', cancelled: 'pill-ghost' }[r.status];

  let body: ReactNode = null;
  if ((r.type === 'reschedule' || r.type === 'fixture_change') && m) {
    body = (
      <>
        <div className="row"><Crest team={L.team(m.homeId)} size={22} /><b>{L.team(m.homeId)?.name ?? m.homeLabel}</b> vs <b>{L.team(m.awayId)?.name ?? m.awayLabel}</b><Crest team={L.team(m.awayId)} size={22} /></div>
        <div className="req-diff">
          {r.payload.proposedKickoff && <><span className="from">{fmtDateTime(r.payload.originalKickoff ?? m.kickoff)}</span>→<span className="to">{fmtDateTime(r.payload.proposedKickoff)}</span></>}
          {r.payload.proposedVenueId && r.payload.proposedVenueId !== (r.payload.originalVenueId ?? m.venueId) && <><span className="from">{L.venue(r.payload.originalVenueId ?? m.venueId)?.name}</span>→<span className="to">{L.venue(r.payload.proposedVenueId)?.name}</span></>}
          {r.payload.kind && <span className="pill pill-cobalt">{r.payload.kind === 'delay' ? 'Delay' : 'Time change'}</span>}
        </div>
      </>
    );
  } else if (r.type === 'add_player' && r.payload.player) {
    const p = r.payload.player;
    body = <div className="req-diff"><span className="to">+ #{p.number} {p.name}</span><span className="muted">{p.position} · {p.nationality} · {p.age} yrs · {p.height}cm · {p.foot} foot</span></div>;
  } else if (r.type === 'remove_player') {
    const p = L.player(r.payload.playerId);
    body = <div className="req-diff"><span className="from" style={{ color: 'var(--danger)' }}>− #{p?.number} {p?.name}</span><span className="muted">{p?.position}</span></div>;
  } else if (r.type === 'result' && m) {
    const [h, a] = score(m);
    body = (
      <div className="req-diff">
        <Link to={`/matches/${m.id}`} className="row"><Crest team={L.team(m.homeId)} size={22} /><b style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>{L.team(m.homeId)?.short} {h} – {a} {L.team(m.awayId)?.short}</b><Crest team={L.team(m.awayId)} size={22} /></Link>
        <span className="muted small">{m.events.filter((e) => e.type !== 'sub').length} events logged · <Link to={`/matches/${m.id}`} className="link-btn">review timeline</Link></span>
      </div>
    );
  }

  return (
    <div className={`req ${r.status}`}>
      <div className="req-head">
        <div>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="req-title">{TYPE_LABEL[r.type]}</span>
            <span className={`pill ${statusPill}`}>{r.status}</span>
            {team && <span className="row small"><Crest team={team} size={18} />{team.name}</span>}
          </div>
          <div className="muted small">By {by?.name} ({by && ROLE_LABEL[by.role]}) · {timeAgo(r.createdAt)}</div>
        </div>
      </div>
      {body}
      <div className="reason">“{r.reason}”</div>
      {r.recommendations.map((rec) => (
        <div className="reco" key={rec.userId}>
          <b style={{ color: rec.verdict === 'support' ? 'var(--ok)' : 'var(--danger)' }}>{rec.verdict === 'support' ? '👍 Supports' : '👎 Opposes'}</b> — {L.user(rec.userId)?.name}: {rec.note}
        </div>
      ))}
      {showRecommend && r.recommendations.length === 0 && <div className="muted small">No organizer recommendations yet.</div>}
      {r.reviewedBy && (
        <div className="muted small" style={{ marginTop: 8 }}>Decided by {L.user(r.reviewedBy)?.name} {r.reviewedAt && timeAgo(r.reviewedAt)}{r.reviewNote ? ` — “${r.reviewNote}”` : ''}</div>
      )}
      {actions && <div style={{ marginTop: 12 }}>{actions}</div>}
    </div>
  );
}

export function DecisionBar({ onDecide, approveLabel = 'Approve', placeholder = 'Note for the requester (optional)', blocker, warning }: { onDecide: (approve: boolean, note: string) => void; approveLabel?: string; placeholder?: string; blocker?: string | null; warning?: string | null }) {
  const [note, setNote] = useState('');
  return (
    <>
      <div className="row wrap">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} style={{ flex: 1, minWidth: 200 }} aria-label="Decision note" />
        <button className="btn btn-ok btn-sm" onClick={() => onDecide(true, note)} disabled={!!blocker} title={blocker ?? undefined}>✓ {approveLabel}</button>
        <button className="btn btn-red btn-sm" onClick={() => onDecide(false, note)}>✕ Reject</button>
      </div>
      {blocker && <div className="req-blocker" role="note">Can't approve: {blocker}</div>}
      {!blocker && warning && <div className="req-warning" role="note">Heads up: {warning}</div>}
    </>
  );
}

export function DashTitle({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="dash-title">
      <div>{kicker && <div className="kicker">{kicker}</div>}<h1>{title}</h1></div>
      {children}
    </div>
  );
}
