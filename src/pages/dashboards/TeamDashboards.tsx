import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Match, Position, User, Player } from '../../types';
import { useStore, useLookup } from '../../store/store';
import { Crest, Empty, Modal, useFlash, Countdown, FormBadge, Avatar, StatusPill } from '../../components/ui';
import { DashShell, RequireRole, RequestCard, DashTitle } from './shared';
import { standings, teamMatches, playerTotals, score, resultFor } from '../../data/derive';
import { downloadIcs, fmtDateTime, fmtTime, mapsEmbed, mapsUrl, roundLabel, toLocalInput } from '../../format';

/* ---------------- Shared: schedule with locations ---------------- */
function Schedule({ teamId, captain, onRequest }: { teamId: string; captain?: boolean; onRequest?: (m: Match) => void }) {
  const { db } = useStore();
  const L = useLookup();
  const [openMap, setOpenMap] = useState<string | null>(null);
  const team = L.team(teamId)!;
  const upcoming = teamMatches(db, teamId).filter((m) => m.status !== 'finished');
  const exportAll = () => downloadIcs(`${team.short}-schedule.ics`, upcoming.map((m) => {
    const v = L.venue(m.venueId)!;
    const opp = L.team(m.homeId === teamId ? m.awayId : m.homeId);
    return { uid: m.id, title: `${team.short} vs ${opp?.short ?? 'TBD'} (${m.homeId === teamId ? 'H' : 'A'})`, start: m.kickoff, durationMin: 120, location: `${v.name}, ${v.address}`, description: `Call time: ${fmtTime(new Date(new Date(m.kickoff).getTime() - 120 * 6e4).toISOString())}. ${v.transit}. ${v.parking}.` };
  }));
  return (
    <>
      <div className="row-between wrap" style={{ marginBottom: 14 }}>
        <span className="muted small">Call time is 2 hours before kickoff. Times shown in your local time zone.</span>
        {upcoming.length > 0 && <button className="btn btn-primary btn-sm" onClick={exportAll}>📅 Add all to calendar</button>}
      </div>
      {upcoming.length === 0 && <Empty>No upcoming matches.</Empty>}
      {upcoming.map((m) => {
        const v = L.venue(m.venueId)!;
        const isHome = m.homeId === teamId;
        const opp = L.team(isHome ? m.awayId : m.homeId);
        const d = new Date(m.kickoff);
        const pendingReq = db.requests.find((r) => r.matchId === m.id && r.status === 'pending' && r.type === 'reschedule');
        return (
          <div key={m.id}>
            <div className="my-match">
              <div className="date">
                <small>{d.toLocaleDateString(undefined, { month: 'short' })}</small>
                <b>{d.getDate()}</b>
                <small style={{ color: '#fff' }}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</small>
              </div>
              <div>
                <div className="row wrap" style={{ gap: 8 }}>
                  <span className={`pill ${isHome ? 'pill-turq' : 'pill-cobalt'}`}>{isHome ? 'Home' : 'Away'}</span>
                  <span className="muted small">{roundLabel(m.stage, m.round)}</span>
                  <StatusPill m={m} />
                  {pendingReq && <span className="pill pill-warn">Change requested</span>}
                </div>
                <Link to={`/matches/${m.id}`} className="row" style={{ margin: '6px 0', fontWeight: 700, fontSize: '1.05rem' }}>vs <Crest team={opp} label={isHome ? m.awayLabel : m.homeLabel} size={24} />{opp?.name ?? 'TBD'}</Link>
                <div className="small"><b>Kickoff {fmtTime(m.kickoff)}</b> · Call time {fmtTime(new Date(d.getTime() - 120 * 6e4).toISOString())}</div>
                <div className="small muted">📍 {v.name} — {v.address}</div>
                <div className="small muted">🚇 {v.transit} · 🅿️ {v.parking}</div>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <a className="btn btn-ghost btn-xs" href={mapsUrl(`${v.name}, ${v.address}`)} target="_blank" rel="noreferrer">Directions</a>
                <button className="btn btn-ghost btn-xs" onClick={() => setOpenMap(openMap === m.id ? null : m.id)}>{openMap === m.id ? 'Hide map' : 'Show map'}</button>
                {captain && onRequest && m.status === 'scheduled' && !pendingReq && <button className="btn btn-gold btn-xs" onClick={() => onRequest(m)}>Request delay / time change</button>}
              </div>
            </div>
            {openMap === m.id && <iframe className="map-frame" style={{ marginBottom: 12 }} src={mapsEmbed(`${v.name} ${v.address}`)} title={`Map of ${v.name}`} loading="lazy" />}
          </div>
        );
      })}
    </>
  );
}

