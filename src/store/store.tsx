import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApprovalRequest, DB, Match, MatchEvent, NewsItem, Highlight, Privilege, Role, User, Venue, Team, Settings, Notice } from '../types';
import { createSeed, DB_VERSION } from '../data/seed';
import { score } from '../data/derive';
import { approvalBlocker, scheduleProblem, kickOffState, motmOpen, advanceKnockouts } from '../data/rules';

const DB_KEY = 'koora-tour-db';
const USER_KEY = 'koora-tour-user';

function load(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch { /* storage unavailable or corrupted — fall back to a fresh season */ }
  return createSeed();
}

let idCounter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Email must look valid and not already belong to someone. */
export function emailProblem(db: DB, email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Enter a valid email address.';
  if (db.users.some((u) => u.email.toLowerCase() === e)) return 'An account with this email already exists.';
  return null;
}

export type Result = { ok: true; message: string } | { ok: false; message: string };

/* ------------------------------------------------------------------ */
/* Permissions                                                          */
/* ------------------------------------------------------------------ */

export const has = (u: User | null | undefined, p: Privilege) => !!u && !u.suspended && (u.role === 'god' || u.privileges.includes(p));
export const isStaff = (u: User | null | undefined) => !!u && (u.role === 'host' || u.role === 'organizer');

/** Hosts run match-day only at their assigned venues; organizers with the privilege can run any match. */
export function canRunMatch(u: User | null | undefined, m: Match) {
  if (!u || u.suspended) return false;
  if (u.role === 'god') return true;
  if (!u.privileges.includes('enter_results')) return false;
  if (u.role === 'host') return !!u.venueIds?.includes(m.venueId);
  return true;
}

export const ROLE_LABEL: Record<Role, string> = {
  god: 'God Admin', host: 'Host', organizer: 'Organizer', captain: 'Team Captain', player: 'Player', fan: 'Fan',
};

