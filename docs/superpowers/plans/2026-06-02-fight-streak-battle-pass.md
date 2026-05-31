# Fight Streak + Battle Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post-vote drama, login-gated XP/streaks, IP-based pending claim, Fight of the Day, and a 5-tier free Battle Pass per season.

**Architecture:** Pure reward rules live in `lib/rewards/*` (testable). **All grant writes are atomic via Supabase RPC** `grant_reward_for_vote` (single transaction). Postgres stores seasons, progress, badges, grants. `votes.user_side_pct` is set at vote-insert time so IP claim needs no extra results query. Vote/claim APIs call RPC via service role. UI reads `GET /api/rewards/me`.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres + Auth (magic link), existing `votes.ip_hash`, Upstash unchanged for vote rate limit. **Node ≥20** (`engines` in package.json; Vercel Node 20.x+).

**Spec:** [`docs/superpowers/specs/2026-06-02-fight-streak-battle-pass-design.md`](../specs/2026-06-02-fight-streak-battle-pass-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260602120000_rewards.sql` | Tables, `votes.user_side_pct`, RLS, seed Season 1 |
| `supabase/migrations/20260602130000_rewards_rpc.sql` | `grant_reward_for_vote` + `claim_pending_reward_by_ip` RPCs; extend `cast_vote` to store pct + return `vote_id` |
| `lib/rewards/constants.ts` | Tier thresholds, XP amounts, badge keys |
| `lib/rewards/drama.ts` | Post-vote message from side % |
| `lib/rewards/tiers.ts` | `getTierForXp` (pure) |
| `lib/rewards/grant.ts` | Thin wrapper: calls `grant_reward_for_vote` RPC |
| `lib/rewards/claim-pending.ts` | Thin wrapper: calls `claim_pending_reward_by_ip` RPC |
| `scripts/test-rewards.mjs` | Node tests for pure tier/drama logic |
| `app/api/rewards/me/route.ts` | Authenticated progress JSON |
| `app/api/rewards/claim/route.ts` | POST pending IP claim |
| `app/api/vote/route.ts` | Call grant when session user present |
| `app/(site)/auth/callback/route.ts` | Redirect with claim hint |
| `app/(site)/auth/login/page.tsx` | `returnTo` query support |
| `components/post-vote-rewards-banner.tsx` | Drama + login CTA + pass snippet |
| `components/rewards-progress-bar.tsx` | Tier bar UI |
| `components/header-rewards-pill.tsx` | Streak + tier in header |
| `app/(site)/rewards/page.tsx` | Full pass + badges page |
| `app/(site)/page.tsx` | Fight of the Day block (v1.1) |
| `components/battle-vote-controls.tsx` | Wire banner, pass fetch after vote |

---

## Phase v1 — Core rewards loop

### Task 0: Node engine pin

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add engines** (local dev is v22; Vercel logs show nodejs24.x — both satisfy ≥20)

```json
"engines": {
  "node": ">=20.0.0"
}
```

- [ ] **Step 2: Confirm Vercel** — Project Settings → General → Node.js Version → **20.x** or higher (match production).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Require Node 20+ for native node:test in reward scripts."
```

---

### Task 1: Database migration (schema)

**Files:**
- Create: `supabase/migrations/20260602120000_rewards.sql`

- [ ] **Step 1: Add migration SQL**

```sql
-- seasons
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

-- user_progress
create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_rewarded_vote_date date,
  underdog_count integer not null default 0 check (underdog_count >= 0),
  season_vote_count integer not null default 0 check (season_vote_count >= 0),
  primary key (user_id, season_id)
);

create table public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_key)
);

create table public.reward_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vote_id uuid not null references public.votes(id) on delete cascade,
  xp_awarded integer not null check (xp_awarded > 0),
  created_at timestamptz not null default now(),
  unique (vote_id)
);

create table public.featured_battles (
  battle_id uuid not null references public.battles(id) on delete cascade,
  featured_date date not null,
  primary key (featured_date)
);

create index reward_grants_user_id_idx on public.reward_grants (user_id);
create index votes_ip_hash_created_at_idx on public.votes (ip_hash, created_at desc);

-- Snapshot side % at vote time (for drama + claim without extra queries)
alter table public.votes
  add column if not exists user_side_pct integer
  check (user_side_pct is null or (user_side_pct >= 0 and user_side_pct <= 100));

alter table public.seasons enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_badges enable row level security;
alter table public.reward_grants enable row level security;
alter table public.featured_battles enable row level security;

create policy "seasons_public_read" on public.seasons for select to anon, authenticated using (true);
create policy "featured_public_read" on public.featured_battles for select to anon, authenticated using (true);
create policy "user_progress_own" on public.user_progress for select to authenticated using (auth.uid() = user_id);
create policy "user_badges_own" on public.user_badges for select to authenticated using (auth.uid() = user_id);
create policy "reward_grants_own" on public.reward_grants for select to authenticated using (auth.uid() = user_id);

insert into public.seasons (name, starts_at, ends_at)
values (
  'Season 1 — June Fights',
  '2026-06-01T00:00:00Z',
  '2026-06-29T23:59:59Z'
);
```

- [ ] **Step 2: Apply on Supabase** (SQL editor or MCP `apply_migration`)

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --project-id srimmoqxrbwxlyyfgdhs > lib/database.types.ts`  
(or update `lib/database.types.ts` manually for new tables)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602120000_rewards.sql lib/database.types.ts
git commit -m "Add rewards schema for battle pass and streaks."
```

---

### Task 1b: RPC migration (atomic grants + cast_vote extension)

**Files:**
- Create: `supabase/migrations/20260602130000_rewards_rpc.sql`

**Critical:** `grant_reward_for_vote` MUST run entirely inside one Postgres transaction — insert `reward_grants`, upsert `user_progress`, insert badges. No multi-call client orchestration.

- [ ] **Step 1: Extend `cast_vote`** — add `p_user_side_pct integer default null`; on insert set `user_side_pct`; return `{ success, vote_id }` on success (lookup `id` from inserted row via `returning id into v_vote_id`).

- [ ] **Step 2: `grant_reward_for_vote(p_user_id, p_vote_id, p_is_featured boolean)`**

Logic inside single function:
1. Load vote row; verify `user_side_pct` not null
2. `insert into reward_grants ... on conflict (vote_id) do nothing returning id into v_grant_id`
3. If `v_grant_id is null` → `return { already_granted: true }`
4. Compute XP (base 10, +25 fotd, +15 streak day 2+, +5 if underdog) with once-per-battle-per-day guard via existing grants today
5. Update `reward_grants.xp_awarded`
6. Upsert `user_progress` (streak from UTC `last_rewarded_vote_date`)
7. Insert badges (`on conflict do nothing`)
8. Return `{ xp_awarded, tier, badges_earned, already_granted: false }`

```sql
create or replace function public.grant_reward_for_vote(
  p_user_id uuid,
  p_vote_id uuid,
  p_is_featured boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vote public.votes%rowtype;
  v_season_id uuid;
  v_xp integer := 0;
  v_grant_id uuid;
  -- streak, progress vars...
begin
  select * into v_vote from public.votes where id = p_vote_id;
  if not found or v_vote.user_side_pct is null then
    return jsonb_build_object('success', false, 'error', 'invalid_vote');
  end if;

  insert into public.reward_grants (user_id, vote_id, xp_awarded)
  values (p_user_id, p_vote_id, 0)
  on conflict (vote_id) do nothing
  returning id into v_grant_id;

  if v_grant_id is null then
    return jsonb_build_object('success', true, 'already_granted', true);
  end if;

  -- XP + progress + badges (same transaction)
  -- update reward_grants set xp_awarded = v_xp where vote_id = p_vote_id;

  return jsonb_build_object(
    'success', true,
    'already_granted', false,
    'xp_awarded', v_xp
  );
end;
$$;

revoke all on function public.grant_reward_for_vote(uuid, uuid, boolean) from public;
grant execute on function public.grant_reward_for_vote(uuid, uuid, boolean) to service_role;
```

(Flesh out full XP/streak SQL in implementation — structure above is the contract.)

- [ ] **Step 3: `claim_pending_reward_by_ip(p_user_id, p_ip_hash text)`**

```sql
-- Find latest vote in 10 min, no reward_grants row, user_side_pct already on vote
select v.id into v_vote_id
from public.votes v
left join public.reward_grants rg on rg.vote_id = v.id
where v.ip_hash = p_ip_hash
  and v.created_at > now() - interval '10 minutes'
  and rg.id is null
order by v.created_at desc
limit 1;

-- if found: return grant_reward_for_vote(p_user_id, v_vote_id, is_featured(v.battle_id))
-- else: return { granted: false }
```

- [ ] **Step 4: Apply migration** (Supabase MCP `apply_migration`)

- [ ] **Step 5: Update `lib/supabase/rpc.ts`** wrappers for new RPCs + extended `cast_vote`

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260602130000_rewards_rpc.sql lib/supabase/rpc.ts
git commit -m "Add atomic reward grant RPC and extend cast_vote with user_side_pct."
```

---

### Task 2: Pure reward logic + tests

**Files:**
- Create: `lib/rewards/constants.ts`
- Create: `lib/rewards/drama.ts`
- Create: `lib/rewards/tiers.ts`
- Create: `scripts/test-rewards.mjs`

- [ ] **Step 1: constants.ts**

```typescript
export const XP_VOTE = 10;
export const XP_FOTD = 25;
export const XP_STREAK_BONUS = 15;
export const XP_UNDERDOG = 5;
export const UNDERDOG_PCT_THRESHOLD = 40;
export const CLOSE_PCT_MIN = 45;
export const CLOSE_PCT_MAX = 55;

export const PASS_TIERS = [
  { tier: 1, xp: 50, reward: "title:rookie" },
  { tier: 2, xp: 200, reward: "badge:bronze" },
  { tier: 3, xp: 450, reward: "share_card:style2" },
  { tier: 4, xp: 800, reward: "title:debater" },
  { tier: 5, xp: 1500, reward: "title:fight_legend+badge:legend" },
] as const;
```

- [ ] **Step 2: drama.ts**

```typescript
import { CLOSE_PCT_MAX, CLOSE_PCT_MIN, UNDERDOG_PCT_THRESHOLD } from "./constants";

export type DramaKind = "underdog" | "close" | "winning";

export function getPostVoteDrama(userSidePct: number): { kind: DramaKind; message: string } {
  if (userSidePct < UNDERDOG_PCT_THRESHOLD) {
    return {
      kind: "underdog",
      message: `UNDERDOG — only ${userSidePct}% picked your side. Fight back.`,
    };
  }
  if (userSidePct >= CLOSE_PCT_MIN && userSidePct <= CLOSE_PCT_MAX) {
    return { kind: "close", message: "TOO CLOSE — every vote counts." };
  }
  return { kind: "winning", message: "YOUR SIDE IS WINNING — defend it." };
}
```

- [ ] **Step 3: tiers.ts**

```typescript
import { PASS_TIERS } from "./constants";

export function getTierForXp(xp: number) {
  let current = PASS_TIERS[0];
  for (const row of PASS_TIERS) {
    if (xp >= row.xp) current = row;
  }
  const next = PASS_TIERS.find((row) => row.xp > xp) ?? null;
  return { current, next, xp };
}
```

- [ ] **Step 4: test-rewards.mjs** — use `node --test` (requires Node ≥20; local v22 OK)

Test cases: pct 23 → underdog; 50 → close; 70 → winning; xp 0 → tier 0/1 edge; xp 1500 → tier 5.

- [ ] **Step 5: Run tests**

Run: `node --test scripts/test-rewards.mjs`  
Expected: all pass (fails on Node 18 — use engines pin from Task 0)

- [ ] **Step 6: Commit**

```bash
git add lib/rewards scripts/test-rewards.mjs
git commit -m "Add pure reward tier and drama helpers with tests."
```

---

### Task 3: Server grant + claim wrappers (RPC only)

**Files:**
- Create: `lib/rewards/grant.ts`
- Create: `lib/rewards/claim-pending.ts`
- Create: `lib/rewards/season.ts`

**No multi-step DB writes in TypeScript.** Wrappers call Supabase RPC only.

- [ ] **Step 1: `getActiveSeason()`** — select season where `now()` between starts/ends.

- [ ] **Step 2: `grantRewardForVote(supabase, { userId, voteId, isFeaturedBattle })`**
  - Calls `grant_reward_for_vote` RPC via service role
  - Maps JSON to `{ xpAwarded, tier, badgesEarned, alreadyGranted }`
  - Uses `lib/rewards/tiers.ts` for tier display if RPC returns xp only

- [ ] **Step 3: `claimPendingRewardByIp(supabase, { userId, ipHash })`**
  - Calls `claim_pending_reward_by_ip` RPC
  - RPC reads `votes.user_side_pct` directly — **no battle results query**

- [ ] **Step 4: Commit**

```bash
git add lib/rewards/grant.ts lib/rewards/claim-pending.ts lib/rewards/season.ts
git commit -m "Add server-side reward grant and IP pending claim."
```

---

### Task 4: API routes

**Files:**
- Create: `app/api/rewards/me/route.ts`
- Create: `app/api/rewards/claim/route.ts`
- Modify: `app/api/vote/route.ts`

- [ ] **Step 1: GET `/api/rewards/me`**
  - Session via `createServerClient` + `getUser()`
  - 401 if anonymous
  - Return `{ xp, tier, nextTierXp, streak, badges, season }`

- [ ] **Step 2: POST `/api/rewards/claim`**
  - Auth required
  - `hashVoteIp` from request IP
  - `claimPendingRewardByIp`
  - 200 `{ granted: true, ... }` or `{ granted: false }`

- [ ] **Step 3: Modify vote route**
  - Before `castVoteRpc`: compute `userSidePct` from current results + chosen option
  - Pass `p_user_side_pct` to extended `cast_vote`
  - On success: read `vote_id` from RPC response; if authenticated user → `grantRewardForVote`
  - Response includes optional `rewards: { xpAwarded, tier }`

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run build`

- [ ] **Step 5: Commit**

```bash
git add app/api/rewards app/api/vote/route.ts
git commit -m "Add rewards API and grant on authenticated votes."
```

---

### Task 5: Auth flow + login CTA

**Files:**
- Modify: `app/(site)/auth/login/page.tsx`
- Modify: `app/(site)/auth/callback/route.ts`
- Modify: `app/(site)/auth/actions.ts` or magic-link API if needed

- [ ] **Step 1:** Login page reads `returnTo` search param; pass to magic link as `next`.

- [ ] **Step 2:** After callback success, if `returnTo` set, redirect there (existing `next` param).

- [ ] **Step 3:** On battle page when logged in, client calls `POST /api/rewards/claim` once per session **debounce** — set `sessionStorage` flag **only after successful response**:

```typescript
const res = await fetch("/api/rewards/claim", { method: "POST" });
if (res.ok) {
  const data = await res.json();
  if (data.granted) {
    sessionStorage.setItem("rewards-claim-done", "1");
  }
}
// Do NOT set flag before fetch — network failure must allow retry
```

Skip call if `sessionStorage.getItem("rewards-claim-done")` is set.

- [ ] **Step 4: Commit**

```bash
git add app/(site)/auth
git commit -m "Support returnTo login flow and post-auth reward claim."
```

---

### Task 6: Post-vote UI + header pill

**Files:**
- Create: `components/post-vote-rewards-banner.tsx`
- Create: `components/rewards-progress-bar.tsx`
- Create: `components/header-rewards-pill.tsx`
- Modify: `components/battle-vote-controls.tsx`
- Modify: `components/header-auth.tsx` or `site-header.tsx`

- [ ] **Step 1: `post-vote-rewards-banner.tsx`**
  - Props: `drama`, `isLoggedIn`, `returnTo`, optional `grantResult`
  - Logged out: link `Log in to claim XP for this vote` → `/auth/login?returnTo=...`

- [ ] **Step 2: Wire into `battle-vote-controls`** after vote using `getPostVoteDrama(pct)`; fetch `/api/rewards/me` if logged in after vote.

- [ ] **Step 3: Header pill** — client fetch `/api/rewards/me` when user from `/api/me` exists; show `🔥 {streak}` and `Tier {n}`.

- [ ] **Step 4: Commit**

```bash
git add components app/(site)/rewards
git commit -m "Add post-vote drama banner and header rewards pill."
```

---

### Task 7: Rewards page

**Files:**
- Create: `app/(site)/rewards/page.tsx`
- Modify: `components/site-footer.tsx` (link Rewards)

- [ ] **Step 1:** Server or client page showing `RewardsProgressBar`, badge grid, season countdown.

- [ ] **Step 2:** Redirect to login if not authenticated.

- [ ] **Step 3: Commit**

```bash
git add app/(site)/rewards components/site-footer.tsx
git commit -m "Add rewards page with battle pass progress."
```

---

## Phase v1.1 — Fight of the Day + featured battle

### Task 8: FotD on home

**Files:**
- Create: `lib/rewards/featured-battle.ts`
- Modify: `app/(site)/page.tsx`
- Create: `components/fight-of-the-day-hero.tsx`

- [ ] **Step 1:** `getFeaturedBattleForDate(supabase, date)` — query `featured_battles` else fallback highest votes 24h from stats/feed.

- [ ] **Step 2:** Home hero section above "Latest fights" with link to `/b/[slug]`.

- [ ] **Step 3:** Pass `isFeaturedBattle` into grant when vote battle id matches.

- [ ] **Step 4: Commit**

```bash
git add lib/rewards/featured-battle.ts components/fight-of-the-day-hero.tsx app/(site)/page.tsx
git commit -m "Add Fight of the Day featured battle on home."
```

---

## Phase v1.2 — Share card style 2 (Tier 3+)

### Task 9: Tier-gated share card

**Files:**
- Modify: `lib/share-links.ts` or new `components/share-result-card.tsx`
- Modify: `components/battle-vote-controls.tsx`

- [ ] **Step 1:** If user tier ≥ 3 (`share_card:style2` unlocked), show alternate share text/layout or generate OG-style client card (canvas/html-to-image optional — v1 can be styled banner + copy).

- [ ] **Step 2: Commit**

```bash
git add components lib/share-links.ts
git commit -m "Unlock share card style 2 at battle pass tier 3."
```

---

## Manual verification checklist

- [ ] Vote logged out → drama + login link; `/api/rewards/me` → 401
- [ ] Vote → login within 10 min same IP → XP once; repeat claim → no double
- [ ] Logged-in vote → immediate XP in response
- [ ] Streak increments on consecutive UTC days
- [ ] FotD vote → +25 included once per day
- [ ] 50 XP → Rookie title on `/rewards`
- [ ] Embed vote → no rewards path

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Atomic grant transaction | Task 1b RPC |
| `votes.user_side_pct` at insert | Task 1b `cast_vote` |
| Post-vote drama | Task 2, 6 |
| Login CTA | Task 6 |
| IP pending claim 10 min | Task 1b, 3, 4, 5 |
| Node ≥20 for tests | Task 0 |
| 5 tiers | Task 2 |
| Streak + badges | Task 1b RPC |
| FotD | Task 8 |
| Share card tier 3 | Task 9 |
| Anonymous vote OK | Task 4 |
| sessionStorage after success only | Task 5 |

---

## Execution

**Mode:** Subagent-driven — one task per subagent, review between tasks.

Start with **Task 0**, then **Task 1 → 1b → 2 → …**
