import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { EventType, Highlight, Match, MatchStats, NewsItem, User, Venue, Team } from '../../types';
import { useStore, useLookup, has, canRunMatch, ROLE_LABEL } from '../../store/store';
import { ALL_PRIVILEGES } from '../../data/seed';
import { Crest, Empty, Modal, useFlash, StatusPill } from '../../components/ui';
import { DashShell, RequireRole, RequestCard, DashTitle } from './shared';
import { score } from '../../data/derive';
import { fmtDateTime, toLocalInput, roundLabel, timeAgo } from '../../format';

export default function StaffDashboard() {
  return <RequireRole roles={['host', 'organizer', 'god']}>{(u) => <StaffInner u={u} />}</RequireRole>;
}

/* ---------------- Match-day control ---------------- */
const EV_TYPES: { id: EventType; label: string }[] = [
  { id: 'goal', label: '⚽ Goal' }, { id: 'penalty', label: '⚽ Penalty' }, { id: 'own_goal', label: '⚽ Own goal' },
  { id: 'yellow', label: '🟨 Yellow' }, { id: 'red', label: '🟥 Red' }, { id: 'sub', label: '⇄ Sub' },
];

function MatchControl({ u, initial }: { u: User; initial?: string }) {
  const { db, updateMatch, addEvent, removeEvent, submitResult } = useStore();
  const L = useLookup();
  const mine = db.matches.filter((m) => canRunMatch(u, m) && m.homeId && m.status !== 'finished').sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const [matchId, setMatchId] = useState(initial && mine.some((m) => m.id === initial) ? initial : mine[0]?.id ?? '');
  const m = db.matches.find((x) => x.id === matchId);
  const [type, setType] = useState<EventType>('goal');
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [assistId, setAssistId] = useState('');
  const [outId, setOutId] = useState('');
  const [minute, setMinute] = useState(1);
  const [note, setNote] = useState('');
  const [stats, setStats] = useState<MatchStats>(m?.stats ?? { possession: [50, 50], shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0], passes: [0, 0] });

  useEffect(() => {
    if (!m) return;
    setTeamId(m.homeId ?? ''); setPlayerId(''); setAssistId(''); setOutId('');
    setMinute(m.liveMinute ?? 1);
    setStats(m.stats ?? { possession: [50, 50], shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0], passes: [0, 0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  if (!mine.length) return <Empty>{u.role === 'host' ? 'No upcoming matches at your assigned venues.' : 'No matches available for match-day control.'}</Empty>;
  if (!m) return null;
  const home = L.team(m.homeId)!;
  const away = L.team(m.awayId)!;
  const [h, a] = score(m);
  const squad = db.players.filter((p) => p.teamId === teamId && p.active).sort((x, y) => x.number - y.number);
  const locked = m.status === 'awaiting_verification';
  const statRow = (k: keyof MatchStats, label: string) => (
    <div className="row" key={k} style={{ gap: 6 }}>
      <input type="number" min={0} value={stats[k][0]} onChange={(e) => setStats({ ...stats, [k]: k === 'possession' ? [Number(e.target.value), 100 - Number(e.target.value)] : [Number(e.target.value), stats[k][1]] })} style={{ width: 70 }} aria-label={`${home.short} ${label}`} />
      <span className="small" style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,.7)' }}>{label}</span>
      <input type="number" min={0} value={stats[k][1]} disabled={k === 'possession'} onChange={(e) => setStats({ ...stats, [k]: [stats[k][0], Number(e.target.value)] })} style={{ width: 70 }} aria-label={`${away.short} ${label}`} />
    </div>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <label className="field" style={{ maxWidth: 520 }}>Match
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
          {mine.map((x) => <option key={x.id} value={x.id}>{roundLabel(x.stage, x.round)} · {L.team(x.homeId)?.short} v {L.team(x.awayId)?.short} · {fmtDateTime(x.kickoff)} · {L.venue(x.venueId)?.name}</option>)}
        </select>
      </label>

      <div className="live-console">
        <div className="row-between wrap"><StatusPill m={m} /><span className="small" style={{ opacity: .7 }}>{L.venue(m.venueId)?.name} · Ref {m.referee}</span></div>
        <div className="mc-score" style={{ margin: '14px 0' }}>
          <div className="side"><Crest team={home} size={54} /><b>{home.name}</b></div>
          <div className="sc">{h} – {a}</div>
          <div className="side"><Crest team={away} size={54} /><b>{away.name}</b></div>
        </div>
        <div className="row wrap" style={{ justifyContent: 'center' }}>
          {m.status === 'scheduled' || m.status === 'postponed' ? (
            <button className="btn btn-red" onClick={() => updateMatch(m.id, { status: 'live', liveMinute: 1 }, 'kick-off')}>▶ Kick off</button>
          ) : m.status === 'live' ? (
            <>
              <label className="row small" style={{ color: '#fff' }}>Clock
                <input type="number" min={1} max={130} value={m.liveMinute ?? 1} onChange={(e) => updateMatch(m.id, { liveMinute: Number(e.target.value) })} style={{ width: 80 }} />′
              </label>
              <button className="btn btn-ghost-light btn-sm" onClick={() => updateMatch(m.id, { liveMinute: 45 })}>HT (45′)</button>
              <button className="btn btn-ghost-light btn-sm" onClick={() => updateMatch(m.id, { liveMinute: Math.min(130, (m.liveMinute ?? 0) + 5) })}>+5′</button>
            </>
          ) : <span className="pill pill-warn">Submitted — waiting for God Admin verification</span>}
        </div>
      </div>

      {m.status === 'live' && (
        <div className="grid grid-2">
          <div className="card card-pad">
            <h3>Log an event</h3>
            <div className="ev-buttons" style={{ marginBottom: 14 }}>
              {EV_TYPES.map((t) => <button key={t.id} className={`chip ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>{t.label}</button>)}
            </div>
            <form className="stack" onSubmit={(e) => {
              e.preventDefault();
              if (!playerId) return;
              addEvent(m.id, { type, teamId, playerId, minute, assistId: (type === 'goal' && assistId) || undefined, playerOutId: (type === 'sub' && outId) || undefined });
              setPlayerId(''); setAssistId(''); setOutId('');
            }}>
              <div className="form-grid">
                <label className="field">{type === 'own_goal' ? 'Player’s team (scored against)' : 'Team'}
                  <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setPlayerId(''); setAssistId(''); setOutId(''); }}>
                    <option value={home.id}>{home.name}</option><option value={away.id}>{away.name}</option>
                  </select>
                </label>
                <label className="field">Minute<input type="number" min={1} max={130} value={minute} onChange={(e) => setMinute(Number(e.target.value))} /></label>
              </div>
              <label className="field">{type === 'sub' ? 'Player on' : 'Player'}
                <select required value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                  <option value="">Select…</option>
                  {squad.map((p) => <option key={p.id} value={p.id}>#{p.number} {p.name} ({p.position})</option>)}
                </select>
              </label>
              {type === 'goal' && (
                <label className="field">Assist (optional)
                  <select value={assistId} onChange={(e) => setAssistId(e.target.value)}>
                    <option value="">None</option>
                    {squad.filter((p) => p.id !== playerId).map((p) => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                  </select>
                </label>
              )}
              {type === 'sub' && (
                <label className="field">Player off
                  <select value={outId} onChange={(e) => setOutId(e.target.value)}>
                    <option value="">Select…</option>
                    {squad.filter((p) => p.id !== playerId).map((p) => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                  </select>
                </label>
              )}
              <button className="btn btn-primary btn-sm">Add event</button>
            </form>
          </div>
          <div className="card card-pad">
            <h3>Timeline</h3>
            {m.events.length === 0 && <Empty>No events yet.</Empty>}
            {m.events.map((e) => (
              <div className="list-row" key={e.id} style={{ padding: '8px 0' }}>
                <b style={{ width: 36, fontFamily: 'var(--display)' }}>{e.minute}′</b>
                <Crest team={L.team(e.teamId)} size={18} />
                <span style={{ flex: 1 }} className="small">{EV_TYPES.find((t) => t.id === e.type)?.label} — {L.player(e.playerId)?.name}{e.assistId ? ` (A: ${L.player(e.assistId)?.name})` : ''}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => removeEvent(m.id, e.id)} aria-label="Remove event">✕</button>
              </div>
            ))}
          </div>
          <div className="live-console stack" style={{ gap: 8 }}>
            <h3 style={{ marginBottom: 4 }}>Match stats</h3>
            <div className="row-between small" style={{ color: 'var(--gold)' }}><b>{home.short}</b><b>{away.short}</b></div>
            {statRow('possession', 'Possession %')}{statRow('shots', 'Shots')}{statRow('onTarget', 'On target')}{statRow('corners', 'Corners')}{statRow('fouls', 'Fouls')}{statRow('passes', 'Passes')}
            <button className="btn btn-turq btn-sm" onClick={() => updateMatch(m.id, { stats })}>Save stats</button>
          </div>
          <div className="card card-pad">
            <h3>Final whistle</h3>
            <p className="muted small">Submitting sends the score and timeline to the God Admin. The result only counts in the table once verified. If rejected, the match returns to live so you can correct it.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes for the God Admin (incidents, attendance, VAR…)" />
            <div className="form-actions"><button className="btn btn-red" disabled={locked} onClick={() => { updateMatch(m.id, { stats }); submitResult(m.id, note); setNote(''); }}>■ Submit {h}–{a} for verification</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Fixture change proposals ---------------- */
function FixtureProposal({ m, onClose, onDone }: { m: Match; onClose: () => void; onDone: (ok: boolean, msg: string) => void }) {
  const { db, submitRequest } = useStore();
  const L = useLookup();
  const [kickoff, setKickoff] = useState(toLocalInput(m.kickoff));
  const [venueId, setVenueId] = useState(m.venueId);
  const [reason, setReason] = useState('');
  return (
    <Modal title={`Propose change: ${L.team(m.homeId)?.name ?? m.homeLabel} vs ${L.team(m.awayId)?.name ?? m.awayLabel}`} onClose={onClose}>
      <form className="stack" onSubmit={(e) => {
        e.preventDefault();
        const iso = new Date(kickoff).toISOString();
        const r = submitRequest({ type: 'fixture_change', matchId: m.id, reason, payload: { proposedKickoff: iso !== m.kickoff ? iso : undefined, proposedVenueId: venueId !== m.venueId ? venueId : undefined } });
        onDone(r.ok, r.message);
        if (r.ok) onClose();
      }}>
        <div className="form-grid">
          <label className="field">New kickoff<input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} /></label>
          <label className="field">Venue<select value={venueId} onChange={(e) => setVenueId(e.target.value)}>{db.venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        </div>
        <label className="field">Reason<textarea required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Pitch maintenance, broadcast slot, security advice…" /></label>
        <div className="muted small">Changes are sensitive: this goes to the God Admin and only applies after approval.</div>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" disabled={toLocalInput(m.kickoff) === kickoff && venueId === m.venueId}>Send to God Admin</button></div>
      </form>
    </Modal>
  );
}

/* ---------------- News editor ---------------- */
function NewsEditor({ n, onClose }: { n?: NewsItem; onClose: () => void }) {
  const { db, saveNews } = useStore();
  const [title, setTitle] = useState(n?.title ?? '');
  const [summary, setSummary] = useState(n?.summary ?? '');
  const [body, setBody] = useState(n?.body ?? '');
  const [category, setCategory] = useState<NewsItem['category']>(n?.category ?? 'Report');
  const [teamIds, setTeamIds] = useState<string[]>(n?.teamIds ?? []);
  return (
    <Modal title={n ? 'Edit article' : 'New article'} onClose={onClose} wide>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); saveNews({ id: n?.id, title, summary, body, category, teamIds }); onClose(); }}>
        <label className="field">Headline<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="field">Summary<input required value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
        <label className="field">Category
          <select value={category} onChange={(e) => setCategory(e.target.value as NewsItem['category'])}>
            {['Report', 'Preview', 'Feature', 'Interview', 'Announcement'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">Body (blank line between paragraphs)<textarea required rows={8} value={body} onChange={(e) => setBody(e.target.value)} /></label>
        <div>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Tag clubs</div>
          <div className="row wrap">{db.teams.map((t) => (
            <button type="button" key={t.id} className={`chip row ${teamIds.includes(t.id) ? 'active' : ''}`} onClick={() => setTeamIds(teamIds.includes(t.id) ? teamIds.filter((x) => x !== t.id) : [...teamIds, t.id])}><Crest team={t} size={16} />{t.short}</button>
          ))}</div>
        </div>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm">{n ? 'Save' : 'Publish'}</button></div>
      </form>
    </Modal>
  );
}

function HighlightForm({ onClose }: { onClose: () => void }) {
  const { db, addHighlight } = useStore();
  const L = useLookup();
  const [title, setTitle] = useState('');
  const [matchId, setMatchId] = useState('');
  const [kind, setKind] = useState<Highlight['kind']>('Goals');
  const [duration, setDuration] = useState('3:30');
  const [url, setUrl] = useState('');
  const ytId = (s: string) => s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1] ?? (/^[\w-]{11}$/.test(s) ? s : undefined);
  return (
    <Modal title="Add highlight" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); addHighlight({ title, matchId: matchId || undefined, kind, duration, date: new Date().toISOString(), youtubeId: ytId(url.trim()) }); onClose(); }}>
        <label className="field">Title<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className="form-grid">
          <label className="field">Type<select value={kind} onChange={(e) => setKind(e.target.value as Highlight['kind'])}>{['Goals', 'Extended', 'Saves', 'Skills', 'Interview'].map((k) => <option key={k}>{k}</option>)}</select></label>
          <label className="field">Duration<input value={duration} onChange={(e) => setDuration(e.target.value)} pattern="\d{1,2}:\d{2}" /></label>
        </div>
        <label className="field">Match (optional)
          <select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
            <option value="">None</option>
            {db.matches.filter((m) => m.status === 'finished').map((m) => <option key={m.id} value={m.id}>{roundLabel(m.stage, m.round)} · {L.team(m.homeId)?.short} v {L.team(m.awayId)?.short}</option>)}
          </select>
        </label>
        <label className="field">YouTube link or ID (optional)<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" /></label>
        {url && !ytId(url.trim()) && <div className="small" style={{ color: 'var(--danger)' }}>That doesn’t look like a YouTube link — an animated recap will be shown instead.</div>}
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm">Add</button></div>
      </form>
    </Modal>
  );
}

function VenueEditor({ v, onClose }: { v: Venue; onClose: () => void }) {
  const { updateVenue } = useStore();
  const [f, setF] = useState(v);
  const field = (k: keyof Venue, label: string, type = 'text') => (
    <label className="field">{label}<input type={type} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>
  );
  return (
    <Modal title={`Edit ${v.name}`} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); updateVenue(v.id, f); onClose(); }}>
        {field('name', 'Name')}{field('address', 'Address')}{field('capacity', 'Capacity', 'number')}{field('surface', 'Surface')}{field('transit', 'Public transport')}{field('parking', 'Parking')}
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm">Save venue</button></div>
      </form>
    </Modal>
  );
}

function TeamEditor({ t, onClose }: { t: Team; onClose: () => void }) {
  const { updateTeam } = useStore();
  const [coach, setCoach] = useState(t.coach);
  const [bio, setBio] = useState(t.bio);
  const [c1, setC1] = useState(t.colors[0]);
  const [c2, setC2] = useState(t.colors[1]);
  return (
    <Modal title={`Edit ${t.name}`} onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); updateTeam(t.id, { coach, bio, colors: [c1, c2] }); onClose(); }}>
        <label className="field">Head coach<input value={coach} onChange={(e) => setCoach(e.target.value)} /></label>
        <label className="field">Club bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} /></label>
        <div className="form-grid">
          <label className="field">Primary colour<input type="color" value={c1} onChange={(e) => setC1(e.target.value)} style={{ height: 44 }} /></label>
          <label className="field">Secondary colour<input type="color" value={c2} onChange={(e) => setC2(e.target.value)} style={{ height: 44 }} /></label>
        </div>
        <div className="row"><Crest team={{ ...t, colors: [c1, c2] }} size={48} /><span className="muted small">Preview</span></div>
        <div className="form-actions"><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm">Save club</button></div>
      </form>
    </Modal>
  );
}

function Recommend({ id }: { id: string }) {
  const { recommend } = useStore();
  const [note, setNote] = useState('');
  return (
    <div className="row wrap">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your recommendation to the God Admin" style={{ flex: 1, minWidth: 200 }} aria-label="Recommendation note" />
      <button className="btn btn-ok btn-sm" onClick={() => { recommend(id, 'support', note || 'No objection.'); setNote(''); }}>👍 Support</button>
      <button className="btn btn-red btn-sm" onClick={() => { recommend(id, 'oppose', note || 'Not recommended.'); setNote(''); }}>👎 Oppose</button>
    </div>
  );
}

/* ---------------- Main ---------------- */
function StaffInner({ u }: { u: User }) {
  const { db, deleteNews, deleteHighlight, cancelRequest } = useStore();
  const L = useLookup();
  const [params] = useSearchParams();
  const { flash, node } = useFlash();
  const [section, setSection] = useState(params.get('match') ? 'matchday' : 'overview');
  const [proposal, setProposal] = useState<Match | null>(null);
  const [news, setNews] = useState<NewsItem | 'new' | null>(null);
  const [addHl, setAddHl] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const can = {
    matchday: has(u, 'enter_results'), fixtures: has(u, 'manage_fixtures'), review: has(u, 'review_requests'),
    news: has(u, 'publish_news'), highlights: has(u, 'manage_highlights'), venues: has(u, 'manage_venues'), teams: has(u, 'manage_teams'),
  };
  const reviewable = db.requests.filter((r) => r.status === 'pending' && (r.type === 'reschedule' || r.type === 'add_player' || r.type === 'remove_player'));
  const mine = db.requests.filter((r) => r.createdBy === u.id);
  const myMatches = db.matches.filter((m) => canRunMatch(u, m) && m.status !== 'finished' && m.homeId).sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const sections = [
    { id: 'overview', label: 'Overview', icon: '◎', group: 'Workspace' },
    can.matchday && { id: 'matchday', label: 'Match-day control', icon: '⏱', badge: db.matches.filter((m) => m.status === 'live' && canRunMatch(u, m)).length, group: 'Workspace' },
    can.fixtures && { id: 'fixtures', label: 'Fixtures', icon: '📅', group: 'Workspace' },
    can.review && { id: 'review', label: 'Review requests', icon: '⚖', badge: reviewable.filter((r) => !r.recommendations.some((x) => x.userId === u.id)).length, group: 'Workspace' },
    can.news && { id: 'news', label: 'News', icon: '📰', group: 'Content' },
    can.highlights && { id: 'highlights', label: 'Highlights', icon: '🎬', group: 'Content' },
    can.venues && { id: 'venues', label: 'Venues', icon: '🏟', group: 'Content' },
    can.teams && { id: 'teams', label: 'Team info', icon: '🛡', group: 'Content' },
    { id: 'mine', label: 'My submissions', icon: '📨', badge: mine.filter((r) => r.status === 'pending').length, group: 'Workspace' },
  ].filter(Boolean) as { id: string; label: string; icon: string; badge?: number; group?: string }[];

  return (
    <DashShell sections={sections} active={section} onSelect={setSection} accent={u.role === 'host' ? '#1fb5b0' : '#2456d6'}>
      {node}
      {section === 'overview' && (
        <>
          <DashTitle kicker={`${ROLE_LABEL[u.role]} workspace`} title={`Hi, ${u.name.split(' ')[0]}`} />
          <div className="grid grid-2" style={{ marginBottom: 20 }}>
            <div className="card card-pad">
              <h3>Your privileges</h3>
              <p className="muted small">Granted by the God Admin. Sensitive changes you make are sent for approval.</p>
              <div className="stack" style={{ gap: 6 }}>
                {ALL_PRIVILEGES.map((p) => (
                  <div key={p.id} className="row small" style={{ opacity: u.privileges.includes(p.id) ? 1 : 0.4 }}>
                    <span>{u.privileges.includes(p.id) ? '✅' : '⛔'}</span><b>{p.label}</b><span className="muted">— {p.hint}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-pad">
              <h3>{u.role === 'host' ? 'Your venues' : 'Quick stats'}</h3>
              {u.role === 'host' ? (
                (u.venueIds ?? []).length ? (u.venueIds ?? []).map((id) => { const v = L.venue(id); return v && <div key={id} className="list-row"><b>{v.name}</b><span className="muted small">{v.city} · {v.capacity.toLocaleString()}</span></div>; }) : <Empty>No venues assigned yet.</Empty>
              ) : (
                <div className="kpis" style={{ marginBottom: 0 }}>
                  <div className="kpi"><span>Requests to review</span><b>{reviewable.length}</b></div>
                  <div className="kpi" style={{ ['--k' as string]: 'var(--gold)' }}><span>Articles</span><b>{db.news.filter((n) => n.authorId === u.id).length}</b></div>
                </div>
              )}
            </div>
          </div>
          {can.matchday && (
            <div className="card card-pad">
              <h3>Upcoming matches you control</h3>
              {myMatches.length === 0 && <Empty>None scheduled.</Empty>}
              {myMatches.slice(0, 6).map((m) => (
                <div className="list-row" key={m.id}>
                  <StatusPill m={m} />
                  <span className="row" style={{ flex: 1 }}><Crest team={L.team(m.homeId)} size={20} /><b>{L.team(m.homeId)?.name}</b> v <b>{L.team(m.awayId)?.name}</b></span>
                  <span className="muted small">{fmtDateTime(m.kickoff)} · {L.venue(m.venueId)?.name}</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => setSection('matchday')}>Control</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {section === 'matchday' && can.matchday && (
        <>
          <DashTitle kicker="Live operations" title="Match-day control" />
          <MatchControl u={u} initial={params.get('match') ?? undefined} />
        </>
      )}

      {section === 'fixtures' && can.fixtures && (
        <>
          <DashTitle kicker="Scheduling" title="Fixtures" />
          <p className="muted">Propose a new kickoff time or venue. Every change needs God Admin approval.</p>
          <div className="card card-pad">
            {db.matches.filter((m) => m.status === 'scheduled' || m.status === 'postponed').map((m) => {
              const pend = db.requests.some((r) => r.matchId === m.id && r.status === 'pending' && r.type !== 'result');
              return (
                <div className="list-row" key={m.id}>
                  <span className="muted small" style={{ width: 100 }}>{roundLabel(m.stage, m.round)}</span>
                  <span className="row" style={{ flex: 1, minWidth: 200 }}><Crest team={L.team(m.homeId)} label={m.homeLabel} size={20} /><b>{L.team(m.homeId)?.short ?? m.homeLabel}</b> v <b>{L.team(m.awayId)?.short ?? m.awayLabel}</b></span>
                  <span className="small">{fmtDateTime(m.kickoff)} · {L.venue(m.venueId)?.name}</span>
                  {pend ? <span className="pill pill-warn">Change pending</span> : <button className="btn btn-ghost btn-xs" onClick={() => setProposal(m)}>Propose change</button>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {section === 'review' && can.review && (
        <>
          <DashTitle kicker="Advise the God Admin" title="Review requests" />
          <p className="muted">Add your recommendation to captain requests. The God Admin sees it before deciding.</p>
          {reviewable.length === 0 && <Empty>No captain requests pending.</Empty>}
          {reviewable.map((r) => <RequestCard key={r.id} r={r} actions={<Recommend id={r.id} />} />)}
        </>
      )}

      {section === 'news' && can.news && (
        <>
          <DashTitle kicker="Content" title="News"><button className="btn btn-primary btn-sm" onClick={() => setNews('new')}>+ New article</button></DashTitle>
          <div className="card card-pad">
            {db.news.map((n) => (
              <div className="list-row" key={n.id}>
                <span className="pill pill-ghost">{n.category}</span>
                <Link to={`/news/${n.id}`} style={{ flex: 1, minWidth: 200 }}><b>{n.title}</b><div className="muted small">{L.user(n.authorId)?.name} · {timeAgo(n.date)}</div></Link>
                <button className="btn btn-ghost btn-xs" onClick={() => setNews(n)}>Edit</button>
                <button className="btn btn-ghost btn-xs" onClick={() => confirm('Delete this article?') && deleteNews(n.id)}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'highlights' && can.highlights && (
        <>
          <DashTitle kicker="Content" title="Highlights"><button className="btn btn-primary btn-sm" onClick={() => setAddHl(true)}>+ Add highlight</button></DashTitle>
          <div className="card card-pad">
            {db.highlights.map((h) => (
              <div className="list-row" key={h.id}>
                <span className="pill pill-ghost">{h.kind}</span>
                <span style={{ flex: 1, minWidth: 200 }}><b>{h.title}</b><div className="muted small">{h.duration} · {h.youtubeId ? 'YouTube' : 'Animated recap'} · {timeAgo(h.date)}</div></span>
                <button className="btn btn-ghost btn-xs" onClick={() => confirm('Remove this highlight?') && deleteHighlight(h.id)}>Remove</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'venues' && can.venues && (
        <>
          <DashTitle kicker="Content" title="Venues" />
          <div className="grid grid-2">
            {db.venues.filter((v) => u.role !== 'host' || u.venueIds?.includes(v.id)).map((v) => (
              <div className="card card-pad" key={v.id}>
                <div className="row-between"><h3 style={{ margin: 0 }}>{v.name}</h3><button className="btn btn-ghost btn-xs" onClick={() => setVenue(v)}>Edit</button></div>
                <div className="info-list" style={{ marginTop: 12 }}>
                  <div><span>📍</span><span>{v.address}</span></div><div><span>🚇</span><span>{v.transit}</span></div><div><span>🅿️</span><span>{v.parking}</span></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'teams' && can.teams && (
        <>
          <DashTitle kicker="Content" title="Team info" />
          <p className="muted">Edit public club information. Squad changes are handled by captains and approved by the God Admin.</p>
          <div className="grid grid-2">
            {db.teams.map((t) => (
              <div className="card card-pad row" key={t.id}>
                <Crest team={t} size={44} />
                <div style={{ flex: 1 }}><b>{t.name}</b><div className="muted small">Coach: {t.coach}</div></div>
                <button className="btn btn-ghost btn-xs" onClick={() => setTeam(t)}>Edit</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'mine' && (
        <>
          <DashTitle kicker="Tracking" title="My submissions" />
          {mine.length === 0 && <Empty>You haven't submitted anything yet.</Empty>}
          {mine.map((r) => <RequestCard key={r.id} r={r} actions={r.status === 'pending' && r.type !== 'result' ? <button className="btn btn-ghost btn-xs" onClick={() => cancelRequest(r.id)}>Withdraw</button> : undefined} />)}
        </>
      )}

      {proposal && <FixtureProposal m={proposal} onClose={() => setProposal(null)} onDone={flash} />}
      {news && <NewsEditor n={news === 'new' ? undefined : news} onClose={() => setNews(null)} />}
      {addHl && <HighlightForm onClose={() => setAddHl(false)} />}
      {venue && <VenueEditor v={venue} onClose={() => setVenue(null)} />}
      {team && <TeamEditor t={team} onClose={() => setTeam(null)} />}
    </DashShell>
  );
}
