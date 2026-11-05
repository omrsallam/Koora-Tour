import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Privilege, Role, User, Match } from '../../types';
import { useStore, useLookup, ROLE_LABEL } from '../../store/store';
import { ALL_PRIVILEGES, ROLE_PRESETS } from '../../data/seed';
import { Avatar, Crest, Empty, Modal, useFlash, StatusPill } from '../../components/ui';
import { DashShell, RequireRole, RequestCard, DecisionBar, DashTitle, TYPE_LABEL } from './shared';
import { fmtDateTime, timeAgo, toLocalInput, roundLabel } from '../../format';
import { score } from '../../data/derive';

const ROLES: Role[] = ['god', 'host', 'organizer', 'captain', 'player', 'fan'];

function UserEditor({ u, onClose }: { u: User; onClose: () => void }) {
  const { db, updateUser, user: me } = useStore();
  const [role, setRole] = useState<Role>(u.role);
  const [privs, setPrivs] = useState<Privilege[]>(u.privileges);
  const [venues, setVenues] = useState<string[]>(u.venueIds ?? []);
  const [teamId, setTeamId] = useState(u.teamId ?? '');
  const [playerId, setPlayerId] = useState(u.playerId ?? '');
  const isSelf = me?.id === u.id;
  const staff = role === 'host' || role === 'organizer';
  const needsTeam = role === 'captain' || role === 'player';

  const changeRole = (r: Role) => {
    setRole(r);
    if (r === 'host' || r === 'organizer') setPrivs([...ROLE_PRESETS[r]]);
    else setPrivs([]);
  };
  const save = () => {
    updateUser(u.id, {
      role,
      privileges: staff ? privs : [],
      venueIds: role === 'host' ? venues : undefined,
      teamId: needsTeam ? teamId || undefined : u.role === 'fan' ? u.teamId : undefined,
      playerId: needsTeam ? playerId || undefined : undefined,
    });
    onClose();
  };
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <Modal title={`Access for ${u.name}`} onClose={onClose}>
      <div className="stack">
        <label className="field">Role
          <select value={role} onChange={(e) => changeRole(e.target.value as Role)} disabled={isSelf}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        {isSelf && <div className="muted small">You cannot change your own God Admin role.</div>}
        {staff && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row-between"><b className="small">Privileges</b><button className="link-btn" onClick={() => setPrivs([...ROLE_PRESETS[role as 'host' | 'organizer']])}>Reset to {ROLE_LABEL[role]} preset</button></div>
            {ALL_PRIVILEGES.map((p) => (
              <label className="check" key={p.id}>
                <input type="checkbox" checked={privs.includes(p.id)} onChange={() => setPrivs(toggle(privs, p.id))} />
                <span><b>{p.label}</b><small>{p.hint}</small></span>
              </label>
            ))}
          </div>
        )}
        {role === 'host' && (
          <div className="stack" style={{ gap: 8 }}>
            <b className="small">Assigned venues (match-day control is limited to these)</b>
            {db.venues.map((v) => (
              <label className="check" key={v.id}><input type="checkbox" checked={venues.includes(v.id)} onChange={() => setVenues(toggle(venues, v.id))} /><span><b>{v.name}</b><small>{v.city}</small></span></label>
            ))}
          </div>
        )}
        {needsTeam && (
          <div className="form-grid">
            <label className="field">Team
              <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPlayerId(''); }}>
                <option value="">Select…</option>
                {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field">Linked player profile
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={!teamId}>
                <option value="">None</option>
                {db.players.filter((p) => p.teamId === teamId && p.active).map((p) => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
              </select>
            </label>
          </div>
        )}
        {role === 'captain' && teamId && db.users.some((x) => x.id !== u.id && x.role === 'captain' && x.teamId === teamId) && (
          <div className="pill pill-warn" style={{ whiteSpace: 'normal' }}>This team already has a captain. Saving will give the team two captains — demote the other one if needed.</div>
        )}
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={needsTeam && !teamId}>Save access</button>
      </div>
    </Modal>
  );
}

function CreateUser({ onClose }: { onClose: () => void }) {
  const { createUser } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('organizer');
  return (
    <Modal title="Invite a user" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); createUser({ name, email, role, privileges: role === 'host' || role === 'organizer' ? [...ROLE_PRESETS[role]] : [] }); onClose(); }}>
        <label className="field">Name<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field">Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.filter((r) => r !== 'god').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        <div className="muted small">Hosts and organizers start with their role's default privileges; fine-tune them afterwards. Captains and players need a team assigned via “Edit access”.</div>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm">Create</button></div>
      </form>
    </Modal>
  );
}

