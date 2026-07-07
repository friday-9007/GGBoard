# Player Dashboard — Pending Work

> **As of:** 2026-07-06 · **Branch:** `beta`
> Status of the player dashboard ([frontend/src/pages/PlayerHub.jsx](frontend/src/pages/PlayerHub.jsx)).
> The core is complete and backend-verified; the items below are **deferred scope, cleanup, and polish** — nothing here is broken.

---

## ✅ Done & working (for reference)

- **Overview** — greeting, stats (My Teams / Events Registered / Games), and a public **events feed** (ongoing + upcoming) from all organisers.
- **Per-game registration** — each event registers *your team for that game*; leader-only; fires the IGN/UID gate if the game profile is incomplete.
- **My Teams** — game-switcher chips (one team per game), create/join, rename, disband, join code, roster management (edit/remove/leave).
- **Standings** — every team's registered events with rank / points / per-round.
- **Profile** — display name, mobile, email, per-game IGN/UID (game-specific formats: Riot ID, Activision ID, BattleTag, UID, Platform…), date of birth/age, country/city, gender, language, "looking for a team" toggle, preferred role, bio.

Model: a user can be on **one team per game** but **many games at once** (membership via `teams.leader_id` + `players.user_id`; no single `users.team_id`).

---

## ⏸️ Parked features (explicitly deferred)

- [ ] **Profile photo / avatar** — needs Supabase **Storage** (bucket + upload + signed URLs). Deferred by choice.
- [ ] **Comms & socials on profile** — **Discord** (highest value), plus optional WhatsApp/Telegram and Instagram/YouTube/Twitch. User was undecided; skipped.
- [ ] **Role-selection questions** — after picking Organiser/Player on `/auth/role`, pop up onboarding questions. **Held** because the actual questions weren't decided yet. (This was the original first request.)
- [ ] **Image / video upload (gameplay verification)** — the `submissions` table already exists in the DB (`{ game_id, team_id, user_id, kind, purpose, storage_path, status, reviewed_by, note }`), but there is **no UI or endpoints** yet. Biggest remaining feature; needs Supabase Storage.
- [ ] **Pre-fill the Join-team form** (IGN/UID) from the player's saved game profile.

---

## 🧹 Loose ends / cleanup

- [ ] **Commit the work** — the multi-team change + full UI/UX overhaul are currently uncommitted on `beta`.
- [ ] **Delete dead pages** — `CreateTeam.jsx`, `JoinTeam.jsx`, `LeaderLogin.jsx` are orphaned (their routes now redirect / create+join live inside the dashboard). Remove the files and the unused imports/routes in [App.jsx](frontend/src/App.jsx).
- [ ] **Team discovery / LFT marketplace** — the "Looking for a team" toggle exists in Profile, but there's no page to **browse open teams / free agents**. Joining still requires a code.

---

## ✨ Nice-to-have (future)

- [ ] **Notifications** (e.g. "registration opened", "scores posted", "you were added to a team").
- [ ] **Per-event match schedule / details** — events currently show only rounds + team count.
- [ ] **Admin sidebar polish** — give the organiser dashboard the same active-item accent the player sidebar got.
- [ ] **Verify scaling** — `myEvents` computes rank with a scoreboard query per registration (N+1); fine at small scale, revisit if events grow large.

---

## Quick wins vs. meaty work

| Effort | Item |
|---|---|
| 🟢 Quick | Discord field in profile · delete dead pages · pre-fill join form · admin sidebar polish |
| 🟡 Medium | Role-selection questions · team discovery / LFT page |
| 🔴 Large | Image/video upload (Supabase Storage) · profile avatar (Storage) · notifications |
