import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore, useLookup, dashboardPath } from '../store/store';
import { Crest, MatchCard, SectionHead, Countdown, FormBadge, Star8, Avatar } from '../components/ui';
import { C, G } from '../theme';
import Skyline from '../components/Skyline';
import AutoRail from '../components/AutoRail';
import type { Highlight, Match } from '../types';
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
  // UCL-style "stories": a spotlight travels from circle to circle in sequence.
  const [spot, setSpot] = useState(0);
  const [spotPaused, setSpotPaused] = useState(false);
  useEffect(() => {
    if (spotPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setSpot((i) => i + 1), 1700);
    return () => window.clearInterval(t);
  }, [spotPaused]);
  // Results from the last three matchdays in date order (oldest → latest), each week introduced by a label.
  const playedRounds = [...new Set(db.matches.filter((m) => m.stage === 'league' && m.status === 'finished').map((m) => m.round))].sort((x, y) => y - x);
  const lastRound = playedRounds[0] ?? 0;
  const weeks = playedRounds.slice(0, 3).reverse().map((round) => ({
    round,
    matches: db.matches.filter((m) => m.stage === 'league' && m.round === round && m.status === 'finished').sort((x, y) => x.kickoff.localeCompare(y.kickoff)),
  }));
  const latest = weeks[weeks.length - 1]?.matches ?? [];

  // Feature circles, UCL-style: Goal of the Week, Player of the Week, Top of the Table, Next up.
  const goalsIn = (m: Match) => score(m)[0] + score(m)[1];
  const gotwMatch = [...latest].sort((x, y) => goalsIn(y) - goalsIn(x))[0];
  const gotw = gotwMatch && db.highlights.find((h) => h.matchId === gotwMatch.id);
  const contrib = new Map<string, number>();
  latest.forEach((m) => m.events.forEach((e) => {
    if (e.type === 'goal' || e.type === 'penalty') contrib.set(e.playerId, (contrib.get(e.playerId) ?? 0) + 3);
    if (e.assistId) contrib.set(e.assistId, (contrib.get(e.assistId) ?? 0) + 2);
  }));
  const potw = L.player([...contrib.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]);
  const leader = standings(db)[0];
  const nextUp = db.matches.filter((m) => m.status === 'scheduled' && m.homeId).sort((x, y) => x.kickoff.localeCompare(y.kickoff))[0];

  type Entry = { key: string; label: ReactNode; aria: string; disc: ReactNode; feature?: boolean; onClick?: () => void; to?: string } | { key: string; divider: string };
  const entries: Entry[] = [];
  if (gotwMatch) entries.push({
    key: 'gotw', feature: true, aria: 'Goal of the Week',
    disc: <span className="story-word">GOAL<small>of the</small>WEEK</span>,
    label: <>Goal of the Week<small>{L.team(gotwMatch.homeId)?.short} v {L.team(gotwMatch.awayId)?.short}</small></>,
    ...(gotw ? { onClick: () => onOpen(gotw) } : { to: `/matches/${gotwMatch.id}` }),
  });
  if (potw) entries.push({
    key: 'potw', feature: true, aria: `Player of the Week: ${potw.name}`, to: `/players/${potw.id}`,
    disc: <><Avatar name={potw.name} size={54} color={L.team(potw.teamId)?.colors[0]} /><Crest team={L.team(potw.teamId)} size={22} /></>,
    label: <>Player of the Week<small>{potw.name}</small></>,
  });
  if (leader) entries.push({
    key: 'leader', feature: true, aria: `Top of the table: ${leader.team.name}`, to: '/standings',
    disc: <><Crest team={leader.team} size={40} /><b className="story-pts">{leader.pts}</b></>,
    label: <>Top of the Table<small>{leader.team.short} · {leader.pts} pts</small></>,
  });
  if (nextUp) entries.push({
    key: 'next', feature: true, aria: 'Next match', to: `/matches/${nextUp.id}`,
    disc: <><Crest team={L.team(nextUp.homeId)} size={30} /><Crest team={L.team(nextUp.awayId)} size={30} /></>,
    label: <>Next up<small>{L.team(nextUp.homeId)?.short} v {L.team(nextUp.awayId)?.short}</small></>,
  });
  weeks.forEach((w) => {
    entries.push({ key: `md${w.round}`, divider: `Matchday ${w.round}` });
    w.matches.forEach((m) => {
      const [h, a] = score(m);
      const hl = db.highlights.find((x) => x.matchId === m.id);
      const home = L.team(m.homeId); const away = L.team(m.awayId);
      const text = `${home?.short} ${h}-${a} ${away?.short}`;
      entries.push({
        key: m.id, aria: hl ? `Watch ${text} highlights` : `${text} match centre`,
        disc: <><Crest team={home} size={30} /><Crest team={away} size={30} /></>,
        label: <>{text}{hl && <span className="story-play" aria-hidden="true"> ▶</span>}</>,
        ...(hl ? { onClick: () => onOpen(hl) } : { to: `/matches/${m.id}` }),
      });
    });
  });
  const circleCount = entries.filter((e) => !('divider' in e)).length;
  let circleIdx = -1;

  const featured = db.highlights[0];
  const fm = featured && db.matches.find((m) => m.id === featured.matchId);
  return (
    <div className="stories-section">
      <div className="container">
        {lastRound > 0 && <div className="stories-head"><span className="kicker" style={{ margin: 0 }}>This week on the tour · Matchdays {weeks[0].round}–{lastRound}</span><Link to="/matches" className="link-btn on-dark">All matches →</Link></div>}
        <div onMouseEnter={() => setSpotPaused(true)} onMouseLeave={() => setSpotPaused(false)} onFocusCapture={() => setSpotPaused(true)} onBlurCapture={() => setSpotPaused(false)}>
        <AutoRail label="Latest on the tour" tone="dark" interval={2400}>
          {entries.map((e, idx) => {
            if ('divider' in e) return <div key={e.key} className="story-divider" role="presentation"><span><small>Matchday</small>{e.divider.replace('Matchday ', '')}</span></div>;
            circleIdx++;
            const cls = `story ${e.feature ? 'story-feature' : ''} ${circleCount && circleIdx === spot % circleCount ? 'is-spot' : ''}`;
            const style = { animationDelay: `${Math.min(idx, 10) * 80}ms` };
            const inner = (
              <>
                <span className="story-ring"><span className="story-disc">{e.disc}</span></span>
                <span className="story-label">{e.label}</span>
              </>
            );
            return e.onClick
              ? <button key={e.key} className={cls} style={style} onClick={e.onClick} aria-label={e.aria}>{inner}</button>
              : <Link key={e.key} className={cls} style={style} to={e.to!} aria-label={e.aria}>{inner}</Link>;
          })}
        </AutoRail>
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
        <div className="hero-top">
        <div className="container hero-inner">
          <div>
            <div className="kicker">Season {db.settings.season} · Road to the Final</div>
            <h1>Our city.<span>Our cup.</span></h1>
            <p className="lead">Twelve neighbourhood clubs, seven local grounds, one trophy. Live scores, the table, top scorers and highlights from the {db.settings.tournamentName} — all in one hub. {final && <>The Final is on <b style={{ color: '#fff' }}>{fmtLong(final.kickoff)}</b> at {L.venue(final.venueId)?.name}.</>}</p>
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
        </div>
        <MatchdayStories onOpen={open} />
      </section>

      <YourClub />

      <section className="section">
        <div className="container">
          <SectionHead kicker="Matchday centre" title={lastRound ? `Matchday ${lastRound} results` : 'Results'} action={<Link to="/matches" className="btn btn-ghost btn-sm">All matches</Link>} />
          <AutoRail label={`Matchday ${lastRound} results`} itemWidth={272}>{results.map((m) => <MatchCard key={m.id} m={m} />)}</AutoRail>
          {nextRound.length > 0 && (
            <>
              <h3 style={{ margin: '34px 0 16px' }}>Coming up · Matchday {lastRound + 1}</h3>
              <AutoRail label={`Matchday ${lastRound + 1} fixtures`} itemWidth={272} interval={3600}>{nextRound.map((m) => <MatchCard key={m.id} m={m} />)}</AutoRail>
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
          <AutoRail label="Latest highlights" itemWidth={290} interval={3400}>{db.highlights.slice(1, 9).map((h) => <HighlightCard key={h.id} h={h} onOpen={open} />)}</AutoRail>
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
