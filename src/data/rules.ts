import type { ApprovalRequest, DB, Match } from '../types';
import { score, standings } from './derive';

/**
 * Tournament rules shared by the UI (to warn and disable buttons) and the store (to enforce).
 * Every function is pure: pass in the data and "now".
 */

/** Hosts can start a match from this many minutes before its scheduled kickoff. */
export const KICKOFF_WINDOW_MIN = 60;
/** Two matches at the same ground must be at least this far apart. */
export const VENUE_GAP_MIN = 150;
/** A team can't play twice within this many hours. */
export const TEAM_GAP_HOURS = 20;
/** Player of the Match voting stays open for this long after kickoff. */
export const MOTM_HOURS = 72;

const t = (iso: string) => new Date(iso).getTime();

/** Scheduled and still in the future. */
export const isUpcoming = (m: Match, now = Date.now()) => m.status === 'scheduled' && t(m.kickoff) > now;
/** Scheduled, but the kickoff time has passed and nobody has started it or entered a result. */
export const isOverdue = (m: Match, now = Date.now()) => m.status === 'scheduled' && t(m.kickoff) <= now;

const label = (db: DB, m: Match) => {
  const n = (id: string | null, l?: string) => db.teams.find((x) => x.id === id)?.short ?? l ?? 'TBD';
  return `${n(m.homeId, m.homeLabel)} v ${n(m.awayId, m.awayLabel)}`;
};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Other fixtures that would clash if `matchId` moved to `kickoff` at `venueId`. */
export function findClashes(db: DB, matchId: string, kickoff: string, venueId: string): string[] {
  const m = db.matches.find((x) => x.id === matchId);
  if (!m) return [];
  const k = t(kickoff);
  const out: string[] = [];
  for (const o of db.matches) {
    if (o.id === m.id || o.status === 'finished' || o.status === 'postponed') continue;
    const gap = Math.abs(t(o.kickoff) - k);
    if (o.venueId === venueId && gap < VENUE_GAP_MIN * 6e4) {
      out.push(`${db.venues.find((v) => v.id === venueId)?.name} already hosts ${label(db, o)} at ${when(o.kickoff)}`);
      continue;
    }
    const shared = [m.homeId, m.awayId].filter((id) => id && (id === o.homeId || id === o.awayId));
    if (shared.length && gap < TEAM_GAP_HOURS * 36e5) {
      const team = db.teams.find((x) => x.id === shared[0])?.name;
      out.push(`${team} would also be playing ${label(db, o)} at ${when(o.kickoff)}`);
    }
  }
  return out;
}

/** Why a proposed new kickoff/venue can't be used (null = fine). */
export function scheduleProblem(db: DB, matchId: string, kickoff: string | undefined, venueId: string | undefined, now = Date.now()): string | null {
  const m = db.matches.find((x) => x.id === matchId);
  if (!m) return 'Match not found.';
  if (m.status !== 'scheduled' && m.status !== 'postponed') return 'This match has already started or finished, so it can no longer be moved.';
  const k = kickoff ?? m.kickoff;
  if (kickoff && t(kickoff) <= now) return 'The new kickoff time is in the past.';
  const clashes = findClashes(db, matchId, k, venueId ?? m.venueId);
  return clashes.length ? `Clash: ${clashes[0]}.` : null;
}

