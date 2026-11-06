import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, useLookup } from '../store/store';
import { Crest, Jersey, FormBadge, Empty, MatchCard, Avatar, StadiumIcon, usePageTitle } from '../components/ui';
import { C } from '../theme';
import { isUpcoming } from '../data/rules';
import { PageHead } from '../components/blocks';
import { standings, teamMatches, teamSeasonStats, playerTotals } from '../data/derive';
import { fmtDate, mapsUrl } from '../format';

export default function Teams() {
  const { db, user } = useStore();
  const table = standings(db);
  return (
    <>
      <PageHead kicker="The clubs" title="Teams" sub="Twelve clubs. One trophy. Pick your side and follow every step." />
      <section className="section">
        <div className="container grid grid-4">
          {db.teams.map((t) => {
            const pos = table.findIndex((r) => r.team.id === t.id) + 1;
            const fav = user?.favoriteTeamId === t.id;
            return (
              <Link to={`/teams/${t.id}`} className="team-tile" key={t.id}>
                <div className="team-tile-top">
                  <Crest team={t} size={64} />
                </div>
                <div className="team-tile-body">
                  <div><b>{t.name}</b><div className="muted small">{t.city} · Est. {t.founded}</div></div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontFamily: 'var(--display)', fontSize: '1.5rem' }}>{pos}</b>
                    {fav && <div className="small" style={{ color: C.turqDeep, fontWeight: 700 }}>★ Following</div>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

export function TeamDetail() {
  const { id } = useParams();
  const { db, user, setFavorite } = useStore();
  const L = useLookup();
  const [tab, setTab] = useState<'overview' | 'squad' | 'fixtures' | 'stats'>('overview');
  const t = L.team(id);
  usePageTitle(t?.name ?? 'Club not found');
  if (!t) return <section className="section"><div className="container"><Empty>Club not found.</Empty></div></section>;
  const table = standings(db);
  const pos = table.findIndex((r) => r.team.id === t.id);
  const row = table[pos];
  const ms = teamMatches(db, t.id);
  const next = ms.find((m) => m.status === 'live' || isUpcoming(m));
  const recent = ms.filter((m) => m.status === 'finished').slice(-3).reverse();
  const squad = db.players.filter((p) => p.teamId === t.id && p.active).sort((a, b) => a.number - b.number);
  const totals = playerTotals(db);
  const topScorer = [...squad].sort((a, b) => totals.get(b.id)!.goals - totals.get(a.id)!.goals)[0];
  const topAssist = [...squad].sort((a, b) => totals.get(b.id)!.assists - totals.get(a.id)!.assists)[0];
  const s = teamSeasonStats(db, t.id);
  const venue = L.venue(t.homeVenueId)!;
  const isFav = user?.favoriteTeamId === t.id;
  const captain = db.users.find((u) => u.role === 'captain' && u.teamId === t.id);

  return (
    <>
      <section className="club-hero">
        <div className="container club-hero-inner">
          <Crest team={t} size={120} />
          <div>
            <div className="kicker">{t.city} · Est. {t.founded}</div>
            <h1>{t.name}</h1>
            <div className="facts">
              <div><b>{pos + 1}{['st', 'nd', 'rd'][pos] ?? 'th'}</b>Position</div>
              <div><b>{row.pts}</b>Points</div>
              <div><b>{row.w}-{row.d}-{row.l}</b>W-D-L</div>
              <div><b>{t.coach}</b>Head coach</div>
            </div>
          </div>
          <div className="actions">
            {user ? (
              <button className={`btn ${isFav ? 'btn-ghost-light' : 'btn-gold'}`} onClick={() => setFavorite(isFav ? undefined : t.id)}>{isFav ? '★ Following' : '☆ Follow club'}</button>
            ) : <Link to="/login" className="btn btn-gold">☆ Follow club</Link>}
          </div>
        </div>
      </section>
      <div className="page-head-accent" />
      <section className="section">
        <div className="container">
          <div className="tabs">
            {(['overview', 'squad', 'fixtures', 'stats'] as const).map((k) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-main">
              <div className="stack" style={{ gap: 20 }}>
                {next && <div><h3 style={{ marginBottom: 12 }}>Next match</h3><MatchCard m={next} /></div>}
                <div>
                  <h3 style={{ marginBottom: 12 }}>Recent results</h3>
                  <div className="match-grid">{recent.map((m) => <MatchCard key={m.id} m={m} />)}</div>
                </div>
                <div className="card card-pad">
                  <h3>About the club</h3>
                  <p>{t.bio}</p>
                  {captain && <p className="muted small">Club captain: <Link className="player-link" to={`/players/${captain.playerId}`}>{captain.name}</Link></p>}
                </div>
              </div>
              <div className="stack" style={{ gap: 20 }}>
                <div className="card card-pad">
                  <h3>Form</h3>
                  <div className="row" style={{ gap: 6 }}>{row.form.map((f, i) => <FormBadge key={i} r={f} />)}</div>
                  <div className="divider" />
                  {topScorer && <div className="row-between"><span className="muted small">Top scorer</span><Link to={`/players/${topScorer.id}`} className="player-link">{topScorer.name} ({totals.get(topScorer.id)!.goals})</Link></div>}
                  {topAssist && <div className="row-between" style={{ marginTop: 8 }}><span className="muted small">Most assists</span><Link to={`/players/${topAssist.id}`} className="player-link">{topAssist.name} ({totals.get(topAssist.id)!.assists})</Link></div>}
                </div>
                <div className="card card-pad">
                  <h3 className="row"><span className="venue-badge"><StadiumIcon size={18} /></span>Home ground</h3>
                  <b>{venue.name}</b>
                  <div className="muted small">{venue.address}</div>
                  <div className="muted small">Capacity {venue.capacity.toLocaleString()}</div>
                  <a href={mapsUrl(`${venue.name}, ${venue.address}`)} target="_blank" rel="noreferrer" className="link-btn" style={{ display: 'inline-block', marginTop: 8, padding: 0 }}>Directions →</a>
                </div>
              </div>
            </div>
          )}

          {tab === 'squad' && (
            <>
              {(['GK', 'DF', 'MF', 'FW'] as const).map((p) => (
                <div key={p} style={{ marginBottom: 28 }}>
                  <h3 style={{ marginBottom: 12 }}>{{ GK: 'Goalkeepers', DF: 'Defenders', MF: 'Midfielders', FW: 'Forwards' }[p]}</h3>
                  <div className="squad-grid">
                    {squad.filter((x) => x.position === p).map((pl) => (
                      <Link to={`/players/${pl.id}`} className="player-card" key={pl.id}>
                        <div className="player-card-top">
                          <span className="num">{pl.number}</span>
                          <Avatar name={pl.name} size={56} color={C.turq} />
                        </div>
                        <div className="player-card-body">
                          <b>{pl.name}{captain?.playerId === pl.id && <span className="pill pill-gold" style={{ marginLeft: 6 }}>C</span>}</b>
                          <span className="muted small">{pl.nationality} · {pl.age} yrs</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'fixtures' && <div className="match-grid">{ms.map((m) => <MatchCard key={m.id} m={m} />)}</div>}

          {tab === 'stats' && (
            <div className="stat-tiles">
              <div className="stat-tile accent"><b>{row.pts}</b><span>Points</span></div>
              <div className="stat-tile"><b>{row.gf}</b><span>Goals scored</span></div>
              <div className="stat-tile"><b>{row.ga}</b><span>Goals conceded</span></div>
              <div className="stat-tile"><b>{s.cleanSheets}</b><span>Clean sheets</span></div>
              <div className="stat-tile"><b>{s.possession}%</b><span>Avg possession</span></div>
              <div className="stat-tile"><b>{s.shotsPerGame}</b><span>Shots / game</span></div>
              <div className="stat-tile"><b>{s.corners}</b><span>Corners</span></div>
              <div className="stat-tile"><b>{s.yellow}</b><span>Yellow cards</span></div>
              <div className="stat-tile"><b>{s.red}</b><span>Red cards</span></div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function PlayerProfile() {
  const { id } = useParams();
  const { db } = useStore();
  const L = useLookup();
  const p = L.player(id);
  usePageTitle(p?.name ?? 'Player not found');
  if (!p) return <section className="section"><div className="container"><Empty>Player not found.</Empty></div></section>;
  const t = L.team(p.teamId)!;
  const tot = playerTotals(db).get(p.id)!;
  const isCaptain = db.users.some((u) => u.role === 'captain' && u.playerId === p.id);
  const contributions = db.matches.filter((m) => m.status === 'finished' && m.events.some((e) => e.playerId === p.id || e.assistId === p.id)).reverse();
  return (
    <>
      <section className="club-hero">
        <div className="container club-hero-inner">
          <Jersey colors={t.colors} number={p.number} name={p.name.split(' ').slice(-1)[0]} size={170} />
          <div>
            <Link to={`/teams/${t.id}`} className="row" style={{ marginBottom: 8 }}><Crest team={t} size={26} /><b>{t.name}</b></Link>
            <h1>{p.name}</h1>
            <div className="row wrap" style={{ marginTop: 10 }}>
              <span className="pill pill-ghost" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>{{ GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward' }[p.position]}</span>
              {isCaptain && <span className="pill pill-gold">Captain</span>}
              {!p.active && <span className="pill pill-danger">No longer registered</span>}
            </div>
            <div className="facts">
              <div><b>#{p.number}</b>Shirt</div>
              <div><b>{p.nationality}</b>Nationality</div>
              <div><b>{p.age}</b>Age</div>
              <div><b>{p.height} cm</b>Height</div>
              <div><b>{p.foot}</b>Foot</div>
            </div>
          </div>
        </div>
      </section>
      <div className="page-head-accent" />
      <section className="section">
        <div className="container stack" style={{ gap: 24 }}>
          <div className="stat-tiles">
            <div className="stat-tile accent"><b>{tot.goals}</b><span>Goals</span></div>
            <div className="stat-tile"><b>{tot.assists}</b><span>Assists</span></div>
            <div className="stat-tile"><b>{tot.apps}</b><span>Matches</span></div>
            {p.position === 'GK' && <div className="stat-tile"><b>{tot.cleanSheets}</b><span>Clean sheets</span></div>}
            <div className="stat-tile"><b>{tot.penalties}</b><span>Penalties</span></div>
            <div className="stat-tile"><b>{tot.yellows}</b><span>Yellow cards</span></div>
            <div className="stat-tile"><b>{tot.reds}</b><span>Red cards</span></div>
          </div>
          <div className="card card-pad">
            <h3>Match log</h3>
            {contributions.length === 0 ? <Empty>No goals, assists or cards recorded yet.</Empty> : contributions.map((m) => {
              const evs = m.events.filter((e) => e.playerId === p.id || e.assistId === p.id);
              const opp = L.team(m.homeId === p.teamId ? m.awayId : m.homeId);
              return (
                <Link to={`/matches/${m.id}`} className="list-row" key={m.id}>
                  <span className="muted small" style={{ width: 90 }}>{fmtDate(m.kickoff)}</span>
                  <span className="row" style={{ flex: 1 }}>vs <Crest team={opp} size={20} />{opp?.name}</span>
                  <span className="row wrap" style={{ gap: 6 }}>
                    {evs.map((e) => (
                      <span key={e.id} className={`pill ${e.assistId === p.id ? 'pill-cobalt' : e.type === 'yellow' ? 'pill-gold' : e.type === 'red' ? 'pill-danger' : 'pill-turq'}`}>
                        {e.assistId === p.id ? 'Assist' : e.type === 'goal' ? 'Goal' : e.type === 'penalty' ? 'Pen' : e.type === 'own_goal' ? 'OG' : e.type === 'yellow' ? 'Yellow' : e.type === 'red' ? 'Red' : 'Sub'} {e.minute}'
                      </span>
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
