import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { Crest } from './ui';

export default function Search() {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))) { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 0); else setQ(''); }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const teams = db.teams.filter((t) => t.name.toLowerCase().includes(s) || t.short.toLowerCase() === s).map((t) => ({ key: t.id, label: t.name, sub: 'Club', to: `/teams/${t.id}`, team: t }));
    const players = db.players.filter((p) => p.active && p.name.toLowerCase().includes(s)).slice(0, 8).map((p) => ({ key: p.id, label: p.name, sub: `${p.position} · ${db.teams.find((t) => t.id === p.teamId)?.name}`, to: `/players/${p.id}`, team: db.teams.find((t) => t.id === p.teamId) }));
    const venues = db.venues.filter((v) => v.name.toLowerCase().includes(s)).map((v) => ({ key: v.id, label: v.name, sub: 'Venue', to: '/venues', team: undefined }));
    return [...teams, ...players, ...venues];
  }, [q, db]);

  return (
    <>
      <button className="icon-btn on-dark" aria-label="Search (press /)" onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      </button>
      {open && (
        <div className="modal-backdrop search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="search-box" role="dialog" aria-label="Search">
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs, players, venues…" aria-label="Search" />
            <div className="search-results">
              {q.trim().length >= 2 && results.length === 0 && <div className="muted pad">No results for “{q}”.</div>}
              {results.map((r) => (
                <button key={r.key} className="search-result" onClick={() => { setOpen(false); nav(r.to); }}>
                  {r.team ? <Crest team={r.team} size={24} /> : <span style={{ width: 24 }} />}
                  <span><b>{r.label}</b><small>{r.sub}</small></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
