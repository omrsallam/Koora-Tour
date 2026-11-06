import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Match, Team } from '../types';
import { useLookup, useStore } from '../store/store';
import { standings, score, hasScore, leaders, type LeaderKey, resolveSlot } from '../data/derive';
import { Crest, FormBadge, Avatar, StadiumIcon } from './ui';
import { G } from '../theme';
import { fmtTime, roundLabel } from '../format';

export function PageHead({ kicker, title, sub, children }: { kicker?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <>
      <section className="page-head">
        <div className="container page-head-inner">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>
          {children}
        </div>
      </section>
      <div className="page-head-accent" />
    </>
  );
}

export function StandingsTable({ compact = false, highlight }: { compact?: boolean; highlight?: string }) {
  const { db } = useStore();
  const rows = standings(db);
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="num">#</th><th>Club</th><th className="num">P</th>
            {!compact && <><th className="num">W</th><th className="num">D</th><th className="num">L</th><th className="num hide-sm">GF</th><th className="num hide-sm">GA</th></>}
            <th className="num">GD</th><th className="num">Pts</th>
            {!compact && <th className="hide-sm">Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className={`${i < 4 ? 'q-final' : ''} ${highlight === r.team.id ? 'mine' : ''}`}>
              <td className="num pos">{i + 1}</td>
              <td><Link to={`/teams/${r.team.id}`} className="team-cell"><Crest team={r.team} size={24} />{compact ? r.team.short : <><span className="nm-full">{r.team.name}</span><span className="nm-short">{r.team.short}</span></>}</Link></td>
              <td className="num">{r.p}</td>
              {!compact && <><td className="num">{r.w}</td><td className="num">{r.d}</td><td className="num">{r.l}</td><td className="num hide-sm">{r.gf}</td><td className="num hide-sm">{r.ga}</td></>}
              <td className="num">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="num pts">{r.pts}</td>
              {!compact && <td className="hide-sm"><div className="row" style={{ gap: 4 }}>{r.form.map((f, k) => <FormBadge key={k} r={f} />)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LEADER_META: Record<LeaderKey, { label: string; color: string }> = {
  goals: { label: 'Goals', color: G.red },
  assists: { label: 'Assists', color: G.blue },
  ga: { label: 'Goal contributions', color: G.turq },
  cleanSheets: { label: 'Clean sheets', color: G.turq },
  yellows: { label: 'Yellow cards', color: G.night },
  reds: { label: 'Red cards', color: G.red },
};

export function LeaderCard({ stat, limit = 5, title }: { stat: LeaderKey; limit?: number; title?: string }) {
  const { db } = useStore();
  const L = useLookup();
  const list = leaders(db, stat, limit);
  const meta = LEADER_META[stat];
  const top = list[0];
  const topTeam = top && L.team(top.player.teamId);
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="leader-hero" style={{ background: meta.color }}>
        {top ? (
          <>
            <Avatar name={top.player.name} size={54} color="#ffffff" />
            <div>
              <div className="small" style={{ opacity: .8, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{title ?? meta.label}</div>
              <Link to={`/players/${top.player.id}`} className="nm">{top.player.name}</Link>
              <div className="small" style={{ opacity: .8 }}>{topTeam?.name}</div>
            </div>
            <div className="big">{top.value}</div>
          </>
        ) : <div className="nm">{title ?? meta.label}</div>}
      </div>
      <ul className="plain leader-list">
        {list.slice(1).map((x, i) => (
          <li key={x.player.id}>
            <span className="rank">{i + 2}</span>
            <Crest team={L.team(x.player.teamId)} size={22} />
            <Link to={`/players/${x.player.id}`} className="player-link">{x.player.name}</Link>
            {x.sub && <span className="muted small">{x.sub}</span>}
            <span className="val">{x.value}</span>
          </li>
        ))}
        {list.length === 0 && <li className="muted">No data yet.</li>}
      </ul>
    </div>
  );
}

export function FixtureRow({ m }: { m: Match }) {
  const { db } = useStore();
  const L = useLookup();
  const homeId = resolveSlot(db, m, 'home');
  const awayId = resolveSlot(db, m, 'away');
  const home = L.team(homeId);
  const away = L.team(awayId);
  const projected = m.stage !== 'league' && !m.homeId;
  const [h, a] = score(m);
  const nameOf = (t: Team | undefined, label?: string) => (t ? t.name : label ?? 'TBD');
  return (
    <Link to={`/matches/${m.id}`} className="fixture">
      <div className="side home"><span className="nm-full">{nameOf(home, m.homeLabel)}</span><span className="nm-short">{home?.short ?? m.homeLabel}</span><Crest team={home} label={m.homeLabel} size={30} /></div>
      <div className="mid">
        {hasScore(m)
          ? <span className={`scorebox ${m.status === 'live' ? 'live' : ''}`}>{h} – {a}</span>
          : m.status === 'postponed' ? <span className="pill pill-danger">PPD</span> : <span className="timebox">{fmtTime(m.kickoff)}</span>}
        {m.status === 'live' && <div className="small" style={{ color: 'var(--tulip)', fontWeight: 700 }}>{m.liveMinute ?? 0}'</div>}
        {m.status === 'awaiting_verification' && <div className="small" style={{ color: 'var(--warn)', fontWeight: 700 }}>Verifying</div>}
      </div>
      <div className="side"><Crest team={away} label={m.awayLabel} size={30} /><span className="nm-full">{nameOf(away, m.awayLabel)}</span><span className="nm-short">{away?.short ?? m.awayLabel}</span></div>
      <div className="meta">
        <span className="venue-inline"><StadiumIcon size={13} />{L.venue(m.venueId)?.name}</span><br />
        {projected ? <span className="pill pill-gold">Projected</span> : roundLabel(m.stage, m.round)}
      </div>
    </Link>
  );
}

export function Bracket() {
  const { db } = useStore();
  const L = useLookup();
  const ko = db.matches.filter((m) => m.stage !== 'league');
  const sfs = ko.filter((m) => m.stage === 'semi');
  const fin = ko.find((m) => m.stage === 'final');
  const side = (m: Match, s: 'home' | 'away') => {
    const t = L.team(resolveSlot(db, m, s));
    const label = s === 'home' ? m.homeLabel : m.awayLabel;
    return <div className="tm"><Crest team={t} label={label} size={22} />{t?.name ?? label}<span className="muted small" style={{ marginLeft: 'auto' }}>{t && !m.homeId ? label : ''}</span></div>;
  };
  return (
    <div className="bracket">
      <div className="bracket-col">
        {sfs.map((m, i) => (
          <Link to={`/matches/${m.id}`} className="bracket-match" key={m.id}>
            <div className="lbl"><span>Semi-final {i + 1}</span><span className="venue-inline"><StadiumIcon size={12} />{L.venue(m.venueId)?.name}</span></div>
            {side(m, 'home')}{side(m, 'away')}
          </Link>
        ))}
      </div>
      {fin && (
        <Link to={`/matches/${fin.id}`} className="bracket-match bracket-final">
          <div className="lbl"><span>🏆 The Final</span><span className="venue-inline"><StadiumIcon size={12} />{L.venue(fin.venueId)?.name}</span></div>
          <div className="tm">Winner SF1</div><div className="tm">Winner SF2</div>
        </Link>
      )}
    </div>
  );
}