function FixtureEditor({ m, onClose }: { m: Match; onClose: () => void }) {
  const { db, updateMatch } = useStore();
  const L = useLookup();
  const [kickoff, setKickoff] = useState(toLocalInput(m.kickoff));
  const [venueId, setVenueId] = useState(m.venueId);
  const [status, setStatus] = useState(m.status);
  const [referee, setReferee] = useState(m.referee);
  return (
    <Modal title={`Edit fixture: ${L.team(m.homeId)?.name ?? m.homeLabel} vs ${L.team(m.awayId)?.name ?? m.awayLabel}`} onClose={onClose}>
      <div className="stack">
        <div className="god-banner" style={{ marginBottom: 0, padding: '12px 16px' }}><span>⚡</span><span className="small">God Admin override — applies immediately, notifies both teams and is written to the audit log.</span></div>
        <div className="form-grid">
          <label className="field">Kickoff<input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} /></label>
          <label className="field">Venue<select value={venueId} onChange={(e) => setVenueId(e.target.value)}>{db.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label className="field">Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Match['status'])}>
              <option value="scheduled">Scheduled</option><option value="postponed">Postponed</option><option value="live">Live</option><option value="finished">Finished</option>
            </select>
          </label>
          <label className="field">Referee<input value={referee} onChange={(e) => setReferee(e.target.value)} /></label>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={() => {
          const iso = new Date(kickoff).toISOString();
          updateMatch(m.id, { kickoff: iso, venueId, status, referee }, `kickoff ${fmtDateTime(iso)}, venue ${L.venue(venueId)?.name}, status ${status}`);
          onClose();
        }}>Apply override</button>
      </div>
    </Modal>
  );
}

function SettingsForm({ onSaved }: { onSaved: () => void }) {
  const { db, updateSettings } = useStore();
  const [s, setS] = useState({ ...db.settings });
  const dirty = JSON.stringify(s) !== JSON.stringify({ ...db.settings, rosterLocked: s.rosterLocked });
  return (
    <form className="card card-pad stack" onSubmit={(e) => {
      e.preventDefault();
      const { rosterLocked: _ignored, ...rest } = s;
      void _ignored;
      updateSettings(rest);
      onSaved();
    }}>
      <h3>Competition & scheduling</h3>
      <label className="field">Tournament name<input required value={s.tournamentName} onChange={(e) => setS({ ...s, tournamentName: e.target.value })} /></label>
      <label className="field">Season<input required value={s.season} onChange={(e) => setS({ ...s, season: e.target.value })} /></label>
      <label className="field">Maximum squad size<input type="number" min={11} max={40} value={s.maxSquadSize} onChange={(e) => setS({ ...s, maxSquadSize: Number(e.target.value) })} /></label>
      <label className="field">Minimum notice for reschedule requests (hours)<input type="number" min={0} max={336} value={s.minRescheduleNoticeHours} onChange={(e) => setS({ ...s, minRescheduleNoticeHours: Number(e.target.value) })} /></label>
      <div><button className="btn btn-primary btn-sm" disabled={!dirty}>Save rules</button></div>
    </form>
  );
}

export default function AdminDashboard() {
  return <RequireRole roles={['god']}>{() => <AdminInner />}</RequireRole>;
}