function NextMatchBanner({ teamId }: { teamId: string }) {
  const { db } = useStore();
  const L = useLookup();
  const next = teamMatches(db, teamId).find((m) => m.status === 'scheduled' || m.status === 'live');
  if (!next) return null;
  const opp = L.team(next.homeId === teamId ? next.awayId : next.homeId);
  const v = L.venue(next.venueId)!;
  return (
    <div className="live-console grid grid-2" style={{ alignItems: 'center', marginBottom: 20 }}>
      <div>
        <div className="kicker" style={{ color: 'var(--turq)' }}>Next match · {roundLabel(next.stage, next.round)}</div>
        <div className="row" style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', fontWeight: 800, textTransform: 'uppercase' }}>vs <Crest team={opp} size={36} /> {opp?.name}</div>
        <div className="small" style={{ opacity: .8 }}>{fmtDateTime(next.kickoff)} · {v.name}, {v.city}</div>
      </div>
      <Countdown to={next.kickoff} />
    </div>
  );
}

/* ---------------- Captain ---------------- */
function RescheduleForm({ m, onClose, onDone }: { m: Match; onClose: () => void; onDone: (ok: boolean, msg: string) => void }) {
  const { db, submitRequest, user } = useStore();
  const L = useLookup();
  const [kind, setKind] = useState<'delay' | 'time_change'>('delay');
  const [delayH, setDelayH] = useState(1);
  const [when, setWhen] = useState(toLocalInput(m.kickoff));
  const [reason, setReason] = useState('');
  const proposed = kind === 'delay' ? new Date(new Date(m.kickoff).getTime() + delayH * 36e5).toISOString() : new Date(when).toISOString();
  const hoursLeft = (new Date(m.kickoff).getTime() - Date.now()) / 36e5;
  const tooLate = hoursLeft < db.settings.minRescheduleNoticeHours;
  return (
    <Modal title="Request a schedule change" onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        const r = submitRequest({ type: 'reschedule', teamId: user!.teamId, matchId: m.id, reason, payload: { kind, proposedKickoff: proposed } });
        onDone(r.ok, r.message);
        if (r.ok) onClose();
      }}>
        <div className="row"><Crest team={L.team(m.homeId)} size={24} /><b>{L.team(m.homeId)?.name}</b> vs <b>{L.team(m.awayId)?.name}</b><Crest team={L.team(m.awayId)} size={24} /></div>
        <div className="muted small">Currently: {fmtDateTime(m.kickoff)} at {L.venue(m.venueId)?.name}</div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={kind === 'delay' ? 'active' : ''} onClick={() => setKind('delay')}>Delay kickoff</button>
          <button type="button" className={kind === 'time_change' ? 'active' : ''} onClick={() => setKind('time_change')}>Change date / time</button>
        </div>
        {kind === 'delay' ? (
          <label className="field">Delay by
            <select value={delayH} onChange={(e) => setDelayH(Number(e.target.value))}>
              {[0.5, 1, 1.5, 2, 3, 4].map((x) => <option key={x} value={x}>{x < 1 ? '30 minutes' : `${x} hour${x > 1 ? 's' : ''}`}</option>)}
            </select>
          </label>
        ) : (
          <label className="field">Proposed kickoff<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} min={toLocalInput(new Date().toISOString())} /></label>
        )}
        <div className="req-diff"><span className="from">{fmtDateTime(m.kickoff)}</span>→<span className="to">{fmtDateTime(proposed)}</span></div>
        <label className="field">Reason<textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why — organizers and the God Admin will review this." /></label>
        {tooLate && <div className="pill pill-danger" style={{ whiteSpace: 'normal' }}>Requests need at least {db.settings.minRescheduleNoticeHours}h notice. This match is too close to kickoff — contact the organizers directly.</div>}
        <div className="muted small">The opponent and hosts are notified only if the God Admin approves.</div>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" disabled={tooLate || proposed === m.kickoff}>Send request</button></div>
      </form>
    </Modal>
  );
}

