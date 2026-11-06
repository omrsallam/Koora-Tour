import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Highlight } from '../types';
import { useStore, useLookup } from '../store/store';
import { Crest, Modal, Empty } from '../components/ui';
import { PageHead } from '../components/blocks';
import { score } from '../data/derive';
import { G } from '../theme';
import { compact, timeAgo } from '../format';

const KIND_BG: Record<Highlight['kind'], string> = { Goals: G.blue, Extended: G.turq, Saves: G.night, Interview: G.red, Skills: G.turq };

export function HighlightCard({ h, onOpen }: { h: Highlight; onOpen: (h: Highlight) => void }) {
  const { db } = useStore();
  const L = useLookup();
  const m = db.matches.find((x) => x.id === h.matchId);
  const home = L.team(m?.homeId);
  const away = L.team(m?.awayId);
  return (
    <button className="video-card" onClick={() => onOpen(h)}>
      <div className="video-thumb" style={{ background: KIND_BG[h.kind] }}>
        {home && <Crest team={home} size={56} />}
        {away && <Crest team={away} size={56} />}
        <span className="pill pill-ghost kind" style={{ background: 'rgba(255,255,255,.9)' }}>{h.kind}</span>
        <span className="play"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="#071355" /></svg></span>
        <span className="dur">{h.duration}</span>
      </div>
      <div className="video-body">
        <b>{h.title}</b>
        <span className="muted small">{compact(h.views)} views · {timeAgo(h.date)}</span>
      </div>
    </button>
  );
}

function Recap({ h }: { h: Highlight }) {
  const { db } = useStore();
  const L = useLookup();
  const m = db.matches.find((x) => x.id === h.matchId);
  const goals = m?.events.filter((e) => e.type === 'goal' || e.type === 'penalty' || e.type === 'own_goal') ?? [];
  const frames = m ? ['intro', ...goals.map((g) => g.id), 'ft'] : ['intro', 'ft'];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % frames.length), 2200); return () => clearInterval(t); }, [frames.length]);
  const f = frames[i];
  const ev = goals.find((g) => g.id === f);
  const [hs, as] = m ? score(m) : [0, 0];
  return (
    <div className="recap">
      {m && <div className="row" style={{ gap: 18 }}><Crest team={L.team(m.homeId)} size={48} /><span style={{ fontFamily: 'var(--display)', fontWeight: 900, fontSize: '2.4rem' }}>{f === 'ft' ? `${hs} – ${as}` : 'VS'}</span><Crest team={L.team(m.awayId)} size={48} /></div>}
      {f === 'intro' && <div className="recap-goal" key="intro">{h.title}</div>}
      {ev && (
        <div className="recap-goal" key={ev.id}>
          ⚽ {ev.minute}' {L.player(ev.playerId)?.name}{ev.type === 'penalty' ? ' (pen)' : ev.type === 'own_goal' ? ' (OG)' : ''}
          {ev.assistId && <div className="small" style={{ fontFamily: 'var(--body)', textTransform: 'none', fontWeight: 500, opacity: .8 }}>Assist: {L.player(ev.assistId)?.name}</div>}
        </div>
      )}
      {f === 'ft' && <div className="recap-goal" key="ft">Full time</div>}
      <div className="small" style={{ opacity: .6 }}>Animated recap · Organizers can attach the official video</div>
      <div className="recap-progress" style={{ width: `${((i + 1) / frames.length) * 100}%` }} />
    </div>
  );
}

export function useHighlightPlayer() {
  const { viewHighlight } = useStore();
  const [h, setH] = useState<Highlight | null>(null);
  // Count a view each time a highlight is opened.
  const open = (x: Highlight) => { viewHighlight(x.id); setH(x); };
  const modal = h ? (
    <Modal title={h.title} onClose={() => setH(null)} wide>
      {h.youtubeId
        ? <iframe className="video-frame" src={`https://www.youtube-nocookie.com/embed/${h.youtubeId}?autoplay=1`} title={h.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        : <Recap h={h} />}
      <div className="row-between" style={{ marginTop: 14 }}>
        <span className="muted small">{h.kind} · {h.duration} · {compact(h.views)} views</span>
        {h.matchId && <Link to={`/matches/${h.matchId}`} className="btn btn-ghost btn-sm" onClick={() => setH(null)}>Match centre</Link>}
      </div>
    </Modal>
  ) : null;
  return { open, modal };
}

export default function Highlights() {
  const { db } = useStore();
  const [kind, setKind] = useState<'All' | Highlight['kind']>('All');
  const [team, setTeam] = useState('');
  const { open, modal } = useHighlightPlayer();
  const list = db.highlights.filter((h) => {
    if (kind !== 'All' && h.kind !== kind) return false;
    if (team) {
      const m = db.matches.find((x) => x.id === h.matchId);
      if (!m || (m.homeId !== team && m.awayId !== team)) return false;
    }
    return true;
  });
  return (
    <>
      <PageHead kicker="Watch" title="Highlights" sub="Every goal, every save, every moment — from every match of the tour." />
      <section className="section">
        <div className="container">
          <div className="row-between wrap" style={{ marginBottom: 22 }}>
            <div className="chips">
              {(['All', 'Goals', 'Extended', 'Saves', 'Skills', 'Interview'] as const).map((k) => (
                <button key={k} className={`chip ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
            <select value={team} onChange={(e) => setTeam(e.target.value)} style={{ maxWidth: 220 }} aria-label="Filter by club">
              <option value="">All clubs</option>
              {db.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {list.length ? <div className="video-grid">{list.map((h) => <HighlightCard key={h.id} h={h} onOpen={open} />)}</div> : <Empty>No highlights match your filters.</Empty>}
        </div>
      </section>
      {modal}
    </>
  );
}
