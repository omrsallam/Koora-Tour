import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, dashboardPath, ROLE_LABEL } from '../store/store';
import { Avatar, Crest, Star8, Empty, MatchCard, FormBadge } from '../components/ui';
import { PageHead } from '../components/blocks';
import { standings, teamMatches } from '../data/derive';
import type { Role } from '../types';
import { NewsCard } from './News';

const ROLE_ORDER: Role[] = ['god', 'host', 'organizer', 'captain', 'player', 'fan'];
const ROLE_COLOR: Record<Role, string> = { god: '#1cc4bf', host: '#1cc4bf', organizer: '#2a46d6', captain: '#e11d3c', player: '#6fe0dc', fan: '#c9cde0' };

export default function Login() {
  const { db, login, signupFan } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<'demo' | 'join'>('demo');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fav, setFav] = useState('');
  const [filter, setFilter] = useState<Role | ''>('');

  const go = (id: string) => {
    login(id);
    nav(dashboardPath(db.users.find((u) => u.id === id)));
  };
  const users = db.users.filter((u) => !u.suspended && (!filter || u.role === filter)).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

  return (
    <div className="login-wrap">
      <div className="login-art">
        <Star8 size={54} color="#1cc4bf" />
        <h1 style={{ fontSize: 'clamp(2.4rem,5vw,4rem)', marginTop: 20 }}>Your club.<br /><span style={{ color: 'var(--turq)' }}>Your hub.</span></h1>
        <p className="muted-light" style={{ maxWidth: 440, marginTop: 16 }}>Fans follow their club and vote. Players see their schedule and venues. Captains manage their squad. Hosts & organizers run match day — and the God Admin signs off every sensitive decision.</p>
      </div>
      <div className="login-form">
        <div className="tabs">
          <button className={mode === 'demo' ? 'active' : ''} onClick={() => setMode('demo')}>Sign in</button>
          <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>Join as a fan</button>
        </div>
        {mode === 'demo' ? (
          <>
            <h2 style={{ marginBottom: 6 }}>Choose an account</h2>
            <p className="muted small">Prototype sign-in: pick any account to explore its view. In production this is replaced by real authentication.</p>
            <div className="chips" style={{ margin: '12px 0 16px' }}>
              <button className={`chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
              {ROLE_ORDER.map((r) => <button key={r} className={`chip ${filter === r ? 'active' : ''}`} onClick={() => setFilter(r)}>{ROLE_LABEL[r]}</button>)}
            </div>
            <div className="demo-accounts">
              {users.map((u) => {
                const team = db.teams.find((t) => t.id === u.teamId);
                return (
                  <button key={u.id} className="demo-account" onClick={() => go(u.id)}>
                    {team ? <Crest team={team} size={34} /> : <Avatar name={u.name} size={34} color={ROLE_COLOR[u.role]} />}
                    <span style={{ flex: 1 }}><b>{u.name}</b><small>{u.email}{team ? ` · ${team.name}` : ''}</small></span>
                    <span className="pill" style={{ background: ROLE_COLOR[u.role], color: '#071355' }}>{ROLE_LABEL[u.role]}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !email.trim()) return; signupFan(name.trim(), email.trim(), fav || undefined); nav('/my-koora'); }} className="stack">
            <h2>Create your fan account</h2>
            <p className="muted small">Fans can follow a club, get alerts and vote for Player of the Match. Only the God Admin can grant staff roles.</p>
            <label className="field">Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="field">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.82rem', fontWeight: 600 }}>
              Favourite club
              <div className="row wrap">
                {db.teams.map((t) => (
                  <button type="button" key={t.id} onClick={() => setFav(fav === t.id ? '' : t.id)} title={t.name} style={{ border: 0, background: fav === t.id ? 'rgba(31,181,176,.2)' : 'transparent', borderRadius: 10, padding: 6, outline: fav === t.id ? '2px solid var(--turq)' : 'none' }}>
                    <Crest team={t} size={38} />
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Create account</button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Fan hub — personalised view of the followed club. */
export function MyKoora() {
  const { db, user, setFavorite } = useStore();
  if (!user) return <section className="section"><div className="container"><Empty><Link to="/login" className="link-btn">Sign in</Link> to see your personalised hub.</Empty></div></section>;
  const team = db.teams.find((t) => t.id === (user.favoriteTeamId ?? user.teamId));
  const table = standings(db);
  const row = team && table.find((r) => r.team.id === team.id);
  const pos = team ? table.findIndex((r) => r.team.id === team.id) + 1 : 0;
  const ms = team ? teamMatches(db, team.id) : [];
  const upcoming = ms.filter((m) => m.status !== 'finished').slice(0, 3);
  const recent = ms.filter((m) => m.status === 'finished').slice(-3).reverse();
  const news = db.news.filter((n) => team && n.teamIds.includes(team.id)).concat(db.news.filter((n) => !team || !n.teamIds.includes(team.id))).slice(0, 3);
  const votes = Object.keys(db.motmVotes[user.id] ?? {}).length;

  return (
    <>
      <PageHead kicker={`Welcome back, ${user.name.split(' ')[0]}`} title="My Koora" sub="Your personalised hub: your club's fixtures, form, news and alerts.">
        <select value={team?.id ?? ''} onChange={(e) => setFavorite(e.target.value || undefined)} style={{ maxWidth: 240 }} aria-label="Followed club">
          <option value="">Choose a club to follow</option>
          {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </PageHead>
      <section className="section">
        <div className="container stack" style={{ gap: 28 }}>
          {!team ? <Empty>Pick a club above to personalise your hub.</Empty> : (
            <>
              <div className="kpis">
                <div className="kpi" style={{ ['--k' as string]: team.colors[0] }}><span>Club</span><b className="row"><Crest team={team} size={34} />{team.short}</b></div>
                <div className="kpi"><span>Position</span><b>{pos}</b></div>
                <div className="kpi"><span>Points</span><b>{row?.pts}</b></div>
                <div className="kpi"><span>Form</span><div className="row" style={{ gap: 4, marginTop: 12 }}>{row?.form.map((f, i) => <FormBadge key={i} r={f} />)}</div></div>
                <div className="kpi" style={{ ['--k' as string]: 'var(--turq)' }}><span>Your MOTM votes</span><b>{votes}</b></div>
              </div>
              <div>
                <h3 style={{ marginBottom: 12 }}>Coming up</h3>
                {upcoming.length ? <div className="match-grid">{upcoming.map((m) => <MatchCard key={m.id} m={m} />)}</div> : <Empty>No upcoming matches.</Empty>}
              </div>
              <div>
                <h3 style={{ marginBottom: 12 }}>Recent results</h3>
                <div className="match-grid">{recent.map((m) => <MatchCard key={m.id} m={m} />)}</div>
              </div>
              <div className="row wrap"><Link to={`/teams/${team.id}`} className="btn btn-primary btn-sm">Club page & squad</Link><Link to="/standings" className="btn btn-ghost btn-sm">Full table</Link></div>
            </>
          )}
          <div>
            <h3 style={{ marginBottom: 12 }}>News for you</h3>
            <div className="grid grid-3">{news.map((n) => <NewsCard key={n.id} n={n} />)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
