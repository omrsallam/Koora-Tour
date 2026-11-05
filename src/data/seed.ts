import { C } from '../theme';
import type {
  DB, Team, Venue, Player, Match, MatchEvent, User, NewsItem, Highlight, Position, Privilege, ApprovalRequest, Notice,
} from '../types';

export const DB_VERSION = 4;

/** Deterministic PRNG so the seeded season is identical for every visitor. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ALL_PRIVILEGES: { id: Privilege; label: string; hint: string }[] = [
  { id: 'manage_fixtures', label: 'Manage fixtures', hint: 'Propose kickoff and venue changes (sent to God Admin)' },
  { id: 'enter_results', label: 'Match-day control', hint: 'Run live matches, log events and submit final scores' },
  { id: 'manage_venues', label: 'Manage venues', hint: 'Edit venue details, parking and transit info' },
  { id: 'publish_news', label: 'Publish news', hint: 'Write and publish articles to the hub' },
  { id: 'manage_highlights', label: 'Manage highlights', hint: 'Upload and remove highlight videos' },
  { id: 'review_requests', label: 'Review requests', hint: 'Add recommendations to captain requests before God Admin decides' },
  { id: 'manage_teams', label: 'Manage team info', hint: 'Edit team bios, coaches and colours' },
];

export const ROLE_PRESETS: Record<'host' | 'organizer', Privilege[]> = {
  host: ['enter_results', 'manage_venues'],
  organizer: ['manage_fixtures', 'publish_news', 'manage_highlights', 'review_requests'],
};

const venues: Venue[] = [
  { id: 'v-central', name: 'Central Stadium', city: 'Old Town', address: '1 Stadium Road, Old Town', capacity: 4500, surface: 'Natural grass', parking: 'Municipal car park behind the main stand', transit: 'Bus 12, 15 · Stadium Road stop' },
  { id: 'v-harbour', name: 'Harbour Ground', city: 'Harbour', address: '14 Quay Street, Harbour', capacity: 2200, surface: 'Natural grass', parking: 'Quayside parking (paid on weekdays)', transit: 'Ferry pier · 5 min walk' },
  { id: 'v-hillside', name: 'Hillside Sports Complex', city: 'Hillside', address: '230 Ridge Lane, Hillside', capacity: 1500, surface: 'Artificial turf (4G)', parking: 'Free parking at the complex', transit: 'Bus 44 · Sports Complex stop' },
  { id: 'v-riverside', name: 'Riverside Park Pitch', city: 'Riverside', address: 'Riverside Park, Bridge Road', capacity: 1200, surface: 'Natural grass', parking: 'Street parking on Bridge Road', transit: 'Tram T1 · Riverside Park' },
  { id: 'v-north', name: 'Northgate Arena', city: 'Northgate', address: '7 Gate Avenue, Northgate', capacity: 3000, surface: 'Hybrid grass', parking: 'North and west lots, 400 spaces', transit: 'Metro M1 · Northgate' },
];

const teams: Team[] = [
  { id: 't-old', name: 'Old Town FC', short: 'OLD', city: 'Old Town', colors: [C.red, C.white], founded: 2009, coach: 'Selim Aydın', homeVenueId: 'v-central', bio: 'The reigning champions from the historic centre. Old Town fill Central Stadium every match day with a wall of red.' },
  { id: 't-harbour', name: 'Harbour United', short: 'HAR', city: 'Harbour', colors: [C.blue2, C.white], founded: 2011, coach: 'Youssef Benali', homeVenueId: 'v-harbour', bio: 'Fishermen, dock workers and their kids — Harbour press high and never stop running.' },
  { id: 't-hillside', name: 'Hillside Athletic', short: 'HIL', city: 'Hillside', colors: [C.turq, C.blueDeep], founded: 2014, coach: 'Elena Petrova', homeVenueId: 'v-hillside', bio: 'A passing side built on the 4G pitch of the Hillside complex — patient, precise and dangerous on the break.' },
  { id: 't-riverside', name: 'Riverside FC', short: 'RIV', city: 'Riverside', colors: [C.white, C.turq], founded: 2016, coach: 'Karim Haddad', homeVenueId: 'v-riverside', bio: 'The neighbourhood academy club. Half the squad grew up kicking a ball in Riverside Park.' },
  { id: 't-north', name: 'Northgate Rovers', short: 'NOR', city: 'Northgate', colors: [C.blueDeep, C.red], founded: 2012, coach: 'Marco Ruiz', homeVenueId: 'v-north', bio: 'Ambitious and well organised, Northgate have built the strongest squad outside the old town.' },
  { id: 't-market', name: 'Market Street SC', short: 'MKT', city: 'Old Town', colors: [C.turqDeep, C.white], founded: 2010, coach: 'Hassan Farouk', homeVenueId: 'v-central', bio: 'Shop owners and market traders. They share Central Stadium with Old Town — and the fiercest derby of the tour.' },
  { id: 't-lighthouse', name: 'Lighthouse FC', short: 'LGH', city: 'Harbour', colors: [C.redDeep, C.turq], founded: 2018, coach: 'Amina Diallo', homeVenueId: 'v-harbour', bio: 'The newest club on the tour. Quick wingers, fearless full-backs and the loudest supporters on the coast road.' },
  { id: 't-garden', name: 'Garden District', short: 'GDN', city: 'Northgate', colors: [C.white, C.red], founded: 2008, coach: 'Can Demir', homeVenueId: 'v-north', bio: 'Founders of the tour. Garden District carry its history — and a famous red sash.' },
];

const FIRST = ['Omar', 'Emre', 'Luca', 'Yusuf', 'Karim', 'Mateo', 'Adam', 'Ali', 'Hakan', 'Rami', 'Diego', 'Noah', 'Sami', 'Kerem', 'Ilyas', 'Malik', 'Tariq', 'Jonas', 'Arda', 'Bilal', 'Nico', 'Zaid', 'Leo', 'Mert', 'Hamza', 'Theo', 'Idris', 'Kenan', 'Faris', 'Rayan', 'Samuel', 'Burak', 'Ayoub', 'Marco', 'Anas', 'Yassin'];
const LAST = ['Khalid', 'Yılmaz', 'Rossi', 'Haddad', 'Mansour', 'Silva', 'Demir', 'Nasser', 'Kaya', 'Fernández', 'Saleh', 'Öztürk', 'Benali', 'Moreau', 'Aziz', 'Çelik', 'Hassan', 'Costa', 'Rahman', 'Arslan', 'Diallo', 'Jaber', 'Novak', 'Şahin', 'El Amrani', 'Koç', 'Ibrahim', 'Torres', 'Farouk', 'Aksoy', 'Bakr', 'Laurent', 'Toprak', 'Zidan', 'Varga', 'Hamdi'];
const NATIONS = ['Egypt', 'Türkiye', 'Morocco', 'Spain', 'Italy', 'Jordan', 'Lebanon', 'France', 'Brazil', 'Senegal', 'Saudi Arabia', 'Portugal', 'Tunisia', 'Algeria'];
const SQUAD: Position[] = ['GK', 'GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW', 'FW'];
const REFEREES = ['A. Kaplan', 'M. Saad', 'J. Ortega', 'R. Haddad', 'S. Morelli', 'T. Yıldız'];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function buildPlayers(rng: () => number, seasonStart: Date): Player[] {
  const players: Player[] = [];
  const used = new Set<string>();
  teams.forEach((team) => {
    const numbers = new Set<number>();
    SQUAD.forEach((position, i) => {
      let name = '';
      do { name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`; } while (used.has(name));
      used.add(name);
      let number = position === 'GK' ? (i === 0 ? 1 : 12 + Math.floor(rng() * 10)) : 2 + Math.floor(rng() * 28);
      while (numbers.has(number)) number++;
      numbers.add(number);
      players.push({
        id: `p-${team.short.toLowerCase()}-${i + 1}`,
        teamId: team.id,
        name,
        number,
        position,
        nationality: pick(rng, NATIONS),
        age: 18 + Math.floor(rng() * 17),
        height: position === 'GK' ? 185 + Math.floor(rng() * 10) : 168 + Math.floor(rng() * 22),
        foot: rng() < 0.7 ? 'Right' : rng() < 0.85 ? 'Left' : 'Both',
        active: true,
        joinedAt: new Date(seasonStart.getTime() - 60 * 864e5).toISOString(),
      });
    });
  });
  return players;
}

/** Circle-method round robin: 8 teams → 7 rounds of 4 matches. */
function roundRobin(ids: string[]): [string, string][][] {
  const arr = [...ids];
  const rounds: [string, string][][] = [];
  for (let r = 0; r < arr.length - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    arr.splice(1, 0, arr.pop()!);
  }
  return rounds;
}

