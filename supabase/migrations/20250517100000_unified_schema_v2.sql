-- CRASH Cifras — Schema unificado v2 (PRD + adendos)
-- Substitui modelo legado (songs, setlists). Execute no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Remover modelo legado (MVP anterior)
-- ---------------------------------------------------------------------------
drop table if exists public.song_favorites cascade;
drop table if exists public.setlist_songs cascade;
drop table if exists public.setlists cascade;
drop table if exists public.songs cascade;

-- ---------------------------------------------------------------------------
-- Perfis + preferências do usuário
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  versao_biblica varchar(10) not null default 'NVI',
  nivel_teclado varchar(20) not null default 'basico',
  teclado_modelo text,
  graus_visiveis boolean not null default true,
  versiculos_visiveis boolean not null default true,
  metronomo_visivel boolean not null default true,
  fonte_tamanho varchar(5) not null default 'M',
  plano varchar(20) not null default 'gratuito',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ministros
-- ---------------------------------------------------------------------------
create table if not exists public.ministros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome varchar(100) not null check (char_length(trim(nome)) > 0),
  foto_url text,
  tom_padrao varchar(10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ministros_user_id_idx on public.ministros (user_id);

-- ---------------------------------------------------------------------------
-- Músicas
-- ---------------------------------------------------------------------------
create table if not exists public.musicas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ministro_id uuid references public.ministros (id) on delete set null,
  titulo varchar(200) not null check (char_length(trim(titulo)) > 0),
  artista varchar(200),
  youtube_url text,
  bpm integer check (bpm is null or (bpm > 0 and bpm < 400)),
  tom_original varchar(10),
  semitone_offset smallint not null default 0,
  capo smallint not null default 0 check (capo >= 0 and capo <= 11),
  import_status varchar(20) not null default 'manual'
    check (import_status in ('manual', 'pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists musicas_user_id_idx on public.musicas (user_id);
create index if not exists musicas_ministro_id_idx on public.musicas (ministro_id);

-- Tom por ministro (mesma música, tons diferentes)
create table if not exists public.musica_ministro (
  musica_id uuid not null references public.musicas (id) on delete cascade,
  ministro_id uuid not null references public.ministros (id) on delete cascade,
  tom_atual varchar(10),
  semitone_offset smallint not null default 0,
  primary key (musica_id, ministro_id)
);

-- Favoritas
create table if not exists public.musica_favoritas (
  user_id uuid not null references auth.users (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, musica_id)
);

-- Anotações por música
create table if not exists public.musica_anotacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete cascade,
  conteudo text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, musica_id)
);

-- ---------------------------------------------------------------------------
-- Seções (linhas segmentadas — sem graus no JSON)
-- ---------------------------------------------------------------------------
create table if not exists public.secoes_musica (
  id uuid primary key default gen_random_uuid(),
  musica_id uuid not null references public.musicas (id) on delete cascade,
  slug varchar(30) not null,
  nome varchar(50) not null,
  ordem_original integer not null,
  linhas jsonb not null default '{"lines":[]}'::jsonb,
  inicio_segundos numeric,
  fim_segundos numeric,
  created_at timestamptz not null default now(),
  unique (musica_id, slug, ordem_original)
);

create index if not exists secoes_musica_musica_id_idx on public.secoes_musica (musica_id, ordem_original);

-- ---------------------------------------------------------------------------
-- Playlists do culto
-- ---------------------------------------------------------------------------
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome varchar(100) not null check (char_length(trim(nome)) > 0),
  data_culto date,
  status varchar(20) not null default 'rascunho'
    check (status in ('rascunho', 'preparado', 'realizado')),
  preparado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlists_user_id_idx on public.playlists (user_id);

create table if not exists public.playlist_itens (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete cascade,
  ordem integer not null,
  instrucao_texto text default 'Normal — início ao fim',
  ordem_secoes jsonb,
  tipo varchar(20) not null default 'normal'
    check (tipo in ('normal', 'arranjo', 'medley')),
  medley_proxima_id uuid references public.playlist_itens (id) on delete set null,
  unique (playlist_id, ordem),
  unique (playlist_id, musica_id)
);

create index if not exists playlist_itens_playlist_id_idx on public.playlist_itens (playlist_id, ordem);

-- ---------------------------------------------------------------------------
-- Versículos (por playlist + música)
-- ---------------------------------------------------------------------------
create table if not exists public.versiculos_playlist (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete cascade,
  versao_biblica varchar(10) not null default 'NVI',
  tema_identificado text,
  versiculos jsonb not null default '[]'::jsonb,
  editado_pelo_usuario boolean not null default false,
  gerado_em timestamptz not null default now(),
  unique (playlist_id, musica_id)
);

-- ---------------------------------------------------------------------------
-- Guia de timbre
-- ---------------------------------------------------------------------------
create table if not exists public.timbres_musica (
  id uuid primary key default gen_random_uuid(),
  musica_id uuid not null references public.musicas (id) on delete cascade,
  analise_bruta jsonb,
  guia jsonb,
  gerado_em timestamptz not null default now(),
  unique (musica_id)
);

-- ---------------------------------------------------------------------------
-- Jobs de importação (YouTube → worker Railway)
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  musica_id uuid references public.musicas (id) on delete set null,
  youtube_url text not null,
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  etapa varchar(50),
  progresso smallint not null default 0 check (progresso >= 0 and progresso <= 100),
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_user_id_idx on public.import_jobs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Histórico de cultos
-- ---------------------------------------------------------------------------
create table if not exists public.cultos_historico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  playlist_id uuid references public.playlists (id) on delete set null,
  ministro_id uuid references public.ministros (id) on delete set null,
  snapshot jsonb not null,
  realizado_em timestamptz not null default now()
);

