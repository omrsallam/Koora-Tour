import { Link } from 'react-router-dom';
import { useStore, useLookup, dashboardPath } from '../store/store';
import { Crest, MatchCard, SectionHead, Countdown, FormBadge, Star8 } from '../components/ui';
import { C, G } from '../theme';
import Skyline from '../components/Skyline';
import type { Highlight } from '../types';
import { score } from '../data/derive';
import { compact, timeAgo } from '../format';
import { StandingsTable, LeaderCard, Bracket } from '../components/blocks';
import { standings, teamMatches } from '../data/derive';
import { fmtDateTime, fmtLong, roundLabel } from '../format';
import { HighlightCard, useHighlightPlayer } from './Highlights';
import { NewsCard } from './News';

function YourClub() {
  const { db, user } = useStore();
  const L = useLookup();
  const teamId = user?.teamId ?? user?.favoriteTeamId;
  const team = L.team(teamId);
  if (!team) {
    return (
      <section className="section-tight">
        <div className="container">
          <div className="card card-pad row-between wrap">
            <div>
              <div className="kicker">Make it yours</div>
              <h3 style={{ margin: 0 }}>Follow your club for a personalised hub</h3>
              <p className="muted" style={{ margin: '6px 0 0' }}>Get their fixtures, form and alerts front and centre.</p>
            </div>
            <div className="row wrap">
              {db.teams.map((t) => <Link key={t.id} to={`/teams/${t.id}`} title={`Follow ${t.name}`}><Crest team={t} size={36} /></Link>)}
            </div>
          </div>
        </div>
      </section>
    );
  }
  const table = standings(db);
  const pos = table.findIndex((r) => r.team.id === team.id);
  const row = table[pos];
  const next = teamMatches(db, team.id).find((m) => m.status === 'scheduled' || m.status === 'live');
  const opp = next && L.team(next.homeId === team.id ? next.awayId : next.homeId);
  return (
    <section className="section-tight">
      <div className="container">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="grid" style={{ gridTemplateColumns: 'auto 1fr', gap: 0 }}>
            <div style={{ background: G.night, padding: 22, display: 'grid', placeItems: 'center' }}><Crest team={team} size={72} /></div>
            <div className="card-pad row-between wrap" style={{ gap: 24 }}>
              <div>
                <div className="kicker">{user?.teamId ? 'Your team' : 'Your club'}</div>
                <h2 style={{ fontSize: '2rem' }}>{team.name}</h2>
                <div className="row" style={{ marginTop: 8, gap: 4 }}>{row.form.map((f, i) => <FormBadge key={i} r={f} />)}</div>
              </div>
              <div className="row wrap" style={{ gap: 28 }}>
                <div><div className="muted small">Position</div><b style={{ fontFamily: 'var(--display)', fontSize: '2rem' }}>{pos + 1}<sup style={{ fontSize: '.9rem' }}>{['st', 'nd', 'rd'][pos] ?? 'th'}</sup></b></div>
                <div><div className="muted small">Points</div><b style={{ fontFamily: 'var(--display)', fontSize: '2rem' }}>{row.pts}</b></div>
                {next && opp && (
                  <div>
                    <div className="muted small">Next match</div>
                    <Link to={`/matches/${next.id}`} className="row" style={{ fontWeight: 700 }}>vs <Crest team={opp} size={22} /> {opp.name}</Link>
                    <div className="small muted">{fmtDateTime(next.kickoff)} · {L.venue(next.venueId)?.name}</div>
                  </div>
                )}
                <Link to={user ? dashboardPath(user) : `/teams/${team.id}`} className="btn btn-primary btn-sm">Open hub</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** UCL-style row of circular "stories" (latest results) above a featured video and headlines. */
function MatchdayStories({ onOpen }: { onOpen: (h: Highlight) => void }) {
  const { db } = useStore();
  const L = useLookup();
  const finished = db.matches.filter((m) => m.status === 'finished').sort((a, b) => b.kickoff.localeCompare(a.kickoff)).slice(0, 10);
  const featured = db.highlights[0];
  const fm = featured && db.matches.find((m) => m.id === featured.matchId);
  return (
    <div className="stories-section">
      <div className="container">
        <div className="stories" role="list" aria-label="Latest results">
          {finished.map((m) => {
            const [h, a] = score(m);
            const hl = db.highlights.find((x) => x.matchId === m.id);
            const home = L.team(m.homeId); const away = L.team(m.awayId);
            const label = `${home?.short} ${h}-${a} ${away?.short}`;
            const inner = (
              <>
                <span className="story-ring"><span className="story-disc"><Crest team={home} size={30} /><Crest team={away} size={30} /></span></span>
                <span className="story-label">{label}{hl && <span aria-hidden="true"> ▶</span>}</span>
              </>
            );
            return hl
              ? <button key={m.id} role="listitem" className="story" onClick={() => onOpen(hl)} aria-label={`Watch ${label} highlights`}>{inner}</button>
              : <Link key={m.id} role="listitem" className="story" to={`/matches/${m.id}`}>{inner}</Link>;
          })}
        </div>
        <div className="feature-grid">
          {featured && (
            <button className="feature-card" onClick={() => onOpen(featured)}>
              <div className="feature-art">
                {fm ? (
                  <div className="row" style={{ gap: 28 }}>
                    <Crest team={L.team(fm.homeId)} size={110} />
                    <span className="feature-score">{score(fm).join(' – ')}</span>
                    <Crest team={L.team(fm.awayId)} size={110} />
                  </div>
                ) : <Star8 size={90} color={C.turq} />}
                <span className="play"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill={C.blueDeep} /></svg></span>
              </div>
              <div className="feature-body">
                <span className="pill pill-gold">{featured.kind}</span>
                <b>{featured.title}</b>
                <span className="small muted">{featured.duration} · {compact(featured.views)} views · {timeAgo(featured.date)}</span>
              </div>
            </button>
          )}
          <div className="headlines">
            <h3>Headlines</h3>
            {db.news.slice(0, 5).map((n) => {
              const t = L.team(n.teamIds[0]);
              return (
                <Link to={`/news/${n.id}`} className="headline" key={n.id}>
                  <span className="headline-thumb" style={{ background: n.category === 'Announcement' ? G.red : n.category === 'Feature' ? G.turq : G.blue }}>
                    {t ? <Crest team={t} size={34} /> : <Star8 size={26} color="#fff" />}
                  </span>
                  <span><b>{n.title}</b><small>{n.category} · {timeAgo(n.date)}</small></span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { db, user } = useStore();
  const L = useLookup();
  const { open, modal } = useHighlightPlayer();
  const league = db.matches.filter((m) => m.stage === 'league');
  const upcoming = db.matches.filter((m) => m.status === 'scheduled' && m.homeId).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const live = db.matches.filter((m) => m.status === 'live');
  const next = live[0] ?? upcoming[0];
  const lastRound = Math.max(0, ...league.filter((m) => m.status === 'finished').map((m) => m.round));
  const results = league.filter((m) => m.round === lastRound);
  const nextRound = league.filter((m) => m.round === lastRound + 1);
  const home = L.team(next?.homeId);
  const away = L.team(next?.awayId);
  const final = db.matches.find((m) => m.stage === 'final');

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div>
            <div className="kicker">Season {db.settings.season} · Road to the Final</div>
            <h1>Our city.<span>Our cup.</span></h1>
            <p className="lead">Eight neighbourhood clubs, five local grounds, one trophy. Live scores, the table, top scorers and highlights from the {db.settings.tournamentName} — all in one hub. {final && <>The Final is on <b style={{ color: '#fff' }}>{fmtLong(final.kickoff)}</b> at {L.venue(final.venueId)?.name}.</>}</p>
            <div className="hero-cta">
              <Link to="/matches" className="btn btn-gold">Fixtures & results</Link>
              {user ? <Link to={dashboardPath(user)} className="btn btn-ghost-light">My dashboard</Link> : <Link to="/login" className="btn btn-ghost-light">Join as a fan</Link>}
            </div>
          </div>
          {next && (
            <Link to={`/matches/${next.id}`} className="next-match">
              <div className="row-between">
                <span className="kicker" style={{ margin: 0 }}>{next.status === 'live' ? 'Live now' : 'Next up'} · {roundLabel(next.stage, next.round)}</span>
                {next.status === 'live' && <span className="pill pill-live"><span className="dot" />LIVE</span>}
              </div>
              <div className="next-match-teams">
                <div><Crest team={home} size={70} /><div className="name">{home?.name}</div></div>
                <div className="vs">VS</div>
                <div><Crest team={away} size={70} /><div className="name">{away?.name}</div></div>
              </div>
              {next.status !== 'live' && <Countdown to={next.kickoff} />}
              <div className="small muted-light" style={{ marginTop: 14, textAlign: 'center' }}>{fmtDateTime(next.kickoff)} · {L.venue(next.venueId)?.name}</div>
            </Link>
          )}
        </div>
        <Skyline />
        <MatchdayStories onOpen={open} />
      </section>

      <YourClub />

      <section className="section">
        <div className="container">
          <SectionHead kicker="Matchday centre" title={lastRound ? `Matchday ${lastRound} results` : 'Results'} action={<Link to="/matches" className="btn btn-ghost btn-sm">All matches</Link>} />
          <div className="match-grid">{results.map((m) => <MatchCard key={m.id} m={m} />)}</div>
          {nextRound.length > 0 && (
            <>
              <h3 style={{ margin: '34px 0 16px' }}>Coming up · Matchday {lastRound + 1}</h3>
              <div className="match-grid">{nextRound.map((m) => <MatchCard key={m.id} m={m} />)}</div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-main">
          <div className="card card-pad">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>League table</h3>
              <Link to="/standings" className="link-btn">Full table →</Link>
            </div>
            <StandingsTable compact highlight={user?.teamId ?? user?.favoriteTeamId} />
            <div className="legend"><span><i style={{ background: 'var(--turq)' }} />Final Four qualification</span></div>
          </div>
          <div className="stack" style={{ gap: 20 }}>
            <LeaderCard stat="goals" limit={5} title="Top scorers" />
            <LeaderCard stat="assists" limit={5} title="Top assists" />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <SectionHead kicker="Watch" title="Latest highlights" action={<Link to="/highlights" className="btn btn-ghost btn-sm">All videos</Link>} />
          <div className="video-grid">{db.highlights.slice(1, 5).map((h) => <HighlightCard key={h.id} h={h} onOpen={open} />)}</div>
        </div>
      </section>

      <section className="section section-dark" style={{ position: 'relative' }}>
        <div className="container grid grid-2" style={{ alignItems: 'center', gap: 40 }}>
          <div>
            <div className="kicker">The Final Four</div>
            <h2 style={{ fontSize: 'clamp(2.2rem,5vw,3.6rem)' }}>Four clubs.<br />One trophy.</h2>
            <p className="muted" style={{ marginTop: 14, maxWidth: 440 }}>The top four after the league phase go through to the semi-finals. Until the last round is played, the bracket shows who would qualify if the season ended today.</p>
            <Link to="/standings" className="btn btn-gold btn-sm" style={{ marginTop: 8 }}>See the race</Link>
          </div>
          <Bracket />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead kicker="Stories" title="Latest news" action={<Link to="/news" className="btn btn-ghost btn-sm">More news</Link>} />
          <div className="grid grid-3">
            {db.news.slice(0, 4).map((n, i) => <div key={n.id} className={i === 0 ? 'news-feature' : ''}><NewsCard n={n} /></div>)}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid grid-2">
          <div className="promo" style={{ background: G.red }}>
            <Star8 size={40} color="#ffffff" />
            <h3>For the fans</h3>
            <p>Follow your club, vote for Player of the Match and get kickoff alerts.</p>
            <div><Link to={user ? '/my-koora' : '/login'} className="btn btn-gold btn-sm">{user ? 'My Koora' : 'Create free account'}</Link></div>
          </div>
          <div className="promo" style={{ background: G.turq }}>
            <Star8 size={40} color={C.turq} />
            <h3>Players' hub</h3>
            <p>Your schedule, venues, directions and call times. Add every match to your calendar in one click.</p>
            <div><Link to={user?.role === 'player' || user?.role === 'captain' ? dashboardPath(user) : '/login'} className="btn btn-turq btn-sm">Open players' hub</Link></div>
          </div>
        </div>
      </section>
      {modal}
    </>
  );
}