/** Why the God Admin can't approve this request right now (null = can approve). */
export function approvalBlocker(db: DB, r: ApprovalRequest, now = Date.now()): string | null {
  if (r.status !== 'pending') return 'This request is no longer pending.';
  const s = db.settings;
  if (r.type === 'reschedule' || r.type === 'fixture_change') {
    const m = db.matches.find((x) => x.id === r.matchId);
    if (!m) return 'Match not found.';
    if (m.status === 'scheduled' && t(m.kickoff) <= now) return 'The original kickoff time has already passed.';
    return scheduleProblem(db, m.id, r.payload.proposedKickoff, r.payload.proposedVenueId, now);
  }
  if (r.type === 'add_player' || r.type === 'remove_player') {
    if (s.rosterLocked) return 'Rosters are locked. Unlock them in Tournament rules, or reject the request.';
  }
  if (r.type === 'add_player' && r.payload.player) {
    const size = db.players.filter((p) => p.teamId === r.teamId && p.active).length;
    if (size >= s.maxSquadSize) return `The squad is already at the ${s.maxSquadSize}-player limit.`;
    if (db.players.some((p) => p.teamId === r.teamId && p.active && p.number === r.payload.player!.number)) {
      return `Shirt #${r.payload.player.number} has since been taken. Reject it, or ask the captain to resubmit.`;
    }
  }
  if (r.type === 'remove_player') {
    const p = db.players.find((x) => x.id === r.payload.playerId);
    if (!p || !p.active) return 'This player is no longer in the squad.';
  }
  if (r.type === 'result') {
    const m = db.matches.find((x) => x.id === r.matchId);
    if (!m || m.status !== 'awaiting_verification') return 'This result is no longer waiting for verification.';
  }
  return null;
}

/** Things worth flagging to the God Admin that don't block approval. */
export function approvalWarning(db: DB, r: ApprovalRequest, now = Date.now()): string | null {
  if (r.type === 'reschedule' && r.status === 'pending') {
    const m = db.matches.find((x) => x.id === r.matchId);
    if (m && m.status === 'scheduled') {
      const h = (t(m.kickoff) - now) / 36e5;
      if (h > 0 && h < db.settings.minRescheduleNoticeHours) return `Kickoff is now only ${Math.round(h)}h away — inside the ${db.settings.minRescheduleNoticeHours}h notice window.`;
    }
  }
  return null;
}

/** Can a host start this match now? */
export function kickOffState(m: Match, now = Date.now()): { ok: boolean; opensAt: string } {
  const opens = t(m.kickoff) - KICKOFF_WINDOW_MIN * 6e4;
  return { ok: now >= opens && !!m.homeId && !!m.awayId, opensAt: new Date(opens).toISOString() };
}

/** Player of the Match voting window. */
export const motmClosesAt = (m: Match) => new Date(t(m.kickoff) + MOTM_HOURS * 36e5).toISOString();
export const motmOpen = (m: Match, now = Date.now()) => m.status === 'finished' && now < t(motmClosesAt(m));

/** Knockout matches need a winner — a draw is settled by the recorded shoot-out winner. */
export function winnerOf(m: Match): string | null {
  if (m.status !== 'finished') return null;
  const [h, a] = score(m);
  if (h > a) return m.homeId;
  if (a > h) return m.awayId;
  return m.shootoutWinner ?? null;
}

/**
 * Fill knockout slots once they are decided: the Final Four from the final league table,
 * then the Final from the two semi-final winners. Mutates `d`; returns what changed.
 */
export function advanceKnockouts(d: DB): string[] {
  const changed: string[] = [];
  const league = d.matches.filter((m) => m.stage === 'league');
  const semis = d.matches.filter((m) => m.stage === 'semi').sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const final = d.matches.find((m) => m.stage === 'final');
  if (league.length && league.every((m) => m.status === 'finished')) {
    const table = standings(d);
    semis.forEach((m) => {
      if (m.homeId && m.awayId) return;
      const pos = (l?: string) => Number(l?.match(/^(\d)/)?.[1] ?? 0);
      const h = table[pos(m.homeLabel) - 1]?.team.id, a = table[pos(m.awayLabel) - 1]?.team.id;
      if (h && a) { m.homeId = h; m.awayId = a; changed.push(`${m.id}`); }
    });
  }
  if (final && !final.homeId && semis.length === 2) {
    const w1 = winnerOf(semis[0]), w2 = winnerOf(semis[1]);
    if (w1 && w2) { final.homeId = w1; final.awayId = w2; changed.push(final.id); }
  }
  return changed;
}