function AddPlayerForm({ teamId, onClose, onDone }: { teamId: string; onClose: () => void; onDone: (ok: boolean, msg: string) => void }) {
  const { db, submitRequest } = useStore();
  const taken = new Set(db.players.filter((p) => p.teamId === teamId && p.active).map((p) => p.number));
  const firstFree = Array.from({ length: 98 }, (_, i) => i + 1).find((n) => !taken.has(n)) ?? 99;
  const [f, setF] = useState({ name: '', number: firstFree, position: 'MF' as Position, nationality: '', age: 21, height: 178, foot: 'Right' as Player['foot'] });
  const [reason, setReason] = useState('');
  return (
    <Modal title="Request to add a player" onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        const r = submitRequest({ type: 'add_player', teamId, reason, payload: { player: { ...f, name: f.name.trim(), nationality: f.nationality.trim() } } });
        onDone(r.ok, r.message);
        if (r.ok) onClose();
      }}>
        <label className="field">Full name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="form-grid">
          <label className="field">Shirt number<input type="number" min={1} max={99} required value={f.number} onChange={(e) => setF({ ...f, number: Number(e.target.value) })} /></label>
          <label className="field">Position<select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as Position })}><option value="GK">Goalkeeper</option><option value="DF">Defender</option><option value="MF">Midfielder</option><option value="FW">Forward</option></select></label>
          <label className="field">Nationality<input required value={f.nationality} onChange={(e) => setF({ ...f, nationality: e.target.value })} /></label>
          <label className="field">Age<input type="number" min={15} max={45} value={f.age} onChange={(e) => setF({ ...f, age: Number(e.target.value) })} /></label>
          <label className="field">Height (cm)<input type="number" min={140} max={215} value={f.height} onChange={(e) => setF({ ...f, height: Number(e.target.value) })} /></label>
          <label className="field">Preferred foot<select value={f.foot} onChange={(e) => setF({ ...f, foot: e.target.value as Player['foot'] })}><option>Right</option><option>Left</option><option>Both</option></select></label>
        </div>
        {taken.has(f.number) && <div className="small" style={{ color: 'var(--danger)' }}>#{f.number} is already taken.</div>}
        <label className="field">Reason<textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Injury replacement, new signing…" /></label>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" disabled={taken.has(f.number)}>Send to God Admin</button></div>
      </form>
    </Modal>
  );
}

function RemovePlayerForm({ p, onClose, onDone }: { p: Player; onClose: () => void; onDone: (ok: boolean, msg: string) => void }) {
  const { submitRequest } = useStore();
  const [reason, setReason] = useState('');
  return (
    <Modal title={`Request to remove ${p.name}`} onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        const r = submitRequest({ type: 'remove_player', teamId: p.teamId, reason, payload: { playerId: p.id } });
        onDone(r.ok, r.message);
        if (r.ok) onClose();
      }}>
        <p className="muted small">If approved, #{p.number} {p.name} is deregistered. Their stats stay in the record books.</p>
        <label className="field">Reason<textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Transfer, long-term injury, disciplinary…" /></label>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-red btn-sm">Send removal request</button></div>
      </form>
    </Modal>
  );
}