function generateEvents(rng: () => number, m: Match, players: Player[]): { events: MatchEvent[]; stats: Match['stats'] } {
  const events: MatchEvent[] = [];
  let n = 0;
  const eid = () => `${m.id}-e${++n}`;
  const goalsFor = (strength: number) => {
    const r = rng() * strength;
    return r < 0.25 ? 0 : r < 0.55 ? 1 : r < 0.8 ? 2 : r < 0.93 ? 3 : 4;
  };
  const sides = [m.homeId!, m.awayId!];
  const strength: Record<string, number> = { 't-old': 1.15, 't-north': 1.1, 't-harbour': 1.0, 't-hillside': 1.0, 't-garden': 0.95, 't-market': 0.9, 't-riverside': 0.9, 't-lighthouse': 0.85 };
  sides.forEach((teamId, idx) => {
    const squad = players.filter((p) => p.teamId === teamId);
    const weighted: Player[] = [];
    squad.forEach((p) => {
      const w = p.position === 'FW' ? 6 : p.position === 'MF' ? 3 : p.position === 'DF' ? 1 : 0;
      for (let k = 0; k < w; k++) weighted.push(p);
    });
    const goals = goalsFor((strength[teamId] ?? 1) * (idx === 0 ? 1.08 : 1));
    for (let g = 0; g < goals; g++) {
      const scorer = pick(rng, weighted);
      const roll = rng();
      if (roll < 0.06) {
        const opp = players.filter((p) => p.teamId === sides[1 - idx] && p.position === 'DF');
        events.push({ id: eid(), minute: 1 + Math.floor(rng() * 90), type: 'own_goal', teamId: sides[1 - idx], playerId: pick(rng, opp).id });
        continue;
      }
      const isPen = roll < 0.16;
      let assistId: string | undefined;
      if (!isPen && rng() < 0.75) {
        const options = squad.filter((p) => p.id !== scorer.id && p.position !== 'GK');
        assistId = pick(rng, options).id;
      }
      events.push({ id: eid(), minute: 1 + Math.floor(rng() * 90), type: isPen ? 'penalty' : 'goal', teamId, playerId: scorer.id, assistId });
    }
    const yellows = Math.floor(rng() * 4);
    for (let y = 0; y < yellows; y++) {
      events.push({ id: eid(), minute: 10 + Math.floor(rng() * 80), type: 'yellow', teamId, playerId: pick(rng, squad.filter((p) => p.position !== 'GK')).id });
    }
    if (rng() < 0.07) {
      events.push({ id: eid(), minute: 30 + Math.floor(rng() * 60), type: 'red', teamId, playerId: pick(rng, squad.filter((p) => p.position === 'DF' || p.position === 'MF')).id });
    }
  });
  events.sort((a, b) => a.minute - b.minute);
  const poss = 38 + Math.floor(rng() * 25);
  const sh: [number, number] = [6 + Math.floor(rng() * 14), 5 + Math.floor(rng() * 12)];
  const stats = {
    possession: [poss, 100 - poss] as [number, number],
    shots: sh,
    onTarget: [Math.max(1, Math.floor(sh[0] * (0.3 + rng() * 0.25))), Math.max(1, Math.floor(sh[1] * (0.3 + rng() * 0.25)))] as [number, number],
    corners: [Math.floor(rng() * 10), Math.floor(rng() * 9)] as [number, number],
    fouls: [6 + Math.floor(rng() * 10), 6 + Math.floor(rng() * 10)] as [number, number],
    passes: [Math.round(poss * 9 + rng() * 80), Math.round((100 - poss) * 9 + rng() * 80)] as [number, number],
  };
  return { events, stats };
}