export function dashboardPath(u: User | null | undefined) {
  if (!u) return '/login';
  switch (u.role) {
    case 'god': return '/dashboard/admin';
    case 'host': case 'organizer': return '/dashboard/staff';
    case 'captain': return '/dashboard/captain';
    case 'player': return '/dashboard/player';
    default: return '/my-koora';
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

interface Store {
  db: DB;
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
  signupFan: (name: string, email: string, favoriteTeamId?: string) => Result;
  setFavorite: (teamId: string | undefined) => void;

  submitRequest: (r: Omit<ApprovalRequest, 'id' | 'status' | 'createdBy' | 'createdAt' | 'recommendations'>) => Result;
  cancelRequest: (id: string) => void;
  recommend: (id: string, verdict: 'support' | 'oppose', note: string) => void;
  decide: (id: string, approve: boolean, note: string) => Result;

  createUser: (u: Omit<User, 'id' | 'createdAt'>) => Result;
  updateUser: (id: string, patch: Partial<User>) => void;

  updateMatch: (id: string, patch: Partial<Match>, auditText?: string) => void;
  /** God Admin override of kickoff / venue / referee / postponement, with clash checks. */
  editFixture: (id: string, patch: Pick<Match, 'kickoff' | 'venueId' | 'referee'> & { postponed: boolean }) => Result;
  kickOff: (id: string) => Result;
  addEvent: (matchId: string, e: Omit<MatchEvent, 'id'>) => void;
  removeEvent: (matchId: string, eventId: string) => void;
  submitResult: (matchId: string, note: string) => Result;

  saveNews: (n: Omit<NewsItem, 'id' | 'date' | 'authorId'> & { id?: string }) => void;
  deleteNews: (id: string) => void;
  addHighlight: (h: Omit<Highlight, 'id' | 'addedBy' | 'views'>) => void;
  deleteHighlight: (id: string) => void;
  updateVenue: (id: string, patch: Partial<Venue>) => void;
  updateTeam: (id: string, patch: Partial<Team>) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  vote: (matchId: string, playerId: string) => void;
  viewHighlight: (id: string) => void;
  markRead: () => void;
  noticesFor: (u: User | null) => Notice[];
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem(USER_KEY); } catch { return null; }
  });

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore quota / private mode */ }
  }, [db]);
  useEffect(() => {
    try { userId ? localStorage.setItem(USER_KEY, userId) : localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  }, [userId]);

  // Keep tabs in sync (e.g. captain in one tab, God Admin in another).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DB_KEY && e.newValue) { try { setDb(JSON.parse(e.newValue)); } catch { /* ignore */ } }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const user = useMemo(() => db.users.find((u) => u.id === userId) ?? null, [db.users, userId]);

  const mutate = useCallback((fn: (d: DB) => void) => {
    setDb((prev) => { const next = structuredClone(prev); fn(next); return next; });
  }, []);

  const audit = (d: DB, actorId: string, action: string, detail: string) => {
    d.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actorId, action, detail });
  };
  const notify = (d: DB, to: string, text: string, link?: string) => {
    d.notices.unshift({ id: uid('no'), to, text, at: new Date().toISOString(), link, readBy: [] });
  };
  const teamName = (d: DB, id?: string | null) => d.teams.find((t) => t.id === id)?.name ?? 'TBD';
  const matchLabel = (d: DB, m?: Match) => (m ? `${teamName(d, m.homeId)} vs ${teamName(d, m.awayId)}` : 'match');

  const store: Store = {
    db,
    user,
    login: (id) => setUserId(id),
    logout: () => setUserId(null),
    signupFan: (name, email, favoriteTeamId) => {
      const problem = emailProblem(db, email);
      if (problem) return { ok: false, message: problem };
      const id = uid('u');
      mutate((d) => {
        d.users.push({ id, name: name.trim(), email: email.trim().toLowerCase(), role: 'fan', privileges: [], favoriteTeamId, createdAt: new Date().toISOString() });
      });
      setUserId(id);
      return { ok: true, message: 'Welcome to Koora Tour!' };
    },
    setFavorite: (teamId) => {
      if (!user) return;
      mutate((d) => { const u = d.users.find((x) => x.id === user.id); if (u) u.favoriteTeamId = teamId; });
    },

    submitRequest: (r) => {
      if (!user) return { ok: false, message: 'Sign in first.' };
      const s = db.settings;
      if ((r.type === 'add_player' || r.type === 'remove_player') && s.rosterLocked) {
        return { ok: false, message: 'Rosters are locked by the God Admin. No squad changes are accepted right now.' };
      }
      if (r.type === 'add_player' && r.teamId) {
        const size = db.players.filter((p) => p.teamId === r.teamId && p.active).length;
        const pendingAdds = db.requests.filter((x) => x.type === 'add_player' && x.status === 'pending' && x.teamId === r.teamId).length;
        if (size + pendingAdds >= s.maxSquadSize) return { ok: false, message: `Squad limit is ${s.maxSquadSize} players (including pending additions).` };
        const num = r.payload.player?.number;
        if (db.players.some((p) => p.teamId === r.teamId && p.active && p.number === num)) return { ok: false, message: `Shirt #${num} is already taken.` };
      }
      if (r.type === 'reschedule' && r.matchId) {
        const m = db.matches.find((x) => x.id === r.matchId)!;
        const hours = (new Date(m.kickoff).getTime() - Date.now()) / 36e5;
        if (hours < s.minRescheduleNoticeHours) return { ok: false, message: `Requests must be made at least ${s.minRescheduleNoticeHours}h before kickoff.` };
        if (db.requests.some((x) => x.type === 'reschedule' && x.status === 'pending' && x.matchId === r.matchId)) {
          return { ok: false, message: 'There is already a pending reschedule request for this match.' };
        }
      }
      if ((r.type === 'reschedule' || r.type === 'fixture_change') && r.matchId) {
        if (!r.payload.proposedKickoff && !r.payload.proposedVenueId) return { ok: false, message: 'Nothing would change — pick a new time or venue.' };
        if (r.type === 'fixture_change' && db.requests.some((x) => x.type === 'fixture_change' && x.status === 'pending' && x.matchId === r.matchId)) {
          return { ok: false, message: 'There is already a pending fixture change for this match.' };
        }
        const problem = scheduleProblem(db, r.matchId, r.payload.proposedKickoff, r.payload.proposedVenueId);
        if (problem) return { ok: false, message: problem };
      }
      if (r.type === 'remove_player' && db.requests.some((x) => x.type === 'remove_player' && x.status === 'pending' && x.payload.playerId === r.payload.playerId)) {
        return { ok: false, message: 'A removal request for this player is already pending.' };
      }
      mutate((d) => {
        const m0 = d.matches.find((x) => x.id === r.matchId);
        const payload = m0 ? { ...r.payload, originalKickoff: m0.kickoff, originalVenueId: m0.venueId } : r.payload;
        const req: ApprovalRequest = { ...r, payload, id: uid('r'), status: 'pending', createdBy: user.id, createdAt: new Date().toISOString(), recommendations: [] };
        d.requests.unshift(req);
        audit(d, user.id, 'Request submitted', `${req.type.replace('_', ' ')} — ${r.reason.slice(0, 80)}`);
        notify(d, 'role:god', `New ${req.type.replace('_', ' ')} request from ${user.name}.`, '/dashboard/admin');
        if (req.type === 'reschedule') notify(d, 'role:organizer', `${user.name} requested a ${req.payload.kind === 'delay' ? 'delay' : 'time change'} — your recommendation is welcome.`, '/dashboard/staff');
      });
      return { ok: true, message: 'Request sent to the God Admin for approval.' };
    },

    cancelRequest: (id) => mutate((d) => {
      const r = d.requests.find((x) => x.id === id);
      if (r && r.status === 'pending' && user && r.createdBy === user.id) {
        r.status = 'cancelled';
        audit(d, user.id, 'Request cancelled', r.reason.slice(0, 80));
      }
    }),

    recommend: (id, verdict, note) => {
      if (!has(user, 'review_requests')) return;
      mutate((d) => {
        const r = d.requests.find((x) => x.id === id);
        if (!r || r.status !== 'pending') return;
        r.recommendations = r.recommendations.filter((x) => x.userId !== user!.id);
        r.recommendations.push({ userId: user!.id, verdict, note, at: new Date().toISOString() });
        audit(d, user!.id, 'Recommendation added', `${verdict} on request ${r.id}`);
      });
    },

    decide: (id, approve, note) => {
      if (user?.role !== 'god') return { ok: false, message: 'Only the God Admin can decide.' };
      const r0 = db.requests.find((x) => x.id === id);
      if (!r0 || r0.status !== 'pending') return { ok: false, message: 'Request is no longer pending.' };
      if (approve) {
        const blocker = approvalBlocker(db, r0);
        if (blocker) return { ok: false, message: blocker };
      }
      mutate((d) => {
        const r = d.requests.find((x) => x.id === id)!;
        r.status = approve ? 'approved' : 'rejected';
        r.reviewedBy = user.id; r.reviewedAt = new Date().toISOString(); r.reviewNote = note;
        const m = d.matches.find((x) => x.id === r.matchId);
        const verdict = approve ? 'approved' : 'rejected';
        let summary = '';
        if (r.type === 'reschedule' || r.type === 'fixture_change') {
          summary = `${matchLabel(d, m)} ${r.type === 'reschedule' ? 'reschedule' : 'fixture change'}`;
          if (approve && m) {
            if (r.payload.proposedKickoff) m.kickoff = r.payload.proposedKickoff;
            if (r.payload.proposedVenueId) m.venueId = r.payload.proposedVenueId;
            if (m.status === 'postponed') m.status = 'scheduled';
            [m.homeId, m.awayId].forEach((t) => t && notify(d, `team:${t}`, `${matchLabel(d, m)} has a new kickoff: ${new Date(m.kickoff).toLocaleString()}.`, `/matches/${m.id}`));
            notify(d, 'role:host', `Fixture updated: ${matchLabel(d, m)}.`, `/matches/${m.id}`);
          }
        } else if (r.type === 'add_player' && r.payload.player) {
          summary = `Add ${r.payload.player.name} to ${teamName(d, r.teamId)}`;
          if (approve) {
            d.players.push({ ...r.payload.player, id: uid('p'), teamId: r.teamId!, active: true, joinedAt: new Date().toISOString() });
            notify(d, `team:${r.teamId}`, `${r.payload.player.name} has joined the squad.`, `/teams/${r.teamId}`);
          }
        } else if (r.type === 'remove_player') {
          const p = d.players.find((x) => x.id === r.payload.playerId);
          summary = `Remove ${p?.name} from ${teamName(d, r.teamId)}`;
          if (approve && p) {
            p.active = false;
            p.removedAt = new Date().toISOString();
            const linked = d.users.find((u) => u.playerId === p.id);
            if (linked && linked.role === 'player') { linked.role = 'fan'; linked.teamId = undefined; }
          }
        } else if (r.type === 'result' && m) {
          const [h, a] = score(m);
          summary = `Final score ${matchLabel(d, m)} ${h}–${a}`;
          m.status = approve ? 'finished' : 'live';
          if (approve) {
            const pens = h === a && m.shootoutWinner ? ` (${teamName(d, m.shootoutWinner)} win on penalties)` : '';
            notify(d, 'all', `Full time: ${teamName(d, m.homeId)} ${h}–${a} ${teamName(d, m.awayId)}${pens}.`, `/matches/${m.id}`);
            // Fill the Final Four / Final as soon as they are decided.
            advanceKnockouts(d).forEach((id) => {
              const k = d.matches.find((x) => x.id === id)!;
              [k.homeId, k.awayId].forEach((tm) => tm && notify(d, `team:${tm}`, `You're through! ${matchLabel(d, k)} — ${k.stage === 'final' ? 'the Final' : 'semi-final'}.`, `/matches/${k.id}`));
              notify(d, 'all', `${k.stage === 'final' ? 'The Final is set' : 'Semi-final confirmed'}: ${matchLabel(d, k)}.`, `/matches/${k.id}`);
              audit(d, user.id, 'Knockout confirmed', matchLabel(d, k));
            });
          }
        }
        notify(d, r.createdBy, `Your request "${summary}" was ${verdict}${note ? `: ${note}` : '.'}`, dashboardPath(d.users.find((u) => u.id === r.createdBy)));
        audit(d, user.id, `Request ${verdict}`, summary + (note ? ` — "${note}"` : ''));
      });
      return { ok: true, message: `Request ${approve ? 'approved and applied' : 'rejected'}.` };
    },

    createUser: (u) => {
      if (user?.role !== 'god') return { ok: false, message: 'Only the God Admin can invite users.' };
      const problem = emailProblem(db, u.email);
      if (problem) return { ok: false, message: problem };
      mutate((d) => {
        d.users.push({ ...u, name: u.name.trim(), email: u.email.trim().toLowerCase(), id: uid('u'), createdAt: new Date().toISOString() });
        audit(d, user.id, 'User created', `${u.name} as ${ROLE_LABEL[u.role]}`);
      });
      return { ok: true, message: `${u.name} was added as ${ROLE_LABEL[u.role]}.` };
    },
    updateUser: (id, patch) => {
      if (user?.role !== 'god') return;
      mutate((d) => {
        const u = d.users.find((x) => x.id === id);
        if (!u) return;
        const changes: string[] = [];
        if (patch.role && patch.role !== u.role) changes.push(`role ${ROLE_LABEL[u.role]} → ${ROLE_LABEL[patch.role]}`);
        if (patch.privileges) changes.push(`privileges: ${patch.privileges.join(', ') || 'none'}`);
        if (patch.suspended !== undefined && patch.suspended !== u.suspended) changes.push(patch.suspended ? 'suspended' : 'reinstated');
        if (patch.venueIds) changes.push(`venues: ${patch.venueIds.length}`);
        Object.assign(u, patch);
        audit(d, user.id, 'User updated', `${u.name}: ${changes.join('; ') || 'details'}`);
        if (changes.length) notify(d, u.id, `Your access was updated by the God Admin (${changes.join('; ')}).`);
      });
    },

    editFixture: (id, patch) => {
      if (user?.role !== 'god') return { ok: false, message: 'Only the God Admin can edit fixtures directly.' };
      const m0 = db.matches.find((x) => x.id === id);
      if (!m0) return { ok: false, message: 'Match not found.' };
      const moved = patch.kickoff !== m0.kickoff || patch.venueId !== m0.venueId;
      if (moved) {
        const problem = scheduleProblem(db, id, patch.kickoff !== m0.kickoff ? patch.kickoff : undefined, patch.venueId);
        if (problem) return { ok: false, message: problem };
      }
      if (patch.postponed && m0.status !== 'scheduled' && m0.status !== 'postponed') return { ok: false, message: 'Only a match that hasn\'t started can be postponed.' };
      mutate((d) => {
        const m = d.matches.find((x) => x.id === id)!;
        m.kickoff = patch.kickoff; m.venueId = patch.venueId; m.referee = patch.referee;
        if (m.status === 'scheduled' || m.status === 'postponed') m.status = patch.postponed ? 'postponed' : 'scheduled';
        audit(d, user.id, 'Fixture edited', `${matchLabel(d, m)}: ${new Date(m.kickoff).toLocaleString()} at ${d.venues.find((v) => v.id === m.venueId)?.name}${patch.postponed ? ' (postponed)' : ''}`);
        if (moved || patch.postponed !== (m0.status === 'postponed')) {
          const text = patch.postponed ? `${matchLabel(d, m)} has been postponed.` : `${matchLabel(d, m)}: ${new Date(m.kickoff).toLocaleString()} at ${d.venues.find((v) => v.id === m.venueId)?.name}.`;
          [m.homeId, m.awayId].forEach((tm) => tm && notify(d, `team:${tm}`, text, `/matches/${m.id}`));
          notify(d, 'role:host', `Fixture updated: ${text}`, `/matches/${m.id}`);
        }
      });
      return { ok: true, message: 'Fixture updated.' };
    },
    kickOff: (id) => {
      const m0 = db.matches.find((x) => x.id === id);
      if (!m0 || !canRunMatch(user, m0)) return { ok: false, message: 'You can\'t run this match.' };
      if (m0.status !== 'scheduled') return { ok: false, message: m0.status === 'postponed' ? 'This match is postponed.' : 'This match has already started.' };
      const st = kickOffState(m0);
      if (!st.ok) return { ok: false, message: `Kick-off opens 1 hour before the scheduled time (${new Date(st.opensAt).toLocaleString()}).` };
      store.updateMatch(id, { status: 'live', liveMinute: 1 }, 'kick-off');
      return { ok: true, message: 'Kick-off! The match is live.' };
    },
    updateMatch: (id, patch, auditText) => mutate((d) => {
      const m = d.matches.find((x) => x.id === id);
      if (!m || !user) return;
      Object.assign(m, patch);
      if (auditText) audit(d, user.id, 'Match updated', `${matchLabel(d, m)}: ${auditText}`);
      if (patch.status === 'live') notify(d, 'all', `Kick-off! ${matchLabel(d, m)} is live.`, `/matches/${m.id}`);
    }),
    addEvent: (matchId, e) => mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId);
      if (!m) return;
      m.events.push({ ...e, id: uid('e') });
      m.events.sort((a, b) => a.minute - b.minute);
    }),
    removeEvent: (matchId, eventId) => mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId);
      if (m) m.events = m.events.filter((e) => e.id !== eventId);
    }),
    submitResult: (matchId, note) => {
      if (!user) return { ok: false, message: 'Sign in first.' };
      const m0 = db.matches.find((x) => x.id === matchId);
      if (!m0 || !canRunMatch(user, m0)) return { ok: false, message: 'You can\'t run this match.' };
      if (m0.status !== 'live') return { ok: false, message: 'Only a live match can be submitted.' };
      const [h0, a0] = score(m0);
      if (m0.stage !== 'league' && h0 === a0 && !m0.shootoutWinner) {
        return { ok: false, message: 'Knockout matches need a winner. Record who won the penalty shoot-out first.' };
      }
      mutate((d) => {
        const m = d.matches.find((x) => x.id === matchId)!;
        const [h, a] = score(m);
        m.status = 'awaiting_verification';
        d.requests.unshift({ id: uid('r'), type: 'result', status: 'pending', createdBy: user.id, createdAt: new Date().toISOString(), matchId, reason: note || 'Final whistle. Please verify the result.', payload: { homeScore: h, awayScore: a }, recommendations: [] });
        notify(d, 'role:god', `Result submitted for verification: ${matchLabel(d, m)} ${h}–${a}.`, '/dashboard/admin');
        audit(d, user.id, 'Result submitted', `${matchLabel(d, m)} ${h}–${a}`);
      });
      return { ok: true, message: 'Result sent to the God Admin for verification.' };
    },

    saveNews: (n) => {
      if (!has(user, 'publish_news')) return;
      mutate((d) => {
        if (n.id) {
          const ex = d.news.find((x) => x.id === n.id);
          if (ex) Object.assign(ex, n);
          audit(d, user!.id, 'News edited', n.title);
        } else {
          d.news.unshift({ ...n, id: uid('n'), date: new Date().toISOString(), authorId: user!.id });
          audit(d, user!.id, 'News published', n.title);
        }
      });
    },
    deleteNews: (id) => has(user, 'publish_news') && mutate((d) => {
      const n = d.news.find((x) => x.id === id);
      d.news = d.news.filter((x) => x.id !== id);
      audit(d, user!.id, 'News deleted', n?.title ?? id);
    }),
    addHighlight: (h) => has(user, 'manage_highlights') && mutate((d) => {
      d.highlights.unshift({ ...h, id: uid('h'), addedBy: user!.id, views: 0 });
      audit(d, user!.id, 'Highlight added', h.title);
    }),
    deleteHighlight: (id) => has(user, 'manage_highlights') && mutate((d) => {
      const h = d.highlights.find((x) => x.id === id);
      d.highlights = d.highlights.filter((x) => x.id !== id);
      audit(d, user!.id, 'Highlight removed', h?.title ?? id);
    }),
    updateVenue: (id, patch) => has(user, 'manage_venues') && mutate((d) => {
      const v = d.venues.find((x) => x.id === id);
      if (v) { Object.assign(v, patch); audit(d, user!.id, 'Venue updated', v.name); }
    }),
    updateTeam: (id, patch) => has(user, 'manage_teams') && mutate((d) => {
      const t = d.teams.find((x) => x.id === id);
      if (t) { Object.assign(t, patch); audit(d, user!.id, 'Team updated', t.name); }
    }),
    updateSettings: (patch) => user?.role === 'god' && mutate((d) => {
      Object.assign(d.settings, patch);
      audit(d, user.id, 'Settings changed', Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', '));
      if (patch.rosterLocked !== undefined) notify(d, 'role:captain', patch.rosterLocked ? 'Rosters are now locked.' : 'Rosters are open for changes.');
    }),

    vote: (matchId, playerId) => {
      if (!user) return;
      const m = db.matches.find((x) => x.id === matchId);
      if (!m || !motmOpen(m) || user.playerId === playerId) return; // closed, or voting for yourself
      mutate((d) => { d.motmVotes[user.id] = { ...(d.motmVotes[user.id] ?? {}), [matchId]: playerId }; });
    },
    viewHighlight: (id) => mutate((d) => { const h = d.highlights.find((x) => x.id === id); if (h) h.views += 1; }),
    noticesFor: (u) => {
      if (!u) return db.notices.filter((n) => n.to === 'all').slice(0, 10);
      const staffRole = u.role === 'host' || u.role === 'organizer';
      return db.notices.filter((n) =>
        n.to === 'all' || n.to === u.id || n.to === `role:${u.role}` ||
        (staffRole && n.to === 'role:organizer' && u.privileges.includes('review_requests')) ||
        (u.teamId && n.to === `team:${u.teamId}`) ||
        (u.favoriteTeamId && n.to === `team:${u.favoriteTeamId}`),
      ).slice(0, 30);
    },
    markRead: () => {
      if (!user) return;
      const ids = new Set(store.noticesFor(user).map((n) => n.id));
      mutate((d) => d.notices.forEach((n) => { if (ids.has(n.id) && !n.readBy.includes(user.id)) n.readBy.push(user.id); }));
    },
    resetDemo: () => { setDb(createSeed()); },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Lookup helpers bound to the current db. */
export function useLookup() {
  const { db } = useStore();
  return useMemo(() => {
    const teams = new Map(db.teams.map((t) => [t.id, t]));
    const players = new Map(db.players.map((p) => [p.id, p]));
    const venues = new Map(db.venues.map((v) => [v.id, v]));
    const users = new Map(db.users.map((u) => [u.id, u]));
    return {
      team: (id?: string | null) => (id ? teams.get(id) : undefined),
      player: (id?: string) => (id ? players.get(id) : undefined),
      venue: (id?: string) => (id ? venues.get(id) : undefined),
      user: (id?: string) => (id ? users.get(id) : undefined),
    };
  }, [db]);
}
