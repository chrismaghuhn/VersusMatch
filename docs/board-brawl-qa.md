# Board Brawl — QA Checklist

Run after changes to board brawl or before release.

## Automated

- [ ] `npm run test:board-brawl`
- [ ] `npm run test:board-brawl-e2e` (Supabase configured, `BOARD_BRAWL_ENABLED=true`)
- [ ] `npm run typecheck`
- [ ] `npm run build` (optional smoke)

## Two-browser lobby

- [ ] Tab A: create room, copy join link / code
- [ ] Tab B: open join link → lands on lobby with code → auto-joins into room
- [ ] Both ready; host starts; board + sidebar visible

## Invite after login

- [ ] Logged-out user opens `/board-brawl/join/XXXXXX`
- [ ] After login, returns to lobby with `?join=` and joins room

## Disconnect / auto-pass

- [ ] Active player stops heartbeats (close tab or block network) for 60s+
- [ ] Other clients see **DC** on roster; turn advances with roll 1 (no hang)

## Host disconnect during minigame

- [ ] Host starts minigame, then goes offline 60s+
- [ ] Another player becomes host (`is_host`); minigame tick continues
- [ ] Results screen (`minigame_results`) ~5s, then next board round

## Items

- [ ] Land on item tile; use boost (golden dice / coin magnet) before roll
- [ ] Use sabotage item → pick target in roster → effect applies
- [ ] Tripwire: target rolls 1 on next turn

## Shop / finish

- [ ] Shop tile: buy star / skip
- [ ] Match finishes; host sees **Rematch**; leave returns to lobby

## Realtime fallback

- [ ] With realtime blocked (devtools offline / channel error), state still updates within ~3s

## Visual (optional)

- [ ] Dice overlay flashes on new `lastRoll`
- [ ] `NEXT_PUBLIC_BOARD_BRAWL_LOW_QUALITY=true` reduces GPU load
