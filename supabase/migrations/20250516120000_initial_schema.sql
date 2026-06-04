-- CRASH Cifras — schema inicial
-- Execute no Supabase: SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Perfis (espelha auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cifras
-- ---------------------------------------------------------------------------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  artist text,
  content text not null default '',
  original_key text,
  current_key text,
  capo smallint not null default 0 check (capo >= 0 and capo <= 11),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_user_id_idx on public.songs (user_id);
create index if not exists songs_title_idx on public.songs using gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(artist, '')));

-- ---------------------------------------------------------------------------
-- Repertórios (setlists)
-- ---------------------------------------------------------------------------
create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setlists_user_id_idx on public.setlists (user_id);

-- ---------------------------------------------------------------------------
-- Cifras dentro de um repertório
-- ---------------------------------------------------------------------------
create table if not exists public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (setlist_id, song_id)
);

create index if not exists setlist_songs_setlist_id_idx on public.setlist_songs (setlist_id, position);

-- ---------------------------------------------------------------------------
-- Favoritos
-- ---------------------------------------------------------------------------
create table if not exists public.song_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists songs_updated_at on public.songs;
create trigger songs_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists setlists_updated_at on public.setlists;
create trigger setlists_updated_at
  before update on public.setlists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil ao cadastrar usuário
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;
alter table public.song_favorites enable row level security;

-- profiles
drop policy if exists "Perfis: leitura pública" on public.profiles;
create policy "Perfis: leitura pública"
  on public.profiles for select
  using (true);

drop policy if exists "Perfis: usuário edita o próprio" on public.profiles;
create policy "Perfis: usuário edita o próprio"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- songs
drop policy if exists "Cifras: dono gerencia" on public.songs;
create policy "Cifras: dono gerencia"
  on public.songs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Cifras: leitura pública" on public.songs;
create policy "Cifras: leitura pública"
  on public.songs for select
  using (is_public = true or auth.uid() = user_id);

-- setlists
drop policy if exists "Repertórios: dono gerencia" on public.setlists;
create policy "Repertórios: dono gerencia"
  on public.setlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- setlist_songs (via setlist ownership)
drop policy if exists "Itens de repertório: dono gerencia" on public.setlist_songs;
create policy "Itens de repertório: dono gerencia"
  on public.setlist_songs for all
  using (
    exists (
      select 1 from public.setlists s
      where s.id = setlist_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.setlists s
      where s.id = setlist_id and s.user_id = auth.uid()
    )
  );

-- song_favorites
drop policy if exists "Favoritos: usuário gerencia os próprios" on public.song_favorites;
create policy "Favoritos: usuário gerencia os próprios"
  on public.song_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Dados de exemplo (opcional — remova em produção)
-- ---------------------------------------------------------------------------
-- Após criar um usuário no app, substitua USER_ID e descomente:
--
-- insert into public.songs (user_id, title, artist, content, original_key, current_key)
-- values (
--   'USER_ID',
--   'Wonderwall',
--   'Oasis',
--   E'[Intro]\nEm7  G  D  A7sus4\n\n[Verso]\nEm7            C\nToday is gonna be the day',
--   'Em',
--   'Em'
-- );
