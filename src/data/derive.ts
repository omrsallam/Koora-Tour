import type { DB, Match, Player, Team } from '../types';

export function score(m: Match): [number, number] {
  let h = 0, a = 0;
  for (const e of m.events) {
    if (e.type === 'goal' || e.type === 'penalty') {
      if (e.teamId === m.homeId) h++; else a++;
    } else if (e.type === 'own_goal') {
      if (e.teamId === m.homeId) a++; else h++;
    }
  }
  return [h, a];
}

export const isCounted = (m: Match) => m.status === 'finished' && m.stage === 'league';
export const hasScore = (m: Match) => m.status === 'finished' || m.status === 'live' || m.status === 'awaiting_verification';

export interface Row {
  team: Team;
  p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number;
  form: ('W' | 'D' | 'L')[];
}

export function standings(db: DB): Row[] {
  const rows = new Map<string, Row>();
  db.teams.forEach((team) => rows.set(team.id, { team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] }));
  const played = db.matches.filter(isCounted).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  for (const m of played) {
    const [h, a] = score(m);
    const home = rows.get(m.homeId!)!;
    const away = rows.get(m.awayId!)!;
    home.p++; away.p++;
    home.gf += h; home.ga += a; away.gf += a; away.ga += h;
    if (h > a) { home.w++; away.l++; home.pts += 3; home.form.push('W'); away.form.push('L'); }
    else if (h < a) { away.w++; home.l++; away.pts += 3; away.form.push('W'); home.form.push('L'); }
    else { home.d++; away.d++; home.pts++; away.pts++; home.form.push('D'); away.form.push('D'); }
  }
  const list = [...rows.values()];
  list.forEach((r) => { r.gd = r.gf - r.ga; r.form = r.form.slice(-5); });
  return list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.name.localeCompare(y.team.name));
}

export interface PlayerTotals {
  player: Player;
  goals: number; assists: number; penalties: number; yellows: number; reds: number;
  apps: number; cleanSheets: number;
}

export function playerTotals(db: DB): Map<string, PlayerTotals> {
  const map = new Map<string, PlayerTotals>();
  db.players.forEach((player) => map.set(player.id, { player, goals: 0, assists: 0, penalties: 0, yellows: 0, reds: 0, apps: 0, cleanSheets: 0 }));
  const played = db.matches.filter((m) => m.status === 'finished');
  for (const m of played) {
    for (const e of m.events) {
      const t = map.get(e.playerId);
      if (!t) continue;
      if (e.type === 'goal' || e.type === 'penalty') { t.goals++; if (e.type === 'penalty') t.penalties++; }
      if (e.type === 'yellow') t.yellows++;
      if (e.type === 'red') t.reds++;
      if (e.assistId) { const a = map.get(e.assistId); if (a) a.assists++; }
    }
    const [h, a] = score(m);
    [m.homeId, m.awayId].forEach((teamId, idx) => {
      const conceded = idx === 0 ? a : h;
      const squad = db.players.filter((p) => p.teamId === teamId && p.active);
      // Appearances: a simple model — every active squad member is credited (no lineup data in this prototype).
      squad.forEach((p) => { map.get(p.id)!.apps++; });
      const keeper = squad.find((p) => p.position === 'GK');
      if (keeper && conceded === 0) map.get(keeper.id)!.cleanSheets++;
    });
  }
  return map;
}

export type LeaderKey = 'goals' | 'assists' | 'cleanSheets' | 'yellows' | 'reds' | 'ga';

export function leaders(db: DB, key: LeaderKey, limit = 10): { player: Player; value: number; sub?: string }[] {
  const totals = [...playerTotals(db).values()];
  const withValue = totals.map((t) => ({
    player: t.player,
    value: key === 'ga' ? t.goals + t.assists : t[key],
    sub: key === 'goals' ? `${t.penalties} pen` : key === 'ga' ? `${t.goals}G · ${t.assists}A` : undefined,
    tiebreak: key === 'goals' ? t.assists : key === 'assists' ? t.goals : 0,
  }));
  return withValue
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || b.tiebreak - a.tiebreak || a.player.name.localeCompare(b.player.name))
    .slice(0, limit);
}

export function teamMatches(db: DB, teamId: string) {
  return db.matches.filter((m) => m.homeId === teamId || m.awayId === teamId).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

export function resultFor(m: Match, teamId: string): 'W' | 'D' | 'L' | null {
  if (m.status !== 'finished') return null;
  const [h, a] = score(m);
  const mine = m.homeId === teamId ? h : a;
  const theirs = m.homeId === teamId ? a : h;
  return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
}

export function teamSeasonStats(db: DB, teamId: string) {
  const ms = teamMatches(db, teamId).filter((m) => m.status === 'finished');
  let poss = 0, shots = 0, onT = 0, corners = 0, cleanSheets = 0, yellow = 0, red = 0;
  ms.forEach((m) => {
    const idx = m.homeId === teamId ? 0 : 1;
    if (m.stats) { poss += m.stats.possession[idx]; shots += m.stats.shots[idx]; onT += m.stats.onTarget[idx]; corners += m.stats.corners[idx]; }
    const [h, a] = score(m);
    if ((idx === 0 ? a : h) === 0) cleanSheets++;
    m.events.forEach((e) => { if (e.teamId === teamId) { if (e.type === 'yellow') yellow++; if (e.type === 'red') red++; } });
  });
  const n = ms.length || 1;
  return { played: ms.length, possession: Math.round(poss / n), shotsPerGame: +(shots / n).toFixed(1), onTargetPerGame: +(onT / n).toFixed(1), corners, cleanSheets, yellow, red };
}

/** Resolve knockout slots from the current table (projected until the league phase is complete). */
export function resolveSlot(db: DB, m: Match, side: 'home' | 'away'): string | null {
  const id = side === 'home' ? m.homeId : m.awayId;
  if (id) return id;
  const label = side === 'home' ? m.homeLabel : m.awayLabel;
  const table = standings(db);
  const pos = label?.match(/^(\d)/);
  if (pos) return table[Number(pos[1]) - 1]?.team.id ?? null;
  return null;
}

export function leagueComplete(db: DB) {
  return db.matches.filter((m) => m.stage === 'league').every((m) => m.status === 'finished');
}