function SquadTable({ teamId, captain, onRemove }: { teamId: string; captain?: User; onRemove?: (p: Player) => void }) {
  const { db } = useStore();
  const totals = playerTotals(db);
  const squad = db.players.filter((p) => p.teamId === teamId && p.active).sort((a, b) => ['GK', 'DF', 'MF', 'FW'].indexOf(a.position) - ['GK', 'DF', 'MF', 'FW'].indexOf(b.position) || a.number - b.number);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th className="num">#</th><th>Player</th><th className="num">Pos</th><th className="hide-sm">Nationality</th><th className="num hide-sm">Age</th><th className="num">G</th><th className="num">A</th><th className="num hide-sm">YC</th>{onRemove && <th></th>}</tr></thead>
        <tbody>
          {squad.map((p) => {
            const t = totals.get(p.id)!;
            const pend = db.requests.some((r) => r.type === 'remove_player' && r.status === 'pending' && r.payload.playerId === p.id);
            return (
              <tr key={p.id}>
                <td className="num pts">{p.number}</td>
                <td><Link to={`/players/${p.id}`} className="player-link">{p.name}</Link>{captain?.playerId === p.id && <span className="pill pill-gold" style={{ marginLeft: 6 }}>C</span>}</td>
                <td className="num">{p.position}</td><td className="hide-sm">{p.nationality}</td><td className="num hide-sm">{p.age}</td>
                <td className="num">{t.goals}</td><td className="num">{t.assists}</td><td className="num hide-sm">{t.yellows}</td>
                {onRemove && <td>{pend ? <span className="pill pill-warn">Removal pending</span> : captain?.playerId === p.id ? <span className="muted small">You</span> : <button className="btn btn-ghost btn-xs" onClick={() => onRemove(p)}><span className="nm-full">Request removal</span><span className="nm-short" style={{ fontWeight: 600 }}>Remove</span></button>}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CaptainDashboard() {
  return <RequireRole roles={['captain']}>{(u) => <CaptainInner u={u} />}</RequireRole>;
}

function CaptainInner({ u }: { u: User }) {
  const { db, cancelRequest } = useStore();
  const L = useLookup();
  const { flash, node } = useFlash();
  const [section, setSection] = useState('overview');
  const [resched, setResched] = useState<Match | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Player | null>(null);
  const team = L.team(u.teamId);
  if (!team) return <div className="section"><div className="container"><Empty>No team is linked to your captain account yet. Ask the God Admin to assign one.</Empty></div></div>;

  const table = standings(db);
  const pos = table.findIndex((r) => r.team.id === team.id);
  const row = table[pos];
  const myReqs = db.requests.filter((r) => r.teamId === team.id && (r.type === 'reschedule' || r.type === 'add_player' || r.type === 'remove_player'));
  const pending = myReqs.filter((r) => r.status === 'pending');
  const squadSize = db.players.filter((p) => p.teamId === team.id && p.active).length;
  const results = teamMatches(db, team.id).filter((m) => m.status === 'finished').slice(-5).reverse();

  const sections = [
    { id: 'overview', label: 'Overview', icon: '◎' },
    { id: 'schedule', label: 'Schedule & venues', icon: '📅' },
    { id: 'squad', label: 'Squad', icon: '👥' },
    { id: 'requests', label: 'My requests', icon: '📨', badge: pending.length },
  ];

  return (
    <DashShell sections={sections} active={section} onSelect={setSection} accent={team.colors[0]}>
      {node}
      {section === 'overview' && (
        <>
          <DashTitle kicker={`Captain · ${team.name}`} title="Team hub"><Link to={`/teams/${team.id}`} className="btn btn-ghost btn-sm">Public club page</Link></DashTitle>
          <NextMatchBanner teamId={team.id} />
          <div className="kpis">
            <div className="kpi" style={{ ['--k' as string]: team.colors[0] }}><span>Position</span><b>{pos + 1}</b></div>
            <div className="kpi"><span>Points</span><b>{row.pts}</b></div>
            <div className="kpi"><span>Goal difference</span><b>{row.gd > 0 ? `+${row.gd}` : row.gd}</b></div>
            <div className="kpi" style={{ ['--k' as string]: 'var(--cobalt)' }}><span>Squad</span><b>{squadSize}/{db.settings.maxSquadSize}</b></div>
            <div className="kpi" style={{ ['--k' as string]: 'var(--turq)' }}><span>Pending requests</span><b>{pending.length}</b></div>
          </div>
          {db.settings.rosterLocked && <div className="god-banner"><span>🔒</span><div><b>Rosters are locked</b><div className="small">The God Admin has frozen squad changes. Schedule requests are still open.</div></div></div>}
          <div className="grid grid-2">
            <div className="card card-pad">
              <h3>What you can do</h3>
              <div className="stack" style={{ gap: 10 }}>
                <button className="demo-account" onClick={() => setSection('schedule')}><span>⏰</span><span><b>Request a delay or time change</b><small>Sent to the God Admin; organizers can add a recommendation.</small></span></button>
                <button className="demo-account" onClick={() => setAdding(true)} disabled={db.settings.rosterLocked}><span>➕</span><span><b>Add a player</b><small>Register a new player — needs God Admin approval.</small></span></button>
                <button className="demo-account" onClick={() => setSection('squad')} disabled={db.settings.rosterLocked}><span>➖</span><span><b>Remove a player</b><small>Deregister a player — needs God Admin approval.</small></span></button>
              </div>
            </div>
            <div className="card card-pad">
              <h3>Recent results</h3>
              {results.map((m) => {
                const opp = L.team(m.homeId === team.id ? m.awayId : m.homeId);
                const [h, a] = score(m);
                return (
                  <Link key={m.id} to={`/matches/${m.id}`} className="list-row" style={{ padding: '8px 0' }}>
                    <FormBadge r={resultFor(m, team.id)!} />
                    <span className="row" style={{ flex: 1 }}>{m.homeId === team.id ? 'vs' : '@'} <Crest team={opp} size={20} />{opp?.name}</span>
                    <b style={{ fontFamily: 'var(--display)', fontSize: '1.2rem' }}>{h}–{a}</b>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
      {section === 'schedule' && (
        <>
          <DashTitle kicker={team.name} title="Schedule & venues" />
          <Schedule teamId={team.id} captain onRequest={setResched} />
        </>
      )}
      {section === 'squad' && (
        <>
          <DashTitle kicker={`${team.name} · ${squadSize}/${db.settings.maxSquadSize} players`} title="Squad">
            <button className="btn btn-primary btn-sm" onClick={() => setAdding(true)} disabled={db.settings.rosterLocked}>+ Request new player</button>
          </DashTitle>
          {db.settings.rosterLocked && <p className="pill pill-danger">Rosters are locked by the God Admin.</p>}
          {pending.filter((r) => r.type === 'add_player').map((r) => <RequestCard key={r.id} r={r} />)}
          <div className="card card-pad"><SquadTable teamId={team.id} captain={u} onRemove={db.settings.rosterLocked ? undefined : setRemoving} /></div>
        </>
      )}
      {section === 'requests' && (
        <>
          <DashTitle kicker={team.name} title="My requests" />
          {myReqs.length === 0 && <Empty>No requests yet.</Empty>}
          {myReqs.map((r) => <RequestCard key={r.id} r={r} actions={r.status === 'pending' && r.createdBy === u.id ? <button className="btn btn-ghost btn-xs" onClick={() => cancelRequest(r.id)}>Withdraw request</button> : undefined} />)}
        </>
      )}
      {resched && <RescheduleForm m={resched} onClose={() => setResched(null)} onDone={flash} />}
      {adding && <AddPlayerForm teamId={team.id} onClose={() => setAdding(false)} onDone={flash} />}
      {removing && <RemovePlayerForm p={removing} onClose={() => setRemoving(null)} onDone={flash} />}
    </DashShell>
  );
}

/* ---------------- Player (view-only) ---------------- */
export function PlayerDashboard() {
  return <RequireRole roles={['player']}>{(u) => <PlayerInner u={u} />}</RequireRole>;
}

function PlayerInner({ u }: { u: User }) {
  const { db, noticesFor } = useStore();
  const L = useLookup();
  const [section, setSection] = useState('schedule');
  const team = L.team(u.teamId);
  const me = L.player(u.playerId);
  if (!team) return <div className="section"><div className="container"><Empty>You are not registered with a team. <Link to="/my-koora" className="link-btn">Go to My Koora</Link></Empty></div></div>;
  const tot = me ? playerTotals(db).get(me.id) : undefined;
  const captain = db.users.find((x) => x.role === 'captain' && x.teamId === team.id);
  const teamNotices = noticesFor(u).filter((n) => n.to === `team:${team.id}` || n.to === u.id);

  const sections = [
    { id: 'schedule', label: 'My matches', icon: '📅' },
    { id: 'profile', label: 'My profile', icon: '👤' },
    { id: 'team', label: 'My team', icon: '👥' },
    { id: 'notices', label: 'Team notices', icon: '🔔', badge: teamNotices.filter((n) => !n.readBy.includes(u.id)).length },
  ];

  return (
    <DashShell sections={sections} active={section} onSelect={setSection} accent={team.colors[0]}>
      {section === 'schedule' && (
        <>
          <DashTitle kicker={`Player · ${team.name}`} title="My matches" />
          <NextMatchBanner teamId={team.id} />
          <Schedule teamId={team.id} />
        </>
      )}
      {section === 'profile' && me && tot && (
        <>
          <DashTitle kicker="View only" title="My profile"><Link to={`/players/${me.id}`} className="btn btn-ghost btn-sm">Public profile</Link></DashTitle>
          <div className="card card-pad row wrap" style={{ marginBottom: 20, gap: 20 }}>
            <Avatar name={me.name} size={72} color={team.colors[0]} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2rem' }}>{me.name}</h2>
              <div className="muted">#{me.number} · {{ GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' }[me.position]} · {me.nationality} · {me.age} yrs · {me.height} cm · {me.foot} foot</div>
            </div>
            <Crest team={team} size={56} />
          </div>
          <div className="stat-tiles" style={{ marginBottom: 20 }}>
            <div className="stat-tile accent"><b>{tot.goals}</b><span>Goals</span></div>
            <div className="stat-tile"><b>{tot.assists}</b><span>Assists</span></div>
            <div className="stat-tile"><b>{tot.apps}</b><span>Matches</span></div>
            <div className="stat-tile"><b>{tot.yellows}</b><span>Yellow</span></div>
            <div className="stat-tile"><b>{tot.reds}</b><span>Red</span></div>
          </div>
          <p className="muted small">Your profile is view-only, the same as fans see it. To correct your details, ask your captain{captain ? ` (${captain.name})` : ''} — changes are approved by the God Admin.</p>
        </>
      )}
      {section === 'team' && (
        <>
          <DashTitle kicker={team.name} title="My team" />
          <div className="card card-pad"><SquadTable teamId={team.id} captain={captain} /></div>
        </>
      )}
      {section === 'notices' && (
        <>
          <DashTitle kicker={team.name} title="Team notices" />
          {teamNotices.length === 0 && <Empty>No notices for your team yet. Schedule changes and squad updates will appear here.</Empty>}
          <div className="card card-pad">
            {teamNotices.map((n) => (
              <Link key={n.id} to={n.link ?? '#'} className="list-row"><span style={{ flex: 1 }}>{n.text}</span><span className="muted small">{fmtDateTime(n.at)}</span></Link>
            ))}
          </div>
        </>
      )}
    </DashShell>
  );
}
