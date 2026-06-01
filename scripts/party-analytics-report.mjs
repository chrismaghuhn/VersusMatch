/**
 * Party analytics funnel report (service role).
 * Usage: npm run party:analytics [-- 30]
 * Default window: 7 days
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  return Object.fromEntries(
    readFileSync(resolve(root, ".env.local"), "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

const daysArg = process.argv[2];
const days = daysArg && /^\d+$/.test(daysArg) ? Number(daysArg) : 7;
const since = new Date();
since.setUTCDate(since.getUTCDate() - days);
const sinceIso = since.toISOString();

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`\nMemeFight Party analytics — last ${days} days (since ${sinceIso.slice(0, 10)})\n`);

const { data: funnel, error: funnelError } = await supabase
  .from("party_funnel_daily")
  .select("*")
  .gte("day", sinceIso.slice(0, 10))
  .order("day", { ascending: false });

if (funnelError) {
  console.error("party_funnel_daily:", funnelError.message);
  console.error("Run migration 20260604120000_party_analytics_events.sql on Supabase first.");
  process.exit(1);
}

const totals = (funnel ?? []).reduce(
  (acc, row) => ({
    rooms_created: acc.rooms_created + (row.rooms_created ?? 0),
    games_started: acc.games_started + (row.games_started ?? 0),
    games_finished: acc.games_finished + (row.games_finished ?? 0),
    rooms_abandoned: acc.rooms_abandoned + (row.rooms_abandoned ?? 0),
    player_joins: acc.player_joins + (row.player_joins ?? 0),
  }),
  {
    rooms_created: 0,
    games_started: 0,
    games_finished: 0,
    rooms_abandoned: 0,
    player_joins: 0,
  }
);

console.log("── Totals ──");
console.table(totals);

if (totals.games_started > 0) {
  const completionRate = ((totals.games_finished / totals.games_started) * 100).toFixed(1);
  console.log(`Completion rate (finished / started): ${completionRate}%\n`);
}

console.log("── Daily funnel ──");
console.table(funnel ?? []);

const { data: dropoff, error: dropoffError } = await supabase
  .from("party_dropoff_by_phase")
  .select("*");

if (dropoffError) {
  console.error("party_dropoff_by_phase:", dropoffError.message);
} else {
  console.log("── Drop-off by last phase (all time) ──");
  console.table(dropoff ?? []);
}

const { data: rounds, error: roundsError } = await supabase
  .from("party_rounds_completion")
  .select("*");

if (roundsError) {
  console.error("party_rounds_completion:", roundsError.message);
} else {
  console.log("── Avg round at finish vs abandon ──");
  console.table(rounds ?? []);
}

console.log("Done.\n");
