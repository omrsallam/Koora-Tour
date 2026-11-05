import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore, dashboardPath, ROLE_LABEL } from '../store/store';
import { Crest, Star8, Avatar } from './ui';
import { score } from '../data/derive';
import { timeAgo } from '../format';
import Search from './Search';

const NAV = [
  { to: '/matches', label: 'Matches' },
  { to: '/standings', label: 'Table' },
  { to: '/stats', label: 'Stats' },
  { to: '/teams', label: 'Teams' },
  { to: '/highlights', label: 'Highlights' },
  { to: '/news', label: 'News' },
  { to: '/venues', label: 'Venues' },
];

function ClubStrip() {
  const { db } = useStore();
  return (
    <div className="club-strip">
      <div className="container club-strip-inner">
        <span className="club-strip-label">Clubs</span>
        {db.teams.map((t) => (
          <Link key={t.id} to={`/teams/${t.id}`} title={t.name}><Crest team={t} size={22} /></Link>
        ))}
      </div>
    </div>
  );
}

function LiveTicker() {
  const { db } = useStore();
  const live = db.matches.filter((m) => m.status === 'live');
  if (!live.length) return null;
  const name = (id: string | null) => db.teams.find((t) => t.id === id)?.short ?? 'TBD';
  return (
    <div className="live-ticker">
      <div className="container live-ticker-inner">
        <span className="pill pill-live"><span className="dot" />LIVE</span>
        {live.map((m) => {
          const [h, a] = score(m);
          return <Link key={m.id} to={`/matches/${m.id}`}>{name(m.homeId)} <b>{h}–{a}</b> {name(m.awayId)} <span className="muted">{m.liveMinute ?? 0}'</span></Link>;
        })}
      </div>
    </div>
  );
}

function Notifications() {
  const { user, noticesFor, markRead } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const list = noticesFor(user);
  const unread = user ? list.filter((n) => !n.readBy.includes(user.id)).length : 0;
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn on-dark" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setOpen(!open); if (!open) markRead(); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 003.4 0" /></svg>
        {unread > 0 && <span className="badge-count">{unread}</span>}
      </button>
      {open && (
        <div className="dropdown-panel notif-panel">
          <div className="dropdown-title">Notifications</div>
          {list.length === 0 && <div className="muted small pad">You're all caught up.</div>}
          {list.map((n) => (
            <Link key={n.id} to={n.link ?? '#'} className="notif" onClick={() => setOpen(false)}>
              <span>{n.text}</span>
              <span className="muted small">{timeAgo(n.at)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout, db } = useStore();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [loc.pathname]);

  return (
    <div className="app">
      <a href="#main" className="skip">Skip to content</a>
      <ClubStrip />
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="brand" aria-label={`${db.settings.tournamentName} home`}>
            <span className="brand-mark"><Star8 size={22} color="#f2b33d" /></span>
            <span className="brand-text">KOORA<span>TOUR</span></span>
          </Link>
          <nav className={`nav ${menu ? 'open' : ''}`} aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to}>{n.label}</NavLink>)}
            {user && <NavLink to={dashboardPath(user)} className="nav-dash">{user.role === 'fan' ? 'My Koora' : 'Dashboard'}</NavLink>}
          </nav>
          <div className="header-actions">
            <Search />
            <Notifications />
            {user ? (
              <div className="user-chip">
                <Link to={dashboardPath(user)} className="user-chip-link" title={`${user.name} · ${ROLE_LABEL[user.role]}`}>
                  <Avatar name={user.name} size={30} color={user.role === 'god' ? '#f2b33d' : '#1fb5b0'} />
                  <span className="user-chip-text"><b>{user.name.split(' ')[0]}</b><small>{ROLE_LABEL[user.role]}</small></span>
                </Link>
                <button className="link-btn on-dark" onClick={() => { logout(); nav('/'); }}>Sign out</button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-gold btn-sm">Sign in</Link>
            )}
            <button className="icon-btn on-dark burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            </button>
          </div>
        </div>
      </header>
      <LiveTicker />
      <main id="main"><Outlet /></main>
      <footer className="footer">
        <div className="tile-band" aria-hidden="true" />
        <div className="container footer-grid">
          <div>
            <div className="brand brand-footer"><span className="brand-mark"><Star8 size={22} color="#f2b33d" /></span><span className="brand-text">KOORA<span>TOUR</span></span></div>
            <p className="muted-light">Season {db.settings.season}. Every score, every goal, every club — in one place.</p>
          </div>
          <div>
            <h4>Competition</h4>
            <Link to="/matches">Fixtures & results</Link><Link to="/standings">Table</Link><Link to="/stats">Player stats</Link><Link to="/highlights">Highlights</Link>
          </div>
          <div>
            <h4>Clubs</h4>
            {db.teams.slice(0, 4).map((t) => <Link key={t.id} to={`/teams/${t.id}`}>{t.name}</Link>)}
          </div>
          <div>
            <h4>Account</h4>
            {user ? <Link to={dashboardPath(user)}>My dashboard</Link> : <Link to="/login">Sign in / Join</Link>}
            <Link to="/venues">Getting to the stadium</Link>
            <Link to="/news">Latest news</Link>
          </div>
        </div>
        <div className="container footer-base">© {new Date().getFullYear()} {db.settings.tournamentName}. Prototype — data stored in your browser.</div>
      </footer>
    </div>
  );
}
