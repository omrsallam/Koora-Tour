# Koora Tour

The fan and team hub for the Koora Tour. It has scores, the table, top scorers and assists, highlights, news, venues and club pages, plus role-based dashboards. Every sensitive decision goes through a **God Admin**.

It is built for a **local** tournament: eight neighbourhood clubs playing at five local grounds in one city.

The design takes cues from the UCL, LaLiga and Premier League sites and from Nike's large-type layouts. Dark sections use a UCL-style royal-blue background with sweeping light rings. The site sticks to a **three-colour Istanbul palette**, defined in `src/theme.ts` and the `:root` block of `src/styles/app.css`:

| Colour | Represents | Hex |
|---|---|---|
| Bosphorus blue | the Bosphorus and the Blue Mosque | `#0d1f8a` (plus lighter and deeper shades) |
| Iznik turquoise | Iznik tiles | `#1cc4bf` |
| Tulip red | the tulip, the emblem of Istanbul | `#e11d3c` |

White and greys are the only other colours. Club crests are limited to the same palette.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ — deploy to any static host
```

## Roles

| Role | Dashboard | What they can do |
|---|---|---|
| **God Admin** | `/dashboard/admin` | Approve or reject every sensitive request. Assign roles (host, organizer, captain, player, fan), grant granular privileges and venue scopes, suspend users. Edit fixtures directly. Set tournament rules (roster lock, squad limit, reschedule notice). Read the full audit log. |
| **Host / Organizer** | `/dashboard/staff` | Each user sees only what the God Admin has granted: match-day control (run a live match, log goals, cards and subs, record stats, submit the final score for verification), fixture-change proposals, recommendations on captain requests, news, highlights, venues and team info. Hosts can only run matches at the venues assigned to them. |
| **Team Captain** | `/dashboard/captain` | Request a kickoff delay or a time change. Request to add or remove players. Track request status. View the schedule with venue maps and directions. |
| **Player** | `/dashboard/player` | View-only: their scheduled matches with location, call time, directions, a map and calendar (.ics) export, their profile and stats, the squad and team notices. |
| **Fan** | `/my-koora` | Follow a club for a personalised hub, get alerts, and vote for Player of the Match. |

### What requires God Admin approval
- Captain requests to reschedule (delay or time change). These need a minimum notice period, and organizers can add support or oppose recommendations.
- Captain requests to add or remove a player. These respect the roster lock and the squad size limit, and reject shirt-number clashes.
- Organizer fixture changes (kickoff or venue).
- Final results submitted by hosts. A result only counts in the table and stats after the God Admin verifies it. A rejected result sends the match back to live for correction.

## Prototype notes
- **No backend yet.** All data lives in `localStorage`. Open two tabs to watch a captain's request show up for the God Admin. Sign-in is a demo account picker. Production needs real authentication and a server or database that enforces the same permission checks found in `src/store/store.tsx`.
- The season is seeded deterministically. Matchdays are placed relative to the first visit, so the "next match" is always upcoming. The God Admin can reset it under *Tournament rules*.
- Highlights play an animated recap unless an organizer attaches a YouTube link.

## Structure
```
src/
  types.ts              data model
  data/seed.ts          seeded season (teams, players, venues, fixtures, events)
  data/derive.ts        standings, leaders, team stats (derived from match events)
  store/store.tsx       state, permissions and approval workflow
  components/           layout, search, shared UI (crests, kits, match cards…)
  pages/                public hub pages
  pages/dashboards/     God Admin, Host/Organizer, Captain, Player dashboards
```
