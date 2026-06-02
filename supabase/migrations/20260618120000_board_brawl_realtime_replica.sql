-- Reliable Realtime filters on bb_players.room_id (same pattern as party_players)
alter table public.bb_players replica identity full;