function AdminInner() {
  const { db, decide, updateUser, updateSettings, resetDemo } = useStore();
  const L = useLookup();
  const { flash, node } = useFlash();
  const [section, setSection] = useState('overview');
  const [reqTab, setReqTab] = useState<'pending' | 'history'>('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [fixture, setFixture] = useState<Match | null>(null);
  const [userFilter, setUserFilter] = useState<Role | ''>('');
  const [q, setQ] = useState('');

  const pending = db.requests.filter((r) => r.status === 'pending');
  const history = db.requests.filter((r) => r.status !== 'pending');
  const finished = db.matches.filter((m) => m.status === 'finished');
  const goals = finished.reduce((s, m) => s + score(m).reduce((a, b) => a + b, 0), 0);
  const staff = db.users.filter((u) => u.role === 'host' || u.role === 'organizer');

  const sections = [
    { id: 'overview', label: 'Overview', icon: '◎', group: 'Command' },
    { id: 'approvals', label: 'Approvals', icon: '✓', badge: pending.length, group: 'Command' },
    { id: 'users', label: 'Users & roles', icon: '👥', group: 'Governance' },
    { id: 'fixtures', label: 'Fixtures', icon: '📅', group: 'Governance' },
    { id: 'settings', label: 'Tournament rules', icon: '⚙', group: 'Governance' },
    { id: 'audit', label: 'Audit log', icon: '📜', group: 'Governance' },
  ];

  const doDecide = (id: string, approve: boolean, note: string) => {
    const r = decide(id, approve, note);
    flash(r.ok, r.message);
  };

  const shownReqs = (reqTab === 'pending' ? pending : history).filter((r) => !typeFilter || r.type === typeFilter);
  const shownUsers = db.users.filter((u) => (!userFilter || u.role === userFilter) && (!q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())));

  return (
    <DashShell sections={sections} active={section} onSelect={setSection} accent="#1cc4bf">
      {node}
      {section === 'overview' && (
        <>
          <DashTitle kicker="God Admin" title="Command centre" />
          <div className="god-banner">
            <span style={{ fontSize: '2rem' }}>👑</span>
            <div><b>Every sensitive decision lands here.</b><div className="small" style={{ opacity: .9 }}>Reschedules, roster changes, fixture changes and final results only take effect after your approval.</div></div>
            {pending.length > 0 && <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSection('approvals')}>Review {pending.length} pending</button>}
          </div>
          <div className="kpis">
            <div className="kpi" style={{ ['--k' as string]: 'var(--turq)' }}><span>Pending decisions</span><b>{pending.length}</b></div>
            <div className="kpi"><span>Users</span><b>{db.users.length}</b></div>
            <div className="kpi" style={{ ['--k' as string]: 'var(--cobalt)' }}><span>Hosts & organizers</span><b>{staff.length}</b></div>
            <div className="kpi" style={{ ['--k' as string]: 'var(--tulip)' }}><span>Matches played</span><b>{finished.length}/{db.matches.length}</b></div>
            <div className="kpi"><span>Goals</span><b>{goals}</b></div>
          </div>
          <div className="grid grid-main">
            <div>
              <h3 style={{ marginBottom: 12 }}>Waiting for you</h3>
              {pending.slice(0, 3).map((r) => <RequestCard key={r.id} r={r} showRecommend actions={<DecisionBar onDecide={(a, n) => doDecide(r.id, a, n)} />} />)}
              {pending.length === 0 && <Empty>Inbox zero. Nothing needs your decision.</Empty>}
            </div>
            <div className="card card-pad">
              <h3>Recent activity</h3>
              {db.audit.slice(0, 8).map((a) => (
                <div key={a.id} className="list-row" style={{ padding: '8px 0' }}>
                  <div><b className="small">{a.action}</b><div className="muted small">{L.user(a.actorId)?.name} · {timeAgo(a.at)}</div><div className="small">{a.detail}</div></div>
                </div>
              ))}
              <button className="link-btn" onClick={() => setSection('audit')}>Full audit log →</button>
            </div>
          </div>
        </>
      )}

      {section === 'approvals' && (
        <>
          <DashTitle kicker="God Admin" title="Approvals">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ maxWidth: 220 }} aria-label="Filter by type">
              <option value="">All request types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </DashTitle>
          <div className="tabs">
            <button className={reqTab === 'pending' ? 'active' : ''} onClick={() => setReqTab('pending')}>Pending <span className="pill pill-warn">{pending.length}</span></button>
            <button className={reqTab === 'history' ? 'active' : ''} onClick={() => setReqTab('history')}>History</button>
          </div>
          {shownReqs.length === 0 && <Empty>{reqTab === 'pending' ? 'No pending requests.' : 'No decisions yet.'}</Empty>}
          {shownReqs.map((r) => <RequestCard key={r.id} r={r} showRecommend={r.status === 'pending'} actions={r.status === 'pending' ? <DecisionBar onDecide={(a, n) => doDecide(r.id, a, n)} approveLabel={r.type === 'result' ? 'Verify result' : 'Approve'} /> : undefined} />)}
        </>
      )}

      {section === 'users' && (
        <>
          <DashTitle kicker="God Admin" title="Users & roles"><button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ Invite user</button></DashTitle>
          <div className="card card-pad">
            <div className="row wrap" style={{ marginBottom: 12 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" style={{ maxWidth: 260 }} aria-label="Search users" />
              <div className="chips">
                <button className={`chip ${!userFilter ? 'active' : ''}`} onClick={() => setUserFilter('')}>All</button>
                {ROLES.map((r) => <button key={r} className={`chip ${userFilter === r ? 'active' : ''}`} onClick={() => setUserFilter(r)}>{ROLE_LABEL[r]} ({db.users.filter((u) => u.role === r).length})</button>)}
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>User</th><th>Role</th><th>Scope / privileges</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {shownUsers.map((u) => (
                    <tr key={u.id}>
                      <td><div className="row"><Avatar name={u.name} size={30} color={u.role === 'god' ? '#1cc4bf' : '#1cc4bf'} /><div><b>{u.name}</b><div className="muted small">{u.email}</div></div></div></td>
                      <td><span className="pill pill-ghost">{ROLE_LABEL[u.role]}</span></td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 360 }}>
                        {u.role === 'god' && <span className="muted small">Full control</span>}
                        {(u.role === 'host' || u.role === 'organizer') && (
                          <div className="row wrap" style={{ gap: 4 }}>
                            {u.privileges.length === 0 && <span className="muted small">No privileges</span>}
                            {u.privileges.map((p) => <span key={p} className="pill pill-turq">{ALL_PRIVILEGES.find((x) => x.id === p)?.label}</span>)}
                            {u.role === 'host' && <span className="pill pill-cobalt">{u.venueIds?.length ?? 0} venue(s)</span>}
                          </div>
                        )}
                        {(u.role === 'captain' || u.role === 'player') && <span className="row small"><Crest team={L.team(u.teamId)} size={18} />{L.team(u.teamId)?.name}</span>}
                        {u.role === 'fan' && <span className="muted small">{u.favoriteTeamId ? `Follows ${L.team(u.favoriteTeamId)?.short}` : '—'}</span>}
                      </td>
                      <td>{u.suspended ? <span className="pill pill-danger">Suspended</span> : <span className="pill pill-ok">Active</span>}</td>
                      <td>
                        {u.role !== 'god' && (
                          <div className="row">
                            <button className="btn btn-ghost btn-xs" onClick={() => setEditing(u)}>Edit access</button>
                            <button className="btn btn-ghost btn-xs" onClick={() => updateUser(u.id, { suspended: !u.suspended })}>{u.suspended ? 'Reinstate' : 'Suspend'}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === 'fixtures' && (
        <>
          <DashTitle kicker="God Admin" title="Fixtures" />
          <p className="muted">Hosts, organizers and captains must request changes. As God Admin you can edit any fixture directly.</p>
          <div className="card card-pad">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Round</th><th>Match</th><th>Kickoff</th><th>Venue</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {db.matches.map((m) => (
                    <tr key={m.id}>
                      <td>{roundLabel(m.stage, m.round)}</td>
                      <td><Link to={`/matches/${m.id}`} className="row"><Crest team={L.team(m.homeId)} label={m.homeLabel} size={20} />{L.team(m.homeId)?.short ?? m.homeLabel} v {L.team(m.awayId)?.short ?? m.awayLabel}<Crest team={L.team(m.awayId)} label={m.awayLabel} size={20} /></Link></td>
                      <td>{fmtDateTime(m.kickoff)}</td>
                      <td>{L.venue(m.venueId)?.name}</td>
                      <td><StatusPill m={m} /></td>
                      <td><button className="btn btn-ghost btn-xs" onClick={() => setFixture(m)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {section === 'settings' && (
        <>
          <DashTitle kicker="God Admin" title="Tournament rules" />
          <div className="grid grid-2">
            <SettingsForm onSaved={() => flash(true, 'Rules saved.')} />
            <div className="card card-pad stack">
              <h3>Roster lock</h3>
              <label className="check">
                <input type="checkbox" checked={db.settings.rosterLocked} onChange={(e) => updateSettings({ rosterLocked: e.target.checked })} />
                <span><b>Lock all rosters</b><small>Captains cannot submit add/remove player requests while locked (e.g. after the transfer window). Captains are notified when this changes.</small></span>
              </label>
            </div>
            <div className="card card-pad">
              <h3>Demo data</h3>
              <p className="muted small">Restore the seeded season. This erases every change made in this browser.</p>
              <button className="btn btn-red btn-sm" onClick={() => { if (confirm('Reset all tournament data to the original demo season?')) { resetDemo(); flash(true, 'Demo data restored.'); } }}>Reset demo season</button>
            </div>
          </div>
        </>
      )}

      {section === 'audit' && (
        <>
          <DashTitle kicker="God Admin" title="Audit log" />
          <div className="card card-pad">
            {db.audit.map((a) => (
              <div className="audit-item" key={a.id}>
                <span className="muted small">{fmtDateTime(a.at)}</span>
                <span><b>{a.action}</b> · <span className="muted">{L.user(a.actorId)?.name ?? 'System'}</span><br /><span className="small">{a.detail}</span></span>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && <UserEditor u={editing} onClose={() => setEditing(null)} />}
      {creating && <CreateUser onClose={() => setCreating(false)} />}
      {fixture && <FixtureEditor m={fixture} onClose={() => setFixture(null)} />}
    </DashShell>
  );
}
