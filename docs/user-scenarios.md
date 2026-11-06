# Koora Tour — User Scenarios

Every scenario a person can run into on the site, grouped by role. Each one says **what the person does**, **what happens**, and **who else is affected**. Error and edge cases are listed with the exact message the site shows.

At the end, [Scenarios not supported yet](#scenarios-not-supported-yet) lists situations that would come up in a real tournament but that the site can't handle today.

**Roles at a glance**

| Role | Lands on | Can change things? |
|---|---|---|
| Guest (not signed in) | Landing page | No, browse only |
| Fan | My Koora | Only their own preferences (followed club, votes) |
| Player | Player dashboard | No, view only (same profile view as fans) |
| Team Captain | Captain dashboard | Requests only; the God Admin approves them |
| Host / Organizer | Staff dashboard | Only what the God Admin granted; sensitive changes need approval |
| God Admin | Admin dashboard | Everything; final say on every sensitive decision |

**What counts as "sensitive" (needs God Admin approval):** match reschedules, adding or removing players, fixture changes (kickoff time or venue), and final results.

---

## 1. Guest (not signed in)

| # | Scenario | What happens |
|---|---|---|
| G1 | Opens the site | Landing page: hero with the next-match countdown, the results circles (feature circles plus the last three matchdays), featured video, headlines, latest results, upcoming fixtures, table, top scorers and assists, highlights, Final Four bracket, news. |
| G2 | Browses matches | Fixtures and results by matchday (MD1–MD11, Semis, Final), or a full season for one club. |
| G3 | Opens a match | Match centre with these tabs: **Overview** (timeline of goals, cards and subs; form guide; previous meeting), **Stats** (possession, shots and more), **Squads**, **Venue & travel** (address, transport, parking, gate times, map, directions). |
| G4 | Adds a match to their calendar | Downloads an .ics file for that match (scheduled matches only). |
| G5 | Checks the table | League table with form; top four marked for the Final Four; projected bracket. |
| G6 | Checks stats | Leaders (goals, assists, goals + assists, clean sheets, yellow and red cards), all-player table with filters, club stats. |
| G7 | Browses clubs and players | Club page (overview, squad, fixtures, stats) and player profile (stats and match log). |
| G8 | Watches highlights | Plays the YouTube video, or an animated goal recap if no video was attached. Can filter by type and club. |
| G9 | Reads news | Articles by category; tagged clubs link to club pages. |
| G10 | Plans a trip to a venue | Venues page: map, address, transport, parking, upcoming matches at each ground. |
| G11 | Searches | Search (icon or the `/` key) finds clubs, players and venues. |
| G12 | Tries to vote for Player of the Match | Sees a "Sign in to vote" prompt. |
| G13 | Tries to follow a club | "Follow club" takes them to the sign-in page. |
| G14 | Opens a dashboard address directly | Sent to the sign-in page. |
| G15 | Opens a page that doesn't exist | "Page not found." |
| G16 | Kickoff time passes but the match wasn't started | The match shows **Awaiting result** (fixtures, match cards, match page) and drops out of "Next up"; the countdown is replaced by "Kick-off time". |

## 2. Fan

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| F1 | Creates a fan account | Enters name and email, optionally picks a favourite club. Signed in and taken to My Koora. If the email is invalid or already used: "Enter a valid email address." / "An account with this email already exists." | Appears in the God Admin's user list as a Fan. |
| F2 | Signs in with an existing account | Picks their account and lands on My Koora. | — |
| F3 | Uses My Koora | Sees their club's position, points, form, upcoming matches, recent results, news about their club first, and how many Player of the Match votes they've cast. | — |
| F4 | Follows or unfollows a club | From the club page or the My Koora dropdown. The table highlights their club, and the landing page shows a "Your club" card. | — |
| F5 | Follows no club | My Koora prompts them to pick one; the landing page shows the "Follow your club" crest row. | — |
| F6 | Votes for Player of the Match | On a finished match, picks a player; vote shares show as percentages. Voting stays open for **72 hours after kickoff**, then shows "Voting closed" with the final result. | Vote shares change for everyone. |
| F7 | Changes their vote | Picks a different player; only the latest vote counts. | — |
| F8 | Gets notifications | Bell shows tournament-wide alerts (kick-offs, full-time results, announcements) and alerts for the club they follow (for example, new kickoff times). | — |
| F9 | Does everything a guest can | G1–G11. | — |
| F10 | Gets promoted by the God Admin | Their role changes (for example to Organizer); a notification explains the change; their dashboard link changes. | — |
| F11 | Is suspended | Signing in is blocked (suspended accounts are hidden from sign-in); open dashboards show "Your account is suspended." | — |

## 3. Player (view only)

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| P1 | Checks their schedule | **My matches:** next-match countdown, every upcoming match with home/away, kickoff, **call time (2 hours before)**, venue, address, transport and parking. | — |
| P2 | Gets to a venue | "Directions" opens maps; "Show map" shows the map inline. | — |
| P3 | Adds all matches to their calendar | "Add all to calendar" downloads an .ics with every upcoming match, including call time and travel info. | — |
| P4 | Views their own profile | **My profile:** their details and stats (goals, assists, matches, cards). View only, the same as fans see it. | — |
| P5 | Wants to correct their details | They are told to ask their captain; changes go through the God Admin (no in-app request yet, see gaps). | Captain. |
| P6 | Views their team | **My team:** squad list with the captain marked and season stats. | — |
| P7 | Reads team notices | **Team notices:** new kickoff times, players joining, access changes. | — |
| P8 | Match is rescheduled | Notification and updated schedule as soon as the God Admin approves. | — |
| P9 | Is removed from the squad | After God Admin approval their account becomes a **Fan** account, and their public profile shows "No longer registered" (stats kept). | — |
| P10 | Account has no team linked | "You are not registered with a team", with a link to My Koora. | — |
| P11 | Does everything a fan can | F3–F8 (voting, following, browsing). A player **can't vote for themselves** — their own name is disabled. | — |

## 4. Team Captain

**Rescheduling a match**

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| C1 | Requests a **delay** | Schedule & venues → "Request delay / time change" → Delay kickoff (30 minutes to 4 hours) → reason. Sees the old time crossed out and the new time. Gets "Request sent to the God Admin for approval." | God Admin is notified; organizers who review requests are notified. |
| C2 | Requests a **date/time change** | Same flow, but picks a new date and time. | Same as C1. |
| C3 | Requests too close to kickoff | The form warns that requests need at least *N* hours' notice (set by the God Admin) and the send button is disabled. If it gets through anyway: "Requests must be made at least *N*h before kickoff." | — |
| C3b | Proposed time clashes or is in the past | The form shows the problem and the send button is disabled, e.g. "Clash: Central Stadium already hosts OLD v HAR at Sat 21 Nov, 14:00.", "… would also be playing …", or "The new kickoff time is in the past." | — |
| C4 | Requests a second change for the same match | The button is hidden while one is pending ("Change requested" badge). Message if attempted: "There is already a pending reschedule request for this match." | — |
| C5 | Organizer supports or opposes the request | Captain sees the recommendation on the request card. | — |
| C6 | Request **approved** | Kickoff updates everywhere. Captain is notified ("…was approved"). | Both teams' players and followers are told the new kickoff; hosts are told the fixture changed. |
| C7 | Request **rejected** | Kickoff unchanged; captain is notified with the God Admin's note. | — |
| C8 | Withdraws a pending request | My requests → "Withdraw request". Status becomes cancelled. | Logged in the audit log. |

**Managing the squad**

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| C9 | Requests to **add a player** | Squad → "Request new player" → name, shirt number (first free number pre-filled), position, nationality, age, height, foot, reason. | God Admin is notified. |
| C10 | Picks a shirt number that's taken | Inline warning and the send button is disabled; message if attempted: "Shirt #N is already taken." | — |
| C11 | Squad is full | "Squad limit is N players (including pending additions)." | — |
| C12 | Requests to **remove a player** | Squad → "Request removal" → reason. Row shows "Removal pending". | God Admin is notified. |
| C13 | Requests removal of the same player twice | "A removal request for this player is already pending." | — |
| C14 | Tries to remove themselves | Not offered (their row shows "You"). | — |
| C15 | Rosters are **locked** | Banner "Rosters are locked"; add/remove buttons are disabled. Message if attempted: "Rosters are locked by the God Admin. No squad changes are accepted right now." Schedule requests still work. | — |
| C16 | Add approved | Player joins the squad and appears on the club page, in stats and in search. | Team is notified "…has joined the squad." |
| C17 | Add approved, but the shirt number was taken in the meantime | God Admin sees "Shirt #N has since been taken — reject or ask the captain to resubmit." | — |
| C18 | Removal approved | Player is deregistered (stats kept). If the player had an account, it becomes a Fan account. | Captain is notified. |
| C19 | Any request rejected | Notified with the God Admin's note. | — |

**Everyday use**

| # | Scenario | What happens |
|---|---|---|
| C20 | Checks the team hub | Overview: next-match countdown, position, points, goal difference, squad size versus limit, pending requests, recent results. |
| C21 | Views schedule and venues | Same as a player's view (call times, directions, maps, calendar export), plus the reschedule button. |
| C22 | Tracks requests | My requests: every reschedule, add and remove request with its status, organizer recommendations and the God Admin's decision. |
| C23 | Captain account has no team | "No team is linked to your captain account yet. Ask the God Admin to assign one." |
| C24 | Is replaced as captain | God Admin changes their role; their dashboard changes accordingly. |
| C25 | Does everything a fan can | Browsing, voting, following. |

## 5. Host / Organizer

Hosts and organizers share one workspace. **What each person sees depends on the privileges the God Admin gave them.**

| Privilege | Unlocks |
|---|---|
| Match-day control | Running live matches and submitting results |
| Manage fixtures | Proposing kickoff and venue changes |
| Review requests | Advising on captain requests |
| Publish news | Writing, editing and deleting articles |
| Manage highlights | Adding and removing videos |
| Manage venues | Editing venue details |
| Manage team info | Editing club bio, coach and colours |

Default presets: **Host** = match-day control and manage venues. **Organizer** = manage fixtures, publish news, manage highlights and review requests.

**Match day** (needs *Match-day control*; **hosts only see matches at their assigned venues**)

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| H1 | Kicks off a match | Match-day control → pick the match → "Kick off" (available from **1 hour before** the scheduled time; earlier it says "Kick-off opens 1 hour before the scheduled time"). Match goes live. | **Everyone** gets "Kick-off! … is live"; a red live bar appears across the site with the score. |
| H2 | Runs the clock | Sets the minute, jumps to HT (45′) or +5′. | Live minute shows for fans. |
| H3 | Logs a goal (with or without an assist), penalty, own goal, yellow, red or substitution | Picks team, player, minute (and assist or player off). The score updates instantly. | Fans see it live on the match page and the live bar. |
| H4 | Logs an event by mistake | Removes it from the timeline (✕). | — |
| H5 | Enters match stats | Possession, shots, on target, corners, fouls, passes → "Save stats". | Stats tab fills in for fans. |
| H6 | Final whistle | Adds notes → "Submit X–Y for verification". The match shows **FT · Verifying**; **the table and stats don't count it yet**. | God Admin is notified. |
| H7 | Result verified | Match becomes **FT**; table, scorers and leaders update. | Everyone gets "Full time: …". |
| H8 | Result rejected | Match goes back to **live** so the host can correct and resubmit. | Host is notified with the note. |
| H8b | Knockout match ends level | The host must pick the **penalty shoot-out winner** before submitting; the result reads "X win on penalties". | — |
| H8c | Runs a semi-final or the Final | Available once the teams are confirmed (see A5b). | — |
| H9 | Host with no venues assigned | "No upcoming matches at your assigned venues." | — |
| H10 | Opens a match page they control | "Open match control" button jumps straight to that match. | — |

**Planning and content**

| # | Scenario | Needs | What happens |
|---|---|---|---|
| H11 | Proposes a kickoff or venue change | Manage fixtures | Fixtures → "Propose change" → new time and/or venue + reason. Goes to the God Admin; badge "Change pending". Approved → applies everywhere and notifies both teams and hosts. |
| H12 | Proposes a change that's identical to the current fixture, clashes, or is in the past | Manage fixtures | The send button stays disabled and the problem is shown (same messages as C3b). |
| H13 | Advises on a captain request | Review requests | Review requests → "Support" or "Oppose" with a note. The God Admin sees it on the request; they can change their recommendation while it's pending. |
| H14 | Writes, edits or deletes an article | Publish news | Headline, summary, category, body, tagged clubs. Published immediately (not sensitive). Tagged clubs' followers see it first in My Koora. |
| H15 | Adds a highlight | Manage highlights | Title, type, duration, optional match, optional YouTube link. Invalid link → warning, animated recap used instead. |
| H16 | Removes a highlight | Manage highlights | Removed from the hub and landing page. |
| H17 | Edits venue details | Manage venues | Name, address, capacity, surface, transport, parking. Hosts only see their own venues. |
| H18 | Edits club info | Manage team info | Coach, bio, colours (chosen from the site's three-colour palette). Squad changes stay with captains. |
| H19 | Tracks their submissions | — | My submissions: fixture changes and results with status; can withdraw pending fixture changes. |
| H20 | Has no privileges at all | — | Sees only the overview (privileges shown greyed out) and My submissions. |
| H21 | Privileges change | — | Notification from the God Admin; menu sections appear or disappear on the next view. |
| H22 | Is suspended | — | Can't sign in; all actions are blocked. |

## 6. God Admin

**Decisions**

| # | Scenario | What happens | Others affected |
|---|---|---|---|
| A1 | Reviews pending requests | Command centre shows the queue; Approvals lists all pending items with the change (old → new), reason and organizer recommendations. Filter by type. | — |
| A2 | Approves a reschedule or fixture change | Kickoff and/or venue updated everywhere. | Requester, both teams, followers and hosts notified. |
| A3 | Approves adding a player | Player created and added to the squad. | Team notified. |
| A4 | Approves removing a player | Player deregistered; their account (if any) becomes a Fan account. | Requester notified. |
| A5 | Verifies a result | Match final; table and stats update. | Everyone notified. |
| A5b | Verifies the last league result | The **Final Four is confirmed** from the final table (1st v 4th, 2nd v 3rd); after both semi-finals the **Final** is set from the winners. | Qualified teams are told "You're through!"; everyone is notified. |
| A6 | Rejects any request (with a note) | Nothing changes; a rejected result returns to live. | Requester notified with the note. |
| A7 | Acts on a request that's no longer pending (e.g. it was withdrawn in another tab) | "Request is no longer pending." | — |
| A7b | A request can't be applied any more | **Approve is disabled** with the reason: the new time clashes or is in the past, the original kickoff has passed, the match has started or finished, rosters are locked, the squad is full, the shirt number was taken, or the player is no longer in the squad. Reject stays available. | — |
| A7c | A reschedule is now inside the notice window | Shown as a heads-up; the God Admin can still approve. | — |
| A8 | Reviews history | Approvals → History shows every decision, who made it and when. | — |

**People and access**

| # | Scenario | What happens |
|---|---|---|
| A9 | Makes someone a **Host** | Edit access → role Host → privileges (preset) → **assigns venues**. |
| A10 | Makes someone an **Organizer** | Edit access → role Organizer → privileges (preset, adjustable). |
| A11 | Fine-tunes privileges | Ticks any combination of the seven privileges, or resets to the preset. |
| A12 | Assigns a **Captain** or **Player** | Picks a team and links the account to a player profile. Warning if the team already has a captain. |
| A13 | Demotes or changes a role | Role changes immediately; the user is notified. |
| A14 | Invites a new user | Name, email, role (hosts/organizers start with their preset). Duplicate or invalid emails are refused. |
| A15 | Suspends or reinstates a user | Suspended users can't sign in. |
| A16 | Tries to change their own role | Not allowed ("You cannot change your own God Admin role"). |
| A17 | Finds a user | Search by name or email; filter by role. |

**Tournament control**

| # | Scenario | What happens |
|---|---|---|
| A18 | Edits any fixture directly | Fixtures → Edit → kickoff, venue, scheduled/postponed, referee. Clashes and past times are refused. **Results can't be set here** — a match only finishes through match-day control and verification. Started or finished matches only allow a referee change. Applies immediately; both teams and hosts are notified; logged. |
| A19 | Postpones a match | Sets status to Postponed; it shows "PPD" in fixtures and can't be kicked off until it's rescheduled. |
| A19b | Sees matches whose kickoff passed with no result | Command centre shows an "Overdue results" count and a "Kickoff passed, no result yet" list with a "Postpone / move" button. |
| A20 | Locks or unlocks rosters | Captains are notified; squad requests are blocked while locked. |
| A21 | Changes rules | Tournament name, season, maximum squad size, minimum reschedule notice (hours). |
| A22 | Reads the audit log | Every request, decision, role change, setting change, article, highlight and venue edit, with who and when. |
| A23 | Resets the demo season | Restores the original season (asks for confirmation; erases changes in this browser). |
| A24 | Does everything else | Has every privilege, so can also run match day at any venue, publish news, manage highlights, venues and teams. |

## 7. Scenarios across roles

End-to-end flows that involve several people.

1. **Reschedule:** Captain requests a delay → organizer recommends → God Admin approves → both squads, followers and hosts are notified → players' schedules and calendar exports show the new time.
2. **New signing:** Captain requests a player → God Admin approves → the player appears in the squad, stats and search → the team is notified.
3. **Match day:** Host kicks off (everyone sees it live) → logs goals and cards → submits the result → God Admin verifies → table, top scorers, the landing-page circles (Goal and Player of the Week, Top of the Table) and full-time alerts update → fans vote for Player of the Match.
4. **Wrong result:** Host submits → God Admin rejects with a note → the match goes back to live → host corrects and resubmits.
7. **Road to the Final:** last league result verified → Final Four confirmed and teams notified → semi-finals played (a draw needs a shoot-out winner) → Final set from the winners.
5. **Staffing:** God Admin promotes a fan to Host → assigns two venues → the host only sees those matches in match-day control.
6. **Transfer window closes:** God Admin locks rosters → captains are notified → add/remove requests are blocked.

## Scenarios not supported yet

These would come up in a real tournament but the site can't handle them today.

| Area | Scenario | Why it matters |
|---|---|---|
| Accounts | Real sign-in with passwords, password reset, email verification | Sign-in is a demo account picker; data lives in each browser. A backend is needed before real use. |
| Accounts | Changing your own name or email | No profile settings page. |
| Knockouts | Extra time in knockouts | A drawn knockout goes straight to the recorded shoot-out winner. |
| Players | A player requesting a correction to their own details | Has to ask the captain outside the app. |
| Captains | Editing an existing player's details (number, position) | Only add and remove are available. |
| Captains | Requesting a venue change | Captains can only request time changes; organizers can propose venue changes. |
| Captains | Transferring a player to another team | Would need a remove and an add, by two captains. |
| Match day | Starting line-ups and benches | Squads tab shows the whole squad; appearances count everyone registered on the day of the match. |
| Match day | Abandoned matches or forfeits | Only scheduled, postponed, live and finished. |
| Match day | Hosts postponing a match | Only the God Admin can set Postponed. |
| Discipline | Suspensions after red cards or yellow-card accumulation | Cards are recorded but not enforced. |
| Fans | Following several clubs, or push/email notifications | One followed club; alerts appear only in the bell. |
| Content | Uploading video files directly | Highlights accept YouTube links only. |
| Content | Arabic or Turkish language | English only. |
