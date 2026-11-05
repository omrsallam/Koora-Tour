import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { NewsItem } from '../types';
import { useStore, useLookup, ROLE_LABEL } from '../store/store';
import { Crest, Empty, Star8 } from '../components/ui';
import { PageHead } from '../components/blocks';
import { fmtLong, timeAgo } from '../format';

const CAT_BG: Record<NewsItem['category'], string> = {
  Report: 'linear-gradient(135deg,#0a1633,#19306a)',
  Preview: 'linear-gradient(135deg,#0b6a67,#1fb5b0)',
  Feature: 'linear-gradient(135deg,#9a4a0e,#f2b33d)',
  Announcement: 'linear-gradient(135deg,#5b0614,#e3263b)',
  Interview: 'linear-gradient(135deg,#1f4fd1,#0a1633)',
};

export function NewsCard({ n }: { n: NewsItem }) {
  const L = useLookup();
  const t = L.team(n.teamIds[0]);
  return (
    <Link to={`/news/${n.id}`} className="news-card">
      <div className="news-art" style={{ background: t ? `linear-gradient(135deg, ${t.colors[0]}, #0a1633)` : CAT_BG[n.category] }}>
        <div className="row" style={{ width: '100%', justifyContent: 'space-between' }}>
          <span className="pill" style={{ background: 'rgba(255,255,255,.92)', color: '#0a1633' }}>{n.category}</span>
          {t ? <Crest team={t} size={40} /> : <Star8 size={34} color="#f2b33d" />}
        </div>
      </div>
      <div className="news-body">
        <b>{n.title}</b>
        <span className="muted small">{n.summary}</span>
        <span className="muted small" style={{ marginTop: 'auto' }}>{timeAgo(n.date)}</span>
      </div>
    </Link>
  );
}

export default function News() {
  const { db } = useStore();
  const [cat, setCat] = useState<'All' | NewsItem['category']>('All');
  const list = db.news.filter((n) => cat === 'All' || n.category === cat);
  return (
    <>
      <PageHead kicker="Stories" title="News" sub="Match reports, previews, interviews and official announcements." />
      <section className="section">
        <div className="container">
          <div className="chips" style={{ marginBottom: 22 }}>
            {(['All', 'Report', 'Preview', 'Feature', 'Interview', 'Announcement'] as const).map((c) => (
              <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          {list.length ? (
            <div className="grid grid-3">{list.map((n, i) => <div key={n.id} className={i === 0 && cat === 'All' ? 'news-feature' : ''}><NewsCard n={n} /></div>)}</div>
          ) : <Empty>No stories in this category yet.</Empty>}
        </div>
      </section>
    </>
  );
}

export function Article() {
  const { id } = useParams();
  const { db } = useStore();
  const L = useLookup();
  const n = db.news.find((x) => x.id === id);
  if (!n) return <section className="section"><div className="container"><Empty>Article not found. <Link to="/news" className="link-btn">Back to news</Link></Empty></div></section>;
  const author = L.user(n.authorId);
  return (
    <>
      <PageHead kicker={n.category} title={n.title} sub={n.summary} />
      <section className="section">
        <div className="container article">
          <div className="muted small" style={{ marginBottom: 20 }}>{fmtLong(n.date)} · By {author?.name ?? 'Koora Tour'}{author ? ` (${ROLE_LABEL[author.role]})` : ''}</div>
          {n.body.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {n.teamIds.length > 0 && (
            <div className="row wrap" style={{ marginTop: 24 }}>
              <span className="muted small">Clubs in this story:</span>
              {n.teamIds.map((t) => { const tm = L.team(t); return tm && <Link key={t} to={`/teams/${t}`} className="chip row"><Crest team={tm} size={18} /> {tm.name}</Link>; })}
            </div>
          )}
          <div className="divider" />
          <Link to="/news" className="link-btn">← All news</Link>
        </div>
      </section>
    </>
  );
}