/** Next Saturday that is at least 2 days away — keeps the demo season "current" whenever it is first opened. */
function nextMatchday(now: Date): Date {
  const d = new Date(now);
  d.setHours(18, 0, 0, 0);
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  if (d.getTime() - now.getTime() < 2 * 864e5) d.setDate(d.getDate() + 7);
  return d;
}

export function createSeed(now = new Date()): DB {
  const rng = mulberry32(20261105);
  const round6 = nextMatchday(now);
  const roundDate = (round: number) => new Date(round6.getTime() + (round - 6) * 7 * 864e5);
  const seasonStart = roundDate(1);
  const players = buildPlayers(rng, seasonStart);
  const rounds = roundRobin(teams.map((t) => t.id));
  const matches: Match[] = [];
  const slots = [15, 17, 19, 21];

  rounds.forEach((pairs, r) => {
    const round = r + 1;
    pairs.forEach(([homeId, awayId], i) => {
      const d = roundDate(round);
      if (i >= 2) d.setDate(d.getDate() + 1); // two matches Saturday, two Sunday
      d.setHours(slots[i], 0, 0, 0);
      const home = teams.find((t) => t.id === homeId)!;
      const m: Match = {
        id: `m-${round}-${i + 1}`,
        stage: 'league',
        round,
        homeId,
        awayId,
        kickoff: d.toISOString(),
        venueId: home.homeVenueId,
        status: round <= 5 ? 'finished' : 'scheduled',
        events: [],
        referee: pick(rng, REFEREES),
      };
      if (round <= 5) {
        const { events, stats } = generateEvents(rng, m, players);
        m.events = events;
        m.stats = stats;
        const cap = venues.find((v) => v.id === m.venueId)!.capacity;
        m.attendance = Math.round(cap * (0.62 + rng() * 0.36));
      }
      matches.push(m);
    });
  });

  // Final Four — semi-finals and the final at Central Stadium.
  const sf = roundDate(8);
  const sf1 = new Date(sf); sf1.setHours(18, 0, 0, 0);
  const sf2 = new Date(sf); sf2.setDate(sf2.getDate() + 1); sf2.setHours(18, 0, 0, 0);
  const fin = roundDate(9); fin.setHours(20, 0, 0, 0);
  matches.push(
    { id: 'm-sf-1', stage: 'semi', round: 8, homeId: null, awayId: null, homeLabel: '1st place', awayLabel: '4th place', kickoff: sf1.toISOString(), venueId: 'v-north', status: 'scheduled', events: [], referee: 'A. Kaplan' },
    { id: 'm-sf-2', stage: 'semi', round: 8, homeId: null, awayId: null, homeLabel: '2nd place', awayLabel: '3rd place', kickoff: sf2.toISOString(), venueId: 'v-harbour', status: 'scheduled', events: [], referee: 'J. Ortega' },
    { id: 'm-final', stage: 'final', round: 9, homeId: null, awayId: null, homeLabel: 'Winner SF1', awayLabel: 'Winner SF2', kickoff: fin.toISOString(), venueId: 'v-central', status: 'scheduled', events: [], referee: 'M. Saad' },
  );

  const created = new Date(seasonStart.getTime() - 30 * 864e5).toISOString();
  const cap = (teamId: string, idx: number) => players.filter((p) => p.teamId === teamId)[idx];
  const users: User[] = [
    { id: 'u-god', name: 'Omar Khalid', email: 'admin@kooratour.com', role: 'god', privileges: [], createdAt: created },
    { id: 'u-host1', name: 'Leyla Arslan', email: 'leyla@kooratour.com', role: 'host', privileges: [...ROLE_PRESETS.host], venueIds: ['v-central', 'v-north'], createdAt: created },
    { id: 'u-host2', name: 'Daniel Costa', email: 'daniel@kooratour.com', role: 'host', privileges: ['enter_results'], venueIds: ['v-harbour', 'v-hillside', 'v-riverside'], createdAt: created },
    { id: 'u-org1', name: 'Nour Hamdi', email: 'nour@kooratour.com', role: 'organizer', privileges: [...ROLE_PRESETS.organizer, 'manage_teams'], createdAt: created },
    { id: 'u-org2', name: 'Bora Kaya', email: 'bora@kooratour.com', role: 'organizer', privileges: ['publish_news', 'manage_highlights'], createdAt: created },
  ];
  teams.forEach((t) => {
    const p = cap(t.id, 13);
    users.push({ id: `u-cap-${t.short.toLowerCase()}`, name: p.name, email: `captain.${t.short.toLowerCase()}@kooratour.com`, role: 'captain', privileges: [], teamId: t.id, playerId: p.id, createdAt: created });
  });
  teams.forEach((t) => {
    const p = cap(t.id, 7);
    users.push({ id: `u-pl-${t.short.toLowerCase()}`, name: p.name, email: `${p.name.split(' ')[0].toLowerCase()}.${t.short.toLowerCase()}@kooratour.com`, role: 'player', privileges: [], teamId: t.id, playerId: p.id, createdAt: created });
  });
  users.push({ id: 'u-fan', name: 'Sara Fan', email: 'sara@fans.com', role: 'fan', privileges: [], favoriteTeamId: 't-hillside', createdAt: created });

  const day = (offset: number) => new Date(now.getTime() - offset * 864e5).toISOString();
  const lastRound = matches.filter((m) => m.round === 5);
  const news: NewsItem[] = [
    { id: 'n-1', title: 'Matchday 6 preview: the title race tightens', summary: 'Four fixtures, a city derby, and a top-of-the-table clash that could decide who hosts the semi-final.', body: 'With two league rounds left before the Final Four, every point counts. Old Town FC and Northgate Rovers are separated by the slimmest of margins, while Garden District and Hillside Athletic are fighting for the last semi-final spot.\n\nOur hosts confirm all five grounds are ready. Entry is free for under-12s at every venue this weekend.', category: 'Preview', date: day(1), teamIds: ['t-old', 't-north'], authorId: 'u-org1' },
    { id: 'n-2', title: `Matchday 5 report: ${lastRound.length} matches, plenty of drama`, summary: 'Late winners, a red card and a goalkeeper masterclass — here is everything you missed.', body: 'Matchday 5 delivered again. Full scores, scorers and stats are in the Matches section, and every goal is in the Highlights hub.\n\nThe Player of the Match vote stays open after the final whistle — make your pick on each match page.', category: 'Report', date: day(5), teamIds: [], authorId: 'u-org1' },
    { id: 'n-3', title: 'Final Four venues confirmed', summary: 'Northgate Arena and Harbour Ground host the semi-finals; Central Stadium stages the Final.', body: 'The God Admin has approved the knockout venues. 1st place faces 4th at Northgate Arena, while 2nd meets 3rd at Harbour Ground the following evening. The Final is under the lights at Central Stadium in the old town.', category: 'Announcement', date: day(9), teamIds: [], authorId: 'u-god' },
    { id: 'n-4', title: 'Riverside FC: the park club that keeps producing', summary: 'Half the Riverside squad grew up on the same park pitch. We spent an evening at training.', body: 'At Riverside Park the philosophy is simple: trust the neighbourhood. Coach Karim Haddad explains how the club finds players on its own streets — and why other clubs on the tour are now copying the model.', category: 'Feature', date: day(12), teamIds: ['t-riverside'], authorId: 'u-org2' },
    { id: 'n-5', title: '"We play for the district" — Garden District captain on founding the tour', summary: 'The captain talks community, pressure, and the famous red sash.', body: 'Garden District were there when the tour kicked off, and their captain feels it every week. "When you put on the sash you represent your street, your family, your neighbours," he told us before training.', category: 'Interview', date: day(16), teamIds: ['t-garden'], authorId: 'u-org2' },
  ];

  const finished = matches.filter((m) => m.status === 'finished').slice(-8).reverse();
  const highlights: Highlight[] = finished.flatMap((m, i) => {
    const h = teams.find((t) => t.id === m.homeId)!;
    const a = teams.find((t) => t.id === m.awayId)!;
    const list: Highlight[] = [
      { id: `h-${m.id}`, title: `${h.name} vs ${a.name} | Highlights`, matchId: m.id, kind: 'Goals', duration: `${3 + (i % 4)}:${String(10 + i * 7).slice(-2)}`, date: m.kickoff, views: 18000 + Math.round(rng() * 120000), addedBy: 'u-org2' },
    ];
    if (i % 3 === 0) list.push({ id: `hx-${m.id}`, title: `Extended: ${h.short} ${a.short} — every chance`, matchId: m.id, kind: 'Extended', duration: `${9 + (i % 3)}:4${i % 10}`, date: m.kickoff, views: 6000 + Math.round(rng() * 30000), addedBy: 'u-org2' });
    return list;
  });
  highlights.push({ id: 'h-saves', title: 'Top 10 saves of the league phase so far', kind: 'Saves', duration: '6:12', date: day(3), views: 88231, addedBy: 'u-org2' });
  highlights.push({ id: 'h-skills', title: 'Skills & nutmegs: Matchday 1–5', kind: 'Skills', duration: '4:48', date: day(2), views: 64010, addedBy: 'u-org2' });

  const r6 = matches.filter((m) => m.round === 6);
  const requests: ApprovalRequest[] = [
    {
      id: 'r-seed-1', type: 'reschedule', status: 'pending', createdBy: `u-cap-${teams.find((t) => t.id === r6[1].homeId)!.short.toLowerCase()}`,
      createdAt: day(1), teamId: r6[1].homeId!, matchId: r6[1].id,
      reason: 'Several of our players work Saturday shifts until 16:00. Requesting a 2-hour delay so the full squad can make kickoff.',
      payload: { kind: 'delay', originalKickoff: r6[1].kickoff, originalVenueId: r6[1].venueId, proposedKickoff: new Date(new Date(r6[1].kickoff).getTime() + 2 * 36e5).toISOString() },
      recommendations: [{ userId: 'u-org1', verdict: 'support', note: 'Venue is free until 23:00. No broadcast clash.', at: day(0.5) }],
    },
    {
      id: 'r-seed-2', type: 'add_player', status: 'pending', createdBy: 'u-cap-lgh', createdAt: day(2), teamId: 't-lighthouse',
      reason: 'Replacement for our injured left-back (long-term knee injury). Ziad lives in Harbour and trains with us.',
      payload: { player: { name: 'Ziad Mourad', number: 33, position: 'DF', nationality: 'Egypt', age: 22, height: 178, foot: 'Left' } },
      recommendations: [],
    },
  ];

  const notices: Notice[] = [
    { id: 'no-1', to: 'all', text: 'Final Four venues confirmed — Central Stadium hosts the Final.', at: day(9), link: '/news/n-3', readBy: [] },
    { id: 'no-2', to: 'role:god', text: '2 requests are waiting for your decision.', at: day(1), link: '/dashboard/admin', readBy: [] },
  ];

  return {
    version: DB_VERSION,
    settings: { tournamentName: 'Koora Tour', season: `${seasonStart.getFullYear()}/${String(seasonStart.getFullYear() + 1).slice(-2)}`, rosterLocked: false, maxSquadSize: 20, minRescheduleNoticeHours: 48 },
    users, teams, players, venues, matches, requests, news, highlights,
    audit: [
      { id: 'a-1', at: created, actorId: 'u-god', action: 'Season created', detail: 'League phase: 8 teams, 7 rounds. Final Four format.' },
      { id: 'a-2', at: created, actorId: 'u-god', action: 'Roles assigned', detail: 'Hosts: Leyla Arslan, Daniel Costa. Organizers: Nour Hamdi, Bora Kaya.' },
    ],
    notices,
    motmVotes: {},
  };
}
