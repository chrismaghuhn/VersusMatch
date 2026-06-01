-- Reliable Realtime filters on party_players.room_id
alter table public.party_players replica identity full;
