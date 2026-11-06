import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Match, MatchEvent } from '../types';
import { useStore, useLookup, canRunMatch } from '../store/store';
import { Crest, Empty, StatusPill, Countdown, Avatar, StadiumIcon } from '../components/ui';
import { PageHead, FixtureRow } from '../components/blocks';
import { score, hasScore, resolveSlot, teamMatches, resultFor } from '../data/derive';
import { C } from '../theme';
import { fmtDate, fmtLong, fmtTime, mapsEmbed, mapsUrl, roundLabel, downloadIcs } from '../format';

export default function Matches() {
  const { db, user } = useStore();
  const rounds = [...new Set(db.matches.map((m) => `${m.stage}:${m.round}`))];
  const current = db.matches.filter((m) => m.status !== 'finished').sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const [round, setRound] = useState<string>(current ? `${current.stage}:${current.round}` : rounds[0]);
  const [team, setTeam] = useState(user?.teamId ?? '');

  const list = useMemo(() => {
    const ms = team ? teamMatches(db, team) : db.matches.filter((m) => `${m.stage}:${m.round}` === round);
    const byDay = new Map<string, Match[]>();
    [...ms].sort((a, b) => a.kickoff.localeCompare(b.kickoff)).forEach((m) => {
      const k = fmtLong(m.kickoff);
      byDay.set(k, [...(byDay.get(k) ?? []), m]);
    });
    return [...byDay.entries()];
  }, [db, round, team]);

  return (
    <>
      <PageHead kicker="Fixtures & results" title="Matches" sub="Every league fixture and the Final Four. Kickoff times are shown in your local time zone." />
      <section className="section">
        <div className="container">
          <div className="row-between wrap" style={{ marginBottom: 22 }}>
            <div className="chips" style={{ opacity: team ? 0.4 : 1 }}>
              {rounds.map((r) => {
                const [stage, n] = r.split(':');
                return <button key={r} className={`chip ${!team && round === r ? 'active' : ''}`} onClick={() => { setRound(r); setTeam(''); }}>{stage === 'league' ? `MD${n}` : stage === 'semi' ? 'Semis' : 'Final'}</button>;
              })}
            </div>
            <select value={team} onChange={(e) => setTeam(e.target.value)} style={{ maxWidth: 240 }} aria-label="Filter by club">
              <option value="">All clubs (by round)</option>
              {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name} — full season</option>)}
            </select>
          </div>
          {list.length === 0 && <Empty>No matches.</Empty>}
          {list.map(([day, ms]) => (
            <div className="fixture-day" key={day}>
              <div className="fixture-day-title">{day}</div>
              {ms.map((m) => <FixtureRow key={m.id} m={m} />)}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function EventIcon({ e }: { e: MatchEvent }) {
  if (e.type === 'yellow') return <span className="ev-icon"><span className="card-y" /></span>;
  if (e.type === 'red') return <span className="ev-icon"><span className="card-r" /></span>;
  if (e.type === 'sub') return <span className="ev-icon">⇄</span>;
  return <span className="ev-icon">⚽</span>;
}

function StatBar({ label, v, colors, pct = false }: { label: string; v: [number, number]; colors: [string, string]; pct?: boolean }) {
  const total = v[0] + v[1] || 1;
  return (
    <div className="stat-bar">
      <div className="stat-bar-label"><span>{v[0]}{pct ? '%' : ''}</span><span>{label}</span><span>{v[1]}{pct ? '%' : ''}</span></div>
      <div className="stat-bar-track">
        <div style={{ width: `${(v[0] / total) * 100}%`, background: colors[0] }} />
        <div style={{ width: `${(v[1] / total) * 100}%`, background: colors[1] }} />
      </div>
    </div>
  );
}

export function MatchDetail() {
  const { id } = useParams();
  const { db, user, vote } = useStore();
  const L = useLookup();
  const [tab, setTab] = useState<'overview' | 'stats' | 'squads' | 'venue'>('overview');
  const m = db.matches.find((x) => x.id === id);
  if (!m) return <section className="section"><div className="container"><Empty>Match not found.</Empty></div></section>;

  const homeId = resolveSlot(db, m, 'home');
  const awayId = resolveSlot(db, m, 'away');
  const home = L.team(homeId);
  const away = L.team(awayId);
  const venue = L.venue(m.venueId)!;
  const [h, a] = score(m);
  const goals = m.events.filter((e) => e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal');
  const scorersFor = (teamId: string | null) => goals
    .filter((g) => (g.type === 'own_goal' ? g.teamId !== teamId : g.teamId === teamId))
    .map((g) => `${L.player(g.playerId)?.name.split(' ').slice(-1)[0]} ${g.minute}'${g.type === 'penalty' ? ' (P)' : g.type === 'own_goal' ? ' (OG)' : ''}`);
  const colors: [string, string] = [C.turq, C.red];

  // Player of the Match voting (fans and anyone signed in) — open once the match is finished.
  const votes = Object.values(db.motmVotes).map((v) => v[m.id]).filter(Boolean);
  const tally = new Map<string, number>();
  votes.forEach((p) => tally.set(p, (tally.get(p) ?? 0) + 1));
  const myVote = user ? db.motmVotes[user.id]?.[m.id] : undefined;
  const candidates = [...new Set(m.events.filter((e) => e.type === 'goal' || e.type === 'penalty').flatMap((e) => [e.playerId, e.assistId]).filter(Boolean) as string[])];
  if (candidates.length < 4) {
    db.players.filter((p) => p.active && (p.teamId === m.homeId || p.teamId === m.awayId) && (p.position === 'GK' || p.position === 'MF')).slice(0, 4 - candidates.length).forEach((p) => candidates.push(p.id));
  }

  const h2h = home && away ? db.matches.filter((x) => x.status === 'finished' && x.id !== m.id && ((x.homeId === home.id && x.awayId === away.id) || (x.homeId === away.id && x.awayId === home.id))) : [];

  return (
    <>
      <section className="mc-hero">
        <div className="container">
          <div className="row-between wrap">
            <span className="kicker" style={{ margin: 0 }}>{roundLabel(m.stage, m.round)} · {fmtLong(m.kickoff)}</span>
            <StatusPill m={m} />
          </div>
          <div className="mc-score">
            <div className="side"><Crest team={home} label={m.homeLabel} size={92} />{home ? <Link to={`/teams/${home.id}`}>{home.name}</Link> : <span>{m.homeLabel}</span>}</div>
            {hasScore(m) ? <div className="sc">{h} – {a}</div> : <div className="ko">{fmtTime(m.kickoff)}</div>}
            <div className="side"><Crest team={away} label={m.awayLabel} size={92} />{away ? <Link to={`/teams/${away.id}`}>{away.name}</Link> : <span>{m.awayLabel}</span>}</div>
          </div>
          {hasScore(m) && goals.length > 0 && (
            <div className="mc-scorers"><div>{scorersFor(m.homeId).join(', ')}</div><div>{scorersFor(m.awayId).join(', ')}</div></div>
          )}
          {m.status === 'scheduled' && <div style={{ maxWidth: 380, margin: '10px auto 0' }}><Countdown to={m.kickoff} /></div>}
          <div className="row wrap" style={{ justifyContent: 'center', marginTop: 20, gap: 10 }}>
            <span className="small muted-light venue-inline"><StadiumIcon size={15} />{venue.name}, {venue.city}</span>
            <span className="small muted-light">· Referee {m.referee}</span>
            {m.attendance && <span className="small muted-light">· Attendance {m.attendance.toLocaleString()}</span>}
          </div>
          <div className="row wrap" style={{ justifyContent: 'center', marginTop: 16 }}>
            {m.status === 'scheduled' && home && away && (
              <button className="btn btn-ghost-light btn-sm" onClick={() => downloadIcs(`${home.short}-${away.short}.ics`, [{ uid: m.id, title: `${home.name} vs ${away.name}`, start: m.kickoff, durationMin: 120, location: `${venue.name}, ${venue.address}` }])}>+ Add to calendar</button>
            )}
            {canRunMatch(user, m) && <Link to={`/dashboard/staff?match=${m.id}`} className="btn btn-gold btn-sm">Open match control</Link>}
          </div>
        </div>
      </section>
      <div className="page-head-accent" />

      <section className="section">
        <div className="container">
          <div className="tabs" role="tablist">
            {(['overview', 'stats', 'squads', 'venue'] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t === 'overview' ? 'Overview' : t === 'stats' ? 'Stats' : t === 'squads' ? 'Squads' : 'Venue & travel'}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-main">
              <div className="card card-pad">
                <h3>Timeline</h3>
                {m.events.length === 0 ? <Empty>{m.status === 'scheduled' ? 'The match has not started yet.' : 'No events recorded.'}</Empty> : (
                  <div className="timeline">
                    {m.events.map((e) => {
                      const isHome = e.teamId === m.homeId;
                      const content = (
                        <>
                          <EventIcon e={e} />
                          <span><Link to={`/players/${e.playerId}`} className="player-link">{L.player(e.playerId)?.name}</Link>
                            {e.type === 'penalty' && ' (pen)'}{e.type === 'own_goal' && ' (OG)'}
                            {e.assistId && <span className="muted small"><br />Assist: {L.player(e.assistId)?.name}</span>}
                            {e.playerOutId && <span className="muted small"><br />Off: {L.player(e.playerOutId)?.name}</span>}
                          </span>
                        </>
                      );
                      return (
                        <div className="tl-item" key={e.id}>
                          <div className="ev home">{isHome && content}</div>
                          <div className="min">{e.minute}'</div>
                          <div className="ev">{!isHome && content}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="stack" style={{ gap: 20 }}>
                {m.status === 'finished' && home && away && (
                  <div className="card card-pad">
                    <h3>Player of the Match</h3>
                    <p className="muted small">{user ? (myVote ? 'Thanks for voting! You can change your pick.' : 'Cast your vote.') : <><Link to="/login" className="link-btn">Sign in</Link> to vote.</>}</p>
                    <div className="stack" style={{ gap: 8 }}>
                      {candidates.slice(0, 6).map((pid) => {
                        const p = L.player(pid);
                        if (!p) return null;
                        const n = tally.get(pid) ?? 0;
                        const pct = votes.length ? Math.round((n / votes.length) * 100) : 0;
                        return (
                          <button key={pid} disabled={!user} onClick={() => vote(m.id, pid)} className="demo-account" style={{ borderColor: myVote === pid ? 'var(--turq)' : undefined, position: 'relative', overflow: 'hidden' }}>
                            <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'rgba(31,181,176,.12)' }} />
                            <Crest team={L.team(p.teamId)} size={22} />
                            <span style={{ position: 'relative', flex: 1 }}><b>{p.name}</b><small>{p.position} · #{p.number}</small></span>
                            <span style={{ position: 'relative', fontWeight: 700 }}>{votes.length ? `${pct}%` : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {home && away && (
                  <div className="card card-pad">
                    <h3>Form guide</h3>
                    {[home, away].map((t) => (
                      <div key={t.id} className="row-between" style={{ marginBottom: 10 }}>
                        <span className="row"><Crest team={t} size={22} /><b>{t.short}</b></span>
                        <span className="row" style={{ gap: 4 }}>{teamMatches(db, t.id).filter((x) => x.status === 'finished').slice(-5).map((x) => { const r = resultFor(x, t.id)!; return <Link to={`/matches/${x.id}`} key={x.id} className={`form form-${r}`}>{r}</Link>; })}</span>
                      </div>
                    ))}
                    {h2h.length > 0 && <><div className="divider" /><div className="small muted">Previous meeting this season</div>{h2h.map((x) => { const [sh, sa] = score(x); return <Link key={x.id} to={`/matches/${x.id}`} className="row" style={{ marginTop: 6 }}><b>{L.team(x.homeId)?.short} {sh}–{sa} {L.team(x.awayId)?.short}</b><span className="muted small">{fmtDate(x.kickoff)}</span></Link>; })}</>}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'stats' && (
            <div className="card card-pad" style={{ maxWidth: 720, margin: '0 auto' }}>
              <div className="row-between" style={{ marginBottom: 18 }}>
                <span className="row"><Crest team={home} size={28} /><b>{home?.short}</b></span>
                <h3 style={{ margin: 0 }}>Match stats</h3>
                <span className="row"><b>{away?.short}</b><Crest team={away} size={28} /></span>
              </div>
              {m.stats ? (
                <>
                  <StatBar label="Possession" v={m.stats.possession} colors={colors} pct />
                  <StatBar label="Shots" v={m.stats.shots} colors={colors} />
                  <StatBar label="On target" v={m.stats.onTarget} colors={colors} />
                  <StatBar label="Passes" v={m.stats.passes} colors={colors} />
                  <StatBar label="Corners" v={m.stats.corners} colors={colors} />
                  <StatBar label="Fouls" v={m.stats.fouls} colors={colors} />
                </>
              ) : <Empty>Stats will appear once the match is played.</Empty>}
            </div>
          )}

          {tab === 'squads' && (
            <div className="grid grid-2">
              {[home, away].map((t, i) => t ? (
                <div className="card card-pad" key={t.id}>
                  <h3 className="row"><Crest team={t} size={28} />{t.name}</h3>
                  <p className="muted small">Head coach: {t.coach}</p>
                  {(['GK', 'DF', 'MF', 'FW'] as const).map((pos) => (
                    <div key={pos} style={{ marginBottom: 12 }}>
                      <div className="kicker" style={{ color: 'var(--muted)' }}>{{ GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' }[pos]}</div>
                      {db.players.filter((p) => p.teamId === t.id && p.active && p.position === pos).sort((x, y) => x.number - y.number).map((p) => (
                        <Link key={p.id} to={`/players/${p.id}`} className="row" style={{ padding: '5px 0' }}>
                          <span style={{ width: 26, fontFamily: 'var(--display)', fontWeight: 800 }}>{p.number}</span>{p.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              ) : <div className="card card-pad" key={i}><Empty>To be decided.</Empty></div>)}
            </div>
          )}

          {tab === 'venue' && (
            <div className="grid grid-2">
              <div className="card card-pad">
                <h3 className="row"><span className="venue-badge"><StadiumIcon size={18} /></span>{venue.name}</h3>
                <div className="info-list">
                  <div><span>📍</span><span>{venue.address}</span></div>
                  <div><span className="venue-ico"><StadiumIcon size={16} /></span><span>Capacity {venue.capacity.toLocaleString()} · {venue.surface}</span></div>
                  <div><span>🚇</span><span>{venue.transit}</span></div>
                  <div><span>🅿️</span><span>{venue.parking}</span></div>
                  <div><span>🕒</span><span>Gates open 90 minutes before kickoff ({fmtTime(new Date(new Date(m.kickoff).getTime() - 90 * 6e4).toISOString())})</span></div>
                </div>
                <a href={mapsUrl(`${venue.name}, ${venue.address}`)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: 18 }}>Get directions</a>
              </div>
              <iframe className="map-frame" style={{ height: '100%', minHeight: 280 }} src={mapsEmbed(`${venue.name} ${venue.address}`)} title={`Map of ${venue.name}`} loading="lazy" />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function PlayerMini({ id }: { id: string }) {
  const L = useLookup();
  const p = L.player(id);
  if (!p) return null;
  return <span className="row"><Avatar name={p.name} size={24} color={L.team(p.teamId)?.colors[0]} />{p.name}</span>;
}
