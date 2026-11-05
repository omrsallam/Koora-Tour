import { Link } from 'react-router-dom';
import { useStore, useLookup, dashboardPath } from '../store/store';
import { Crest, MatchCard, SectionHead, Countdown, Jersey, FormBadge, Star8 } from '../components/ui';
import { StandingsTable, LeaderCard, Bracket } from '../components/blocks';
import { standings, teamMatches } from '../data/derive';
import { fmtDateTime, fmtLong, roundLabel } from '../format';
import { HighlightCard, useHighlightPlayer } from './Highlights';
import { NewsCard } from './News';

function Skyline() {
  // Stylised Istanbul skyline: domes and minarets silhouette.
  return (
    <svg className="hero-skyline" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true">
      <path fill="#050b1f" d="M0 90V70h60v-8h20v8h40V52c0-14 22-24 40-24s40 10 40 24v18h18V20l4-14 4 14v50h30V58c0-8 12-14 22-14s22 6 22 14v12h60V40c0-22 34-36 60-36s60 14 60 36v30h14V14l4-12 4 12v56h40V60c0-10 14-16 26-16s26 6 26 16v10h70v-6h30v6h44V48c0-16 26-28 46-28s46 12 46 28v22h16V22l4-14 4 14v48h60V62h40v8h70V54c0-10 16-18 30-18s30 8 30 18v16h60v20z" />
    </svg>
  );
}

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
            <div style={{ background: team.colors[0], padding: 22, display: 'grid', placeItems: 'center' }}><Crest team={team} size={72} /></div>
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
            <h1>Every goal.<span>Every city.</span></h1>
            <p className="lead">Live scores, the table, top scorers, highlights and every club on the {db.settings.tournamentName} — all in one hub. {final && <>The Final is on <b style={{ color: '#fff' }}>{fmtLong(final.kickoff)}</b> at {L.venue(final.venueId)?.name}.</>}</p>
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
      </section>

      <YourClub />

      <section className="section section-dark">
        <div className="container">
          <SectionHead kicker="Matchday centre" title={lastRound ? `Matchday ${lastRound} results` : 'Results'} action={<Link to="/matches" className="btn btn-ghost-light btn-sm">All matches</Link>} />
          <div className="match-grid">{results.map((m) => <MatchCard key={m.id} m={m} dark />)}</div>
          {nextRound.length > 0 && (
            <>
              <h3 style={{ margin: '34px 0 16px' }}>Coming up · Matchday {lastRound + 1}</h3>
              <div className="match-grid">{nextRound.map((m) => <MatchCard key={m.id} m={m} dark />)}</div>
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
          <div className="video-grid">{db.highlights.slice(0, 4).map((h) => <HighlightCard key={h.id} h={h} onOpen={open} />)}</div>
        </div>
      </section>

      <section className="section section-dark" style={{ position: 'relative' }}>
        <div className="container grid grid-2" style={{ alignItems: 'center', gap: 40 }}>
          <div>
            <div className="kicker" style={{ color: 'var(--gold)' }}>The Final Four</div>
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
        <div className="container">
          <SectionHead kicker="Wear the badge" title="Home kits 26/27" />
          <div className="kit-rail">
            {db.teams.map((t) => (
              <Link to={`/teams/${t.id}`} className="kit" key={t.id}>
                <div className="kit-img"><Jersey colors={t.colors} size={180} /></div>
                <div className="kit-info"><b>{t.name}</b><span>Home Stadium Jersey · {t.city}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container grid grid-2">
          <div className="promo" style={{ background: 'linear-gradient(135deg,#c8102e,#5b0614)' }}>
            <Star8 size={40} color="#f2b33d" />
            <h3>For the fans</h3>
            <p>Follow your club, vote for Player of the Match and get kickoff alerts.</p>
            <div><Link to={user ? '/my-koora' : '/login'} className="btn btn-gold btn-sm">{user ? 'My Koora' : 'Create free account'}</Link></div>
          </div>
          <div className="promo" style={{ background: 'linear-gradient(135deg,#0b6a67,#0a1633)' }}>
            <Star8 size={40} color="#5fd6cf" />
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