create index if not exists cultos_historico_user_id_idx on public.cultos_historico (user_id, realizado_em desc);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
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

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

drop trigger if exists ministros_updated_at on public.ministros;
create trigger ministros_updated_at
  before update on public.ministros
  for each row execute function public.set_updated_at();

drop trigger if exists musicas_updated_at on public.musicas;
create trigger musicas_updated_at
  before update on public.musicas
  for each row execute function public.set_updated_at();

drop trigger if exists playlists_updated_at on public.playlists;
create trigger playlists_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

drop trigger if exists import_jobs_updated_at on public.import_jobs;
create trigger import_jobs_updated_at
  before update on public.import_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Perfil + settings ao cadastrar
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

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

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
alter table public.user_settings enable row level security;
alter table public.ministros enable row level security;
alter table public.musicas enable row level security;
alter table public.musica_ministro enable row level security;
alter table public.musica_favoritas enable row level security;
alter table public.musica_anotacoes enable row level security;
alter table public.secoes_musica enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_itens enable row level security;
alter table public.versiculos_playlist enable row level security;
alter table public.timbres_musica enable row level security;
alter table public.import_jobs enable row level security;
alter table public.cultos_historico enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- user_settings
drop policy if exists "user_settings_all_own" on public.user_settings;
create policy "user_settings_all_own"
  on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ministros
drop policy if exists "ministros_all_own" on public.ministros;
create policy "ministros_all_own"
  on public.ministros for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- musicas
drop policy if exists "musicas_all_own" on public.musicas;
create policy "musicas_all_own"
  on public.musicas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- musica_ministro (via ownership of musica + ministro)
drop policy if exists "musica_ministro_all_own" on public.musica_ministro;
create policy "musica_ministro_all_own"
  on public.musica_ministro for all
  using (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
    and exists (select 1 from public.ministros mi where mi.id = ministro_id and mi.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
    and exists (select 1 from public.ministros mi where mi.id = ministro_id and mi.user_id = auth.uid())
  );

-- favoritas, anotacoes
drop policy if exists "musica_favoritas_all_own" on public.musica_favoritas;
create policy "musica_favoritas_all_own"
  on public.musica_favoritas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "musica_anotacoes_all_own" on public.musica_anotacoes;
create policy "musica_anotacoes_all_own"
  on public.musica_anotacoes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- secoes (via musica)
drop policy if exists "secoes_musica_all_own" on public.secoes_musica;
create policy "secoes_musica_all_own"
  on public.secoes_musica for all
  using (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
  );

-- playlists
drop policy if exists "playlists_all_own" on public.playlists;
create policy "playlists_all_own"
  on public.playlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- playlist_itens
drop policy if exists "playlist_itens_all_own" on public.playlist_itens;
create policy "playlist_itens_all_own"
  on public.playlist_itens for all
  using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- versiculos_playlist
drop policy if exists "versiculos_playlist_all_own" on public.versiculos_playlist;
create policy "versiculos_playlist_all_own"
  on public.versiculos_playlist for all
  using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  );

-- timbres
drop policy if exists "timbres_musica_all_own" on public.timbres_musica;
create policy "timbres_musica_all_own"
  on public.timbres_musica for all
  using (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.musicas m where m.id = musica_id and m.user_id = auth.uid())
  );

-- import_jobs
drop policy if exists "import_jobs_all_own" on public.import_jobs;
create policy "import_jobs_all_own"
  on public.import_jobs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cultos_historico
drop policy if exists "cultos_historico_all_own" on public.cultos_historico;
create policy "cultos_historico_all_own"
  on public.cultos_historico for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
