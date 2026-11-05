import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/store';
import { PageHead, StandingsTable, LeaderCard, Bracket } from '../components/blocks';
import { Crest } from '../components/ui';
import { playerTotals, teamSeasonStats, standings, leagueComplete } from '../data/derive';
import type { Position } from '../types';

export default function Standings() {
  const { db, user } = useStore();
  const done = leagueComplete(db);
  return (
    <>
      <PageHead kicker={`Season ${db.settings.season}`} title="The table" sub="Three points for a win, one for a draw. Ties are split by goal difference, then goals scored. The top four reach the Final Four." />
      <section className="section">
        <div className="container stack" style={{ gap: 28 }}>
          <div className="card card-pad">
            <StandingsTable highlight={user?.teamId ?? user?.favoriteTeamId} />
            <div className="legend">
              <span><i style={{ background: 'var(--turq)' }} />Final Four (semi-finals)</span>
              <span><i style={{ background: 'rgba(242,179,61,.4)' }} />Your club</span>
              <span>P played · GF goals for · GA goals against · GD goal difference</span>
            </div>
          </div>
          <div className="card card-pad" style={{ background: 'var(--navy-900)', color: '#fff' }}>
            <div className="row-between wrap" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Final Four bracket</h3>
              <span className={`pill ${done ? 'pill-ok' : 'pill-gold'}`}>{done ? 'Confirmed' : 'Projected — if the season ended today'}</span>
            </div>
            <Bracket />
          </div>
        </div>
      </section>
    </>
  );
}

export function Stats() {
  const { db } = useStore();
  const [tab, setTab] = useState<'players' | 'teams' | 'all'>('players');
  const [pos, setPos] = useState<'' | Position>('');
  const [sort, setSort] = useState<'goals' | 'assists' | 'yellows' | 'cleanSheets'>('goals');
  const totals = [...playerTotals(db).values()].filter((t) => t.player.active && (!pos || t.player.position === pos)).sort((a, b) => b[sort] - a[sort] || b.goals - a.goals).slice(0, 40);
  const table = standings(db);
  const teamName = (id: string) => db.teams.find((t) => t.id === id);

  return (
    <>
      <PageHead kicker="Numbers" title="Stats centre" sub="Top scorers, assists, clean sheets, discipline and club statistics — updated after every verified result." />
      <section className="section">
        <div className="container">
          <div className="tabs">
            <button className={tab === 'players' ? 'active' : ''} onClick={() => setTab('players')}>Leaders</button>
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All players</button>
            <button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>Clubs</button>
          </div>
          {tab === 'players' && (
            <div className="grid grid-3">
              <LeaderCard stat="goals" title="Top scorers" />
              <LeaderCard stat="assists" title="Top assists" />
              <LeaderCard stat="ga" title="Goals + assists" />
              <LeaderCard stat="cleanSheets" title="Clean sheets" />
              <LeaderCard stat="yellows" title="Yellow cards" />
              <LeaderCard stat="reds" title="Red cards" />
            </div>
          )}
          {tab === 'all' && (
            <div className="card card-pad">
              <div className="row wrap" style={{ marginBottom: 14 }}>
                <select value={pos} onChange={(e) => setPos(e.target.value as Position | '')} style={{ maxWidth: 180 }} aria-label="Position">
                  <option value="">All positions</option><option value="GK">Goalkeepers</option><option value="DF">Defenders</option><option value="MF">Midfielders</option><option value="FW">Forwards</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={{ maxWidth: 180 }} aria-label="Sort by">
                  <option value="goals">Sort: Goals</option><option value="assists">Sort: Assists</option><option value="cleanSheets">Sort: Clean sheets</option><option value="yellows">Sort: Yellow cards</option>
                </select>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Player</th><th>Club</th><th className="num">Pos</th><th className="num">G</th><th className="num">A</th><th className="num">Pen</th><th className="num">CS</th><th className="num">YC</th><th className="num">RC</th></tr></thead>
                  <tbody>
                    {totals.map((t) => (
                      <tr key={t.player.id}>
                        <td><Link to={`/players/${t.player.id}`} className="player-link">{t.player.name}</Link></td>
                        <td><span className="row"><Crest team={teamName(t.player.teamId)} size={20} />{teamName(t.player.teamId)?.short}</span></td>
                        <td className="num">{t.player.position}</td>
                        <td className="num pts">{t.goals}</td><td className="num">{t.assists}</td><td className="num">{t.penalties}</td>
                        <td className="num">{t.player.position === 'GK' ? t.cleanSheets : '–'}</td><td className="num">{t.yellows}</td><td className="num">{t.reds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {tab === 'teams' && (
            <div className="card card-pad">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Club</th><th className="num">Goals</th><th className="num">Conceded</th><th className="num">Avg poss.</th><th className="num">Shots / game</th><th className="num">On target / game</th><th className="num">Clean sheets</th><th className="num">YC</th><th className="num">RC</th></tr></thead>
                  <tbody>
                    {table.map((r) => {
                      const s = teamSeasonStats(db, r.team.id);
                      return (
                        <tr key={r.team.id}>
                          <td><Link to={`/teams/${r.team.id}`} className="team-cell"><Crest team={r.team} size={22} />{r.team.name}</Link></td>
                          <td className="num pts">{r.gf}</td><td className="num">{r.ga}</td><td className="num">{s.possession}%</td><td className="num">{s.shotsPerGame}</td><td className="num">{s.onTargetPerGame}</td><td className="num">{s.cleanSheets}</td><td className="num">{s.yellow}</td><td className="num">{s.red}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
