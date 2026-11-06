export type Role = 'god' | 'host' | 'organizer' | 'captain' | 'player' | 'fan';

/** Granular privileges that the God Admin can grant to hosts and organizers. */
export type Privilege =
  | 'manage_fixtures'
  | 'enter_results'
  | 'manage_venues'
  | 'publish_news'
  | 'manage_highlights'
  | 'review_requests'
  | 'manage_teams';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  privileges: Privilege[];
  teamId?: string;
  playerId?: string;
  /** Venues a host is responsible for on match day. */
  venueIds?: string[];
  favoriteTeamId?: string;
  createdAt: string;
  suspended?: boolean;
}

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: Position;
  nationality: string;
  age: number;
  height: number;
  foot: 'Left' | 'Right' | 'Both';
  active: boolean;
  joinedAt: string;
  /** Set when the player is deregistered; appearances after this date don't count. */
  removedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  short: string;
  city: string;
  colors: [string, string];
  founded: number;
  coach: string;
  homeVenueId: string;
  bio: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  surface: string;
  parking: string;
  transit: string;
}

export type EventType = 'goal' | 'penalty' | 'own_goal' | 'yellow' | 'red' | 'sub';

export interface MatchEvent {
  id: string;
  minute: number;
  type: EventType;
  /** Team of the player involved (for own goals: the player's team, goal is credited to the opponent). */
  teamId: string;
  playerId: string;
  assistId?: string;
  /** For substitutions: the player coming off. */
  playerOutId?: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'awaiting_verification' | 'finished' | 'postponed';

export interface MatchStats {
  possession: [number, number];
  shots: [number, number];
  onTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  passes: [number, number];
}

export type Stage = 'league' | 'semi' | 'final';

export interface Match {
  id: string;
  stage: Stage;
  round: number;
  homeId: string | null;
  awayId: string | null;
  /** Placeholder labels for knockout slots, e.g. "1st place". */
  homeLabel?: string;
  awayLabel?: string;
  kickoff: string;
  venueId: string;
  status: MatchStatus;
  events: MatchEvent[];
  stats?: MatchStats;
  referee: string;
  attendance?: number;
  /** Minute shown while live. */
  liveMinute?: number;
  /** Knockouts only: the team that won a penalty shoot-out after a draw. */
  shootoutWinner?: string;
}

export type RequestType =
  | 'reschedule'
  | 'add_player'
  | 'remove_player'
  | 'result'
  | 'fixture_change';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Recommendation {
  userId: string;
  verdict: 'support' | 'oppose';
  note: string;
  at: string;
}

export interface ApprovalRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  createdBy: string;
  createdAt: string;
  teamId?: string;
  matchId?: string;
  reason: string;
  payload: {
    kind?: 'delay' | 'time_change';
    proposedKickoff?: string;
    /** Snapshot of the fixture when the request was made, so history shows the original values. */
    originalKickoff?: string;
    originalVenueId?: string;
    proposedVenueId?: string;
    player?: Omit<Player, 'id' | 'active' | 'joinedAt' | 'teamId'>;
    playerId?: string;
    homeScore?: number;
    awayScore?: number;
  };
  recommendations: Recommendation[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: 'Report' | 'Preview' | 'Feature' | 'Announcement' | 'Interview';
  date: string;
  teamIds: string[];
  authorId: string;
}

export interface Highlight {
  id: string;
  title: string;
  matchId?: string;
  kind: 'Goals' | 'Extended' | 'Saves' | 'Interview' | 'Skills';
  duration: string;
  date: string;
  views: number;
  /** Optional YouTube id; when absent the player shows an animated match recap. */
  youtubeId?: string;
  addedBy: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  detail: string;
}

export interface Notice {
  id: string;
  /** Target: a user id, a role prefixed with "role:", a team prefixed with "team:", or "all". */
  to: string;
  text: string;
  at: string;
  link?: string;
  readBy: string[];
}

export interface Settings {
  tournamentName: string;
  season: string;
  rosterLocked: boolean;
  maxSquadSize: number;
  minRescheduleNoticeHours: number;
}

export interface DB {
  version: number;
  settings: Settings;
  users: User[];
  teams: Team[];
  players: Player[];
  venues: Venue[];
  matches: Match[];
  requests: ApprovalRequest[];
  news: NewsItem[];
  highlights: Highlight[];
  audit: AuditEntry[];
  notices: Notice[];
  /** userId -> matchId -> playerId voted for Player of the Match. */
  motmVotes: Record<string, Record<string, string>>;
}
