-- Rollback: busca de música por YouTube na playlist (nunca usou playlist_musicas no app)
drop table if exists public.playlist_musicas cascade;

drop index if exists public.musicas_user_youtube_url_idx;
