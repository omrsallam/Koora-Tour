import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Team, Player, Match } from '../types';
import { useLookup } from '../store/store';
import { score, hasScore } from '../data/derive';
import { fmtDate, fmtTime, roundLabel } from '../format';

/* ---------- Crest: generated shield in team colours ---------- */
export function Crest({ team, size = 40, label }: { team?: Team; size?: number; label?: string }) {
  const [c1, c2] = team?.colors ?? ['#5d6482', '#c9cde0'];
  const text = team?.short ?? label?.slice(0, 3).toUpperCase() ?? '?';
  const id = `cg-${team?.id ?? text}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 56" role="img" aria-label={team?.name ?? label ?? 'To be decided'} className="crest">
      <defs>
        <clipPath id={id}><path d="M24 2 L45 9 V27 C45 41 35 50 24 54 C13 50 3 41 3 27 V9 Z" /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="48" height="56" fill={c1} />
        <path d="M0 34 L48 22 V30 L0 42 Z" fill={c2} opacity="0.95" />
      </g>
      <path d="M24 2 L45 9 V27 C45 41 35 50 24 54 C13 50 3 41 3 27 V9 Z" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <text x="24" y="25" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="14" fill={pickInk(c1)}>{text}</text>
    </svg>
  );
}

function pickInk(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0b1020' : '#ffffff';
}

/* ---------- Kit: simple jersey illustration ---------- */
export function Jersey({ colors, number, name, size = 160, away = false }: { colors: [string, string]; number?: number; name?: string; size?: number; away?: boolean }) {
  const [base, trim] = away ? [colors[1], colors[0]] : colors;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Team kit">
      <path d="M38 12 L50 8 C53 14 67 14 70 8 L82 12 L108 28 L98 50 L88 44 V110 H32 V44 L22 50 L12 28 Z" fill={base} stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
      <path d="M50 8 C53 14 67 14 70 8 L66 7 C63 11 57 11 54 7 Z" fill={trim} />
      <path d="M12 28 L22 50 L26 48 L16 26 Z M108 28 L98 50 L94 48 L104 26 Z" fill={trim} />
      <rect x="32" y="96" width="56" height="4" fill={trim} opacity=".8" />
      {name && <text x="60" y="50" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="700" fontSize="9" letterSpacing="1" fill={pickInk(base)}>{name.toUpperCase()}</text>}
      {number !== undefined && <text x="60" y="84" textAnchor="middle" fontFamily="Barlow Condensed" fontWeight="800" fontSize="34" fill={pickInk(base)}>{number}</text>}
    </svg>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ name, color = '#1cc4bf', size = 36 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  return <span className="avatar" style={{ width: size, height: size, background: color, color: pickInk(color), fontSize: size * 0.38 }}>{initials}</span>;
}

export function PlayerLink({ player, showTeam = false }: { player?: Player; showTeam?: boolean }) {
  const L = useLookup();
  if (!player) return <span className="muted">Unknown</span>;
  return (
    <Link to={`/players/${player.id}`} className="player-link">
      {player.name}{showTeam && <span className="muted small"> · {L.team(player.teamId)?.short}</span>}
    </Link>
  );
}

/* ---------- Status pill ---------- */
export function StatusPill({ m }: { m: Match }) {
  if (m.status === 'live') return <span className="pill pill-live"><span className="dot" />LIVE {m.liveMinute ? `${m.liveMinute}'` : ''}</span>;
  if (m.status === 'awaiting_verification') return <span className="pill pill-warn">FT · Verifying</span>;
  if (m.status === 'finished') return <span className="pill">FT</span>;
  if (m.status === 'postponed') return <span className="pill pill-danger">Postponed</span>;
  return <span className="pill pill-ghost">{fmtTime(m.kickoff)}</span>;
}

/* ---------- Match card ---------- */
export function MatchCard({ m, dark = false }: { m: Match; dark?: boolean }) {
  const L = useLookup();
  const home = L.team(m.homeId);
  const away = L.team(m.awayId);
  const [h, a] = score(m);
  const show = hasScore(m);
  return (
    <Link to={`/matches/${m.id}`} className={`match-card ${dark ? 'match-card-dark' : ''} ${m.status === 'live' ? 'is-live' : ''}`}>
      <div className="match-card-top">
        <span>{roundLabel(m.stage, m.round)} · {fmtDate(m.kickoff)}</span>
        <StatusPill m={m} />
      </div>
      {[{ t: home, label: m.homeLabel, s: h, other: a }, { t: away, label: m.awayLabel, s: a, other: h }].map((side, i) => (
        <div className={`match-card-row ${m.status === 'finished' && side.s > side.other ? 'winner' : ''} ${m.status === 'finished' && side.s < side.other ? 'loser' : ''}`} key={i}>
          <Crest team={side.t} label={side.label} size={26} />
          <span className="team-name">{side.t?.name ?? side.label ?? 'TBD'}</span>
          <span className="score">{show ? side.s : ''}</span>
        </div>
      ))}
      <div className="match-card-venue">{L.venue(m.venueId)?.name}</div>
    </Link>
  );
}

/* ---------- Section header ---------- */
export function SectionHead({ title, kicker, action }: { title: string; kicker?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ---------- Countdown ---------- */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const parts = [
    ['Days', Math.floor(diff / 864e5)],
    ['Hrs', Math.floor((diff / 36e5) % 24)],
    ['Min', Math.floor((diff / 6e4) % 60)],
    ['Sec', Math.floor((diff / 1e3) % 60)],
  ] as const;
  return (
    <div className="countdown" aria-label="Time until kickoff">
      {parts.map(([l, v]) => (
        <div key={l}><strong>{String(v).padStart(2, '0')}</strong><span>{l}</span></div>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function FormBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  return <span className={`form form-${r}`} title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}>{r}</span>;
}

/* ---------- Simple flash message ---------- */
export function useFlash() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 4500); return () => clearTimeout(t); }, [msg]);
  const node = msg ? <div className={`flash ${msg.ok ? 'flash-ok' : 'flash-err'}`} role="status">{msg.text}</div> : null;
  return { flash: (ok: boolean, text: string) => setMsg({ ok, text }), node };
}

/** Iznik-inspired eight-point star used as a decorative motif. */
export function Star8({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1l2.6 5.1L20 4l-2.1 5.4L23 12l-5.1 2.6L20 20l-5.4-2.1L12 23l-2.6-5.1L4 20l2.1-5.4L1 12l5.1-2.6L4 4l5.4 2.1z" fill={color} />
    </svg>
  );
}
